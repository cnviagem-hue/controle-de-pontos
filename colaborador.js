// ==========================================
// CONFIGURAÇÃO FIREBASE (NUVEM OFICIAL)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAY8VH8f3SKpDvKdm0fzG-9X7gAm-yUEF4",
  authDomain: "ld-controle-de-ponto.firebaseapp.com",
  projectId: "ld-controle-de-ponto",
  storageBucket: "ld-controle-de-ponto.firebasestorage.app",
  messagingSenderId: "825252476177",
  appId: "1:825252476177:web:042610ab02abe5e964c8b0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let usuarioLogado = null;
let tipoPontoPendente = ""; 
let PREFIXO_DB_EMPRESA = "default";
let idPontoPendenteObs = null; 

document.addEventListener("DOMContentLoaded", () => {
    inicializarRelogio();
    verificarSessaoExistente();
});

function inicializarRelogio() {
    const relogio = document.getElementById("relogioDigital");
    const campoData = document.getElementById("dataAtualStr");
    if (!relogio) return;
    setInterval(() => {
        const agora = new Date();
        relogio.innerText = agora.toLocaleTimeString("pt-BR");
        if (campoData) {
            campoData.innerText = agora.toLocaleDateString("pt-BR", {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
        }
    }, 1000);
}

function toggleSenhaLogin(idInput, botao) {
    const input = document.getElementById(idInput);
    if(input.type === "password") {
        input.type = "text";
        botao.innerText = "🙈";
    } else {
        input.type = "password";
        botao.innerText = "👁️";
    }
}

function exibirAvisoColab(titulo, mensagem) {
    const elTitulo = document.getElementById("modalColabTitulo");
    const elMsg = document.getElementById("modalColabMensagem");
    if (elTitulo) elTitulo.innerText = titulo;
    if (elMsg) elMsg.innerHTML = mensagem;
    
    setTimeout(() => {
        const elementoModal = document.getElementById("modalFeedbackColab");
        if (elementoModal) {
            const modalInstance = new bootstrap.Modal(elementoModal);
            modalInstance.show();
        }
    }, 50);
}

// =========================================================================
// MOTOR DE DETECÇÃO ANTIFRAUDE DE HARDWARE (CELULAR VS COMPUTADOR)
// =========================================================================
function detectarDispositivoReal() {
    // 1. Verificação de Client Hints modernos (Chrome/Edge Mobile)
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean") {
        if (navigator.userAgentData.mobile) return true;
    }

    // 2. User Agent clássico
    const ua = (navigator.userAgent || navigator.vendor || window.opera || "").toLowerCase();
    const isUAMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|webos|windows phone/i.test(ua);
    if (isUAMobile) return true;

    // 3. iPad/iOS em modo Desktop (identifica como MacIntel com tela Touch)
    const isAppleMobile = (navigator.platform === 'MacIntel' || navigator.platform === 'iPhone' || navigator.platform === 'iPad') && (navigator.maxTouchPoints > 1);
    if (isAppleMobile) return true;

    // 4. Detecção por sensores de hardware e tela sensível ao toque
    const hasTouchSensor = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    const isCoarsePointer = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const isNoHover = window.matchMedia && window.matchMedia("(hover: none)").matches;

    // Se o aparelho possui ponteiro de toque primário e sem suporte nativo a hover de mouse, é celular/tablet
    if (hasTouchSensor && (isCoarsePointer || isNoHover)) {
        return true;
    }

    // 5. Verificação de dimensões físicas de tela (celulares em modo desktop)
    const menorDimensao = Math.min(window.screen.width, window.screen.height);
    if (hasTouchSensor && menorDimensao <= 900) {
        return true;
    }

    return false; // É um computador desktop / notebook real
}

function validarPermissaoDispositivo(permissaoUsuario) {
    const ehCelular = detectarDispositivoReal();

    // Regra: "Apenas PC" ou "PC"
    if ((permissaoUsuario === "PC" || permissaoUsuario === "Apenas PC") && ehCelular) {
        return {
            permitido: false,
            mensagem: "🚫 <strong>Acesso Bloqueado no Celular!</strong><br><br>Seu usuário está configurado para registrar o ponto <strong>exclusivamente pelo computador (PC)</strong>. O uso de celular ou tablet não é permitido."
        };
    }

    // Regra: "Apenas Celular" ou "Celular"
    if ((permissaoUsuario === "Celular" || permissaoUsuario === "Apenas Celular") && !ehCelular) {
        return {
            permitido: false,
            mensagem: "🚫 <strong>Acesso Bloqueado no Computador!</strong><br><br>Seu usuário está configurado para registrar o ponto <strong>exclusivamente pelo celular</strong>."
        };
    }

    // "Ambos" ou permissão atendida
    return { permitido: true };
}

// =========================================================================
// CÁLCULO DE DISTÂNCIA E CERCA VIRTUAL (HAVERSINE)
// =========================================================================
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

async function validarCercaVirtualEmpresa(usuarioLat, usuarioLng, empresaEmail) {
    const configSnapshot = await db.collection("configuracoes_empresa")
                                 .where("empresaEmail", "==", empresaEmail)
                                 .get();

    if (configSnapshot.empty) {
        return { valido: true };
    }

    const configEmpresa = configSnapshot.docs[0].data();
    
    if (configEmpresa.latitude && configEmpresa.longitude) {
        const empresaLat = parseFloat(configEmpresa.latitude);
        const empresaLng = parseFloat(configEmpresa.longitude);
        const raioMaximo = parseInt(configEmpresa.raio, 10) || 50;
        
        const distanciaReal = calcularDistanciaHaversine(usuarioLat, usuarioLng, empresaLat, empresaLng);
        
        if (distanciaReal > raioMaximo) {
            return {
                valido: false,
                mensagem: `Você está fora do raio permitido da empresa (${Math.round(distanciaReal)}m de distância). O limite autorizado é de ${raioMaximo}m.`
            };
        }
    }

    return { valido: true };
}

async function buscarNomeEmpresaNuvem() {
    let nomeFinal = "Empresa Parceira";
    try {
        const confSnap = await db.collection("configuracoes_empresa").where("empresaEmail", "==", PREFIXO_DB_EMPRESA).get();
        if (!confSnap.empty && confSnap.docs[0].data().nomeEmpresa) {
            nomeFinal = confSnap.docs[0].data().nomeEmpresa;
        } else {
            const empSnap = await db.collection("empresas_clientes").where("email", "==", PREFIXO_DB_EMPRESA).get();
            if (!empSnap.empty && empSnap.docs[0].data().nome) {
                nomeFinal = empSnap.docs[0].data().nome;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar nome da empresa:", error);
    }
    
    localStorage.setItem("ponto_web_nome_empresa_colab", nomeFinal);
    if(typeof atualizarNomeEmpresaBadge === 'function') atualizarNomeEmpresaBadge();
}

function verificarSessaoExistente() {
    const sessaoSalva = localStorage.getItem("ponto_web_sessao_colab");
    if (sessaoSalva) {
        usuarioLogado = JSON.parse(sessaoSalva);
        PREFIXO_DB_EMPRESA = localStorage.getItem("ponto_web_email_empresa_colab") || "default";

        // Validação imediata de hardware na sessão salva (Independe de GPS)
        const checagem = validarPermissaoDispositivo(usuarioLogado.permissao);
        if (!checagem.permitido) {
            executarLogoutColaborador();
            exibirAvisoColab("🚫 Dispositivo Não Autorizado", checagem.mensagem);
            return;
        }

        renderizarFichaFuncionario();
        renderizarHistoricoHoje(); 
        irParaTela("horarios");
        
        const nomeSalvo = localStorage.getItem("ponto_web_nome_empresa_colab");
        if (!nomeSalvo || nomeSalvo === "Empresa Parceira" || nomeSalvo === "Sua Empresa") {
            buscarNomeEmpresaNuvem();
        } else {
            if(typeof atualizarNomeEmpresaBadge === 'function') atualizarNomeEmpresaBadge();
        }
    } else {
        irParaTela("login");
    }
}

async function executarLoginColaborador(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const senha = document.getElementById("loginSenha").value.trim();
    
    const btn = document.getElementById("btnLogarColab");
    btn.disabled = true;
    btn.innerHTML = "⏳ Validando Credenciais...";

    try {
        const snapshot = await db.collection("usuarios_ponto").where("email", "==", email).where("senha", "==", senha).get();

        if (snapshot.empty) {
            exibirAvisoColab("❌ Erro de Entrada", "E-mail ou senha incorretos.");
            btn.disabled = false;
            btn.innerHTML = "Entrar no Sistema";
            return;
        }

        const encontrarUser = snapshot.docs[0].data();
        const empresaEmailVinculo = encontrarUser.empresaEmail;

        if(encontrarUser.status === "BLOQUEADO") {
            exibirAvisoColab("🔒 Acesso Suspenso", "Sua conta foi temporariamente desativada pelo gestor.");
            btn.disabled = false;
            btn.innerHTML = "Entrar no Sistema";
            return;
        }

        // =========================================================================
        // TRAVA 1: BLOQUEIO IMEDIATO DE CELULAR (INDEPENDENTE DE GPS)
        // =========================================================================
        const validacaoDisp = validarPermissaoDispositivo(encontrarUser.permissao);
        if (!validacaoDisp.permitido) {
            exibirAvisoColab("🚫 Dispositivo Não Autorizado", validacaoDisp.mensagem);
            btn.disabled = false;
            btn.innerHTML = "Entrar no Sistema";
            return;
        }

        // Se o dispositivo foi aprovado, prossegue com a validação de GPS
        if (!navigator.geolocation) {
            exibirAvisoColab("⚠️ GPS Necessário", "Este sistema exige o uso de GPS ativo para validar o local de trabalho.");
            btn.disabled = false;
            btn.innerHTML = "Entrar no Sistema";
            return;
        }

        btn.innerHTML = "⏳ Validando Localização...";

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const usuarioLat = position.coords.latitude;
                const usuarioLng = position.coords.longitude;

                try {
                    const validacaoCerca = await validarCercaVirtualEmpresa(usuarioLat, usuarioLng, empresaEmailVinculo);
                    if (!validacaoCerca.valido) {
                        exibirAvisoColab("🚫 Fora da Empresa", validacaoCerca.mensagem);
                        btn.disabled = false;
                        btn.innerHTML = "Entrar no Sistema";
                        return;
                    }

                    usuarioLogado = encontrarUser;
                    PREFIXO_DB_EMPRESA = empresaEmailVinculo;
                    localStorage.setItem("ponto_web_sessao_colab", JSON.stringify(usuarioLogado));
                    localStorage.setItem("ponto_web_email_empresa_colab", PREFIXO_DB_EMPRESA); 
                    
                    renderizarFichaFuncionario();
                    renderizarHistoricoHoje();
                    irParaTela("horarios");
                    
                    buscarNomeEmpresaNuvem();

                } catch (err) {
                    console.error(err);
                    exibirAvisoColab("⚠️ Erro Interno", "Falha ao processar regras de segurança.");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = "Entrar no Sistema";
                }
            },
            (error) => {
                exibirAvisoColab("⚠️ GPS Requerido", "Ative a permissão de localização no seu navegador para entrar.");
                btn.disabled = false;
                btn.innerHTML = "Entrar no Sistema";
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );

    } catch (error) {
        console.error(error);
        exibirAvisoColab("⚠️ Erro de Conexão", "Falha ao comunicar com a Nuvem.");
        btn.disabled = false;
        btn.innerHTML = "Entrar no Sistema";
    }
}

function renderizarFichaFuncionario() {
    const el = document.getElementById("nomeFuncionarioConectado");
    if (!el) return;
    el.innerHTML = `
        <div class="text-center mt-2">
            <img src="${usuarioLogado.foto}" style="width: 75px; height: 75px; border-radius: 50%; object-fit: cover; border: 3px solid #f97316; margin-bottom: 8px;" onerror="this.src='https://ui-avatars.com/api/?name=User'">
            <h6 class="mb-0 text-dark fw-bold">${usuarioLogado.nome}</h6>
            <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 0;">CPF: ${usuarioLogado.cpf}</p>
        </div>
    `;
}

async function solicitarMarcacaoPonto(tipo) {
    // Revalidação em tempo real direto da nuvem
    try {
        const snapAtual = await db.collection("usuarios_ponto")
            .where("email", "==", usuarioLogado.email)
            .get();

        if (!snapAtual.empty) {
            const userAtual = snapAtual.docs[0].data();
            usuarioLogado.permissao = userAtual.permissao;
            usuarioLogado.status = userAtual.status;
            localStorage.setItem("ponto_web_sessao_colab", JSON.stringify(usuarioLogado));
        }
    } catch(e) {
        console.warn("Checagem online prévia ignorada.");
    }

    if(usuarioLogado.status === "BLOQUEADO") {
        executarLogoutColaborador();
        exibirAvisoColab("🔒 Acesso Suspenso", "Sua conta foi suspensa.");
        return;
    }

    // =========================================================================
    // TRAVA 2: BLOQUEIO NO MOMENTO DO REGISTRO (INDEPENDENTE DE GPS)
    // =========================================================================
    const validacaoDisp = validarPermissaoDispositivo(usuarioLogado.permissao);
    if (!validacaoDisp.permitido) {
        exibirAvisoColab("🚫 Dispositivo Bloqueado", validacaoDisp.mensagem);
        return;
    }

    const hojeStr = new Date().toLocaleDateString("pt-BR");
    try {
        const snapshot = await db.collection("historico_pontos")
            .where("colaboradorId", "==", String(usuarioLogado.id))
            .where("data", "==", hojeStr)
            .where("tipo", "==", tipo)
            .get();

        if (!snapshot.empty) {
            exibirAvisoColab("⚠️ Registro Duplicado", `Você já realizou a marcação de <strong>${tipo}</strong> hoje.`);
            return; 
        }

        tipoPontoPendente = tipo;
        document.getElementById("txtTipoPontoConfirmar").innerText = tipo;
        new bootstrap.Modal(document.getElementById("modalConfirmarPonto")).show();

    } catch (error) {
        exibirAvisoColab("⚠️ Erro", "Não foi possível consultar seu histórico.");
    }
}

function confirmarEGravarPonto() {
    // =========================================================================
    // TRAVA 3: BLOQUEIO FINAL ANTES DE ENVIAR PARA O BANCO
    // =========================================================================
    const validacaoDisp = validarPermissaoDispositivo(usuarioLogado.permissao);
    if (!validacaoDisp.permitido) {
        const modalConf = bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto"));
        if(modalConf) modalConf.hide();
        exibirAvisoColab("🚫 Dispositivo Bloqueado", validacaoDisp.mensagem);
        return;
    }

    if (!navigator.geolocation) {
        exibirAvisoColab("Erro", "GPS não suportado.");
        return;
    }

    const btn = document.getElementById("btnGravarPonto");
    btn.disabled = true;
    btn.innerHTML = "⏳ Validando Cerca Virtual...";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const usuarioLat = position.coords.latitude;
            const usuarioLng = position.coords.longitude;

            try {
                const validacaoCerca = await validarCercaVirtualEmpresa(usuarioLat, usuarioLng, PREFIXO_DB_EMPRESA);
                if (!validacaoCerca.valido) {
                    const modalConf = bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto"));
                    if(modalConf) modalConf.hide();
                    exibirAvisoColab("🚫 Fora da Empresa", validacaoCerca.mensagem);
                    btn.disabled = false;
                    btn.innerHTML = "Sim, Gravar";
                    return;
                }

                btn.innerHTML = "⏳ Gravando na Nuvem...";
                const agora = new Date();
                const dataInjetada = agora.toLocaleDateString("pt-BR"); 
                const horaMarcada = agora.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
                
                const novoPonto = {
                    colaboradorId: String(usuarioLogado.id),
                    nome: usuarioLogado.nome,
                    data: dataInjetada,
                    tipo: tipoPontoPendente,
                    hora: horaMarcada,
                    empresaEmail: PREFIXO_DB_EMPRESA,
                    latitudeGravada: usuarioLat,
                    longitudeGravada: usuarioLng,
                    dispositivoUsado: detectarDispositivoReal() ? "Celular" : "PC",
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await db.collection("historico_pontos").add(novoPonto);
                idPontoPendenteObs = docRef.id; 
                
                const modalConf = bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto"));
                if(modalConf) modalConf.hide();
                
                renderizarHistoricoHoje(); 
                
                document.getElementById("obsOpcoes").style.display = "block";
                document.getElementById("obsCampo").style.display = "none";
                document.getElementById("txtObservacaoPonto").value = "";
                new bootstrap.Modal(document.getElementById("modalObservacao")).show();
                
            } catch (error) {
                console.error(error);
                exibirAvisoColab("⚠️ Erro de Gravação", "Falha ao salvar na nuvem.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Sim, Gravar";
            }
        },
        (error) => { 
            const modalConf = bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto"));
            if(modalConf) modalConf.hide();
            exibirAvisoColab("Erro GPS", "Ative o seu GPS para marcar o ponto.");
            btn.disabled = false;
            btn.innerHTML = "Sim, Gravar";
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

function ignorarObservacao() {
    const modalObs = bootstrap.Modal.getInstance(document.getElementById("modalObservacao"));
    if(modalObs) modalObs.hide();
    exibirAvisoColab("🎯 Sucesso!", `Ponto de <strong>${tipoPontoPendente}</strong> gravado com sucesso!`);
}

function mostrarCampoObservacao() {
    document.getElementById("obsOpcoes").style.display = "none";
    document.getElementById("obsCampo").style.display = "block";
    document.getElementById("txtObservacaoPonto").focus();
}

async function salvarObservacaoPonto() {
    const texto = document.getElementById("txtObservacaoPonto").value.trim();
    if (!texto) {
        alert("Por favor, digite a sua justificativa.");
        return;
    }

    const btn = document.getElementById("btnSalvarObs");
    btn.disabled = true;
    btn.innerHTML = "⏳ Salvando Justificativa...";

    try {
        await db.collection("historico_pontos").doc(idPontoPendenteObs).update({
            observacao: texto
        });
        
        const modalObs = bootstrap.Modal.getInstance(document.getElementById("modalObservacao"));
        if(modalObs) modalObs.hide();
        
        exibirAvisoColab("🎯 Sucesso!", `Ponto e justificativa salvos com sucesso na nuvem!`);
    } catch (error) {
        console.error(error);
        alert("Erro ao gravar a observação.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Salvar Justificativa";
    }
}

async function renderizarHistoricoHoje() {
    const hojeStr = new Date().toLocaleDateString("pt-BR");
    const containerRegistros = document.getElementById("listaRegistrosHoje");
    if (!containerRegistros) return;
    containerRegistros.innerHTML = `<div class="text-center text-muted small py-2">⏳ Puxando histórico...</div>`;
    try {
        const snapshot = await db.collection("historico_pontos").where("colaboradorId", "==", String(usuarioLogado.id)).where("data", "==", hojeStr).get();
        containerRegistros.innerHTML = "";
        if(snapshot.empty) {
            containerRegistros.innerHTML = `<div id="txtSemPontos" class="text-center text-muted small py-2">Nenhum ponto registrado hoje.</div>`;
            return;
        }
        let logsDeHoje = [];
        snapshot.forEach(doc => logsDeHoje.push(doc.data()));
        const ordem = { "Entrada": 1, "Almoço Ida": 2, "Almoço Volta": 3, "Saída": 4 };
        logsDeHoje.sort((a, b) => (ordem[a.tipo] || 99) - (ordem[b.tipo] || 99));
        logsDeHoje.forEach(log => {
            const div = document.createElement("div"); div.className = "log-registro";
            div.innerHTML = `<span class="tipo">● ${log.tipo}</span><span class="data-log">(${log.data})</span><span class="hora">${log.hora}</span>`;
            containerRegistros.appendChild(div);
        });
    } catch (error) { containerRegistros.innerHTML = `<div class="text-center text-danger small py-2">⚠️ Falha ao carregar registros.</div>`; }
}

function executarLogoutColaborador() {
    localStorage.removeItem("ponto_web_sessao_colab"); 
    localStorage.removeItem("ponto_web_email_empresa_colab"); 
    localStorage.removeItem("ponto_web_nome_empresa_colab");
    usuarioLogado = null; 
    PREFIXO_DB_EMPRESA = "default";
    const elEmail = document.getElementById("loginEmail");
    const elSenha = document.getElementById("loginSenha");
    if (elEmail) elEmail.value = ""; 
    if (elSenha) elSenha.value = "";
    irParaTela("login");
}

function irParaTela(nomeTela) {
    const elLogin = document.getElementById("secao-login");
    const elHorarios = document.getElementById("secao-horarios");
    if (elLogin) elLogin.classList.remove("active"); 
    if (elHorarios) elHorarios.classList.remove("active");
    if (nomeTela === "login" && elLogin) elLogin.classList.add("active");
    else if (nomeTela === "horarios" && elHorarios) elHorarios.classList.add("active");
}
