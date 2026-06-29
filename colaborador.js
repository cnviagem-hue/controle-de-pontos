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
        campoData.innerText = agora.toLocaleDateString("pt-BR", {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
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
    document.getElementById("modalColabTitulo").innerText = titulo;
    document.getElementById("modalColabMensagem").innerHTML = mensagem;
    new bootstrap.Modal(document.getElementById("modalFeedbackColab")).show();
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

// Auxiliar matemático para a Cerca Virtual
function calcularDistanciaHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

// ========================================================
// FUNÇÃO ATUALIZADA: LOGIN COM VALIDAÇÃO GEOGRÁFICA PRÉVIA
// ========================================================
async function ejecutarLoginColaborador(event) {
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

        // --- NOVA TRAVA: VALIDAÇÃO DE LOCALIZAÇÃO ANTES DE LIBERAR O APP ---
        if (!navigator.geolocation) {
            exibirAvisoColab("⚠️ GPS Necessário", "Este sistema exige o uso de GPS ativo para validar o acesso ao trabalho.");
            btn.disabled = false;
            btn.innerHTML = "Entrar no Sistema";
            return;
        }

        btn.innerHTML = "⏳ Verificando Localização...";

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const usuarioLat = position.coords.latitude;
                const usuarioLng = position.coords.longitude;

                try {
                    // Busca os parâmetros de raio e endereço configurados pelo RH na Nuvem
                    const configSnapshot = await db.collection("configuracoes_empresa")
                                                 .where("empresaEmail", "==", empresaEmailVinculo)
                                                 .get();

                    if (!configSnapshot.empty) {
                        const configEmpresa = configSnapshot.docs[0].data();
                        
                        if (configEmpresa.latitude && configEmpresa.longitude) {
                            const empresaLat = parseFloat(configEmpresa.latitude);
                            const empresaLng = parseFloat(configEmpresa.longitude);
                            const raioMaximo = parseInt(configEmpresa.raio, 10) || 50;

                            const distanciaRealMetros = calcularDistanciaHaversine(usuarioLat, usuarioLng, empresaLat, empresaLng);

                            // SE ESTIVER FORA DO ALCANCE: Barra na hora, exibe o alerta e limpa os campos
                            if (distanciaRealMetros > raioMaximo) {
                                document.getElementById("loginSenha").value = "";
                                exibirAvisoColab(
                                    "🚫 Acesso Bloqueado (Fora do Alcance)", 
                                    "Desculpe, você não tem permissão para acessar o sistema fora do seu local de trabalho.<br><br>Por favor, certifique-se de que está no estabelecimento da empresa e com o GPS ativo."
                                );
                                btn.disabled = false;
                                btn.innerHTML = "Entrar no Sistema";
                                return; // Interrompe o login imediatamente!
                            }
                        }
                    }

                    // Se passou por todas as regras de segurança, valida o restante dos parâmetros
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    
                    if (encontrarUser.permissao === "Celular" && !isMobile) {
                        exibirAvisoColab("🚫 Acesso Bloqueado", "Sua conta está autorizada para bater ponto <strong>APENAS PELO CELULAR</strong>.");
                        btn.disabled = false;
                        btn.innerHTML = "Entrar no Sistema";
                        return;
                    }
                    
                    if (encontrarUser.permissao === "PC" && isMobile) {
                        exibirAvisoColab("🚫 Acesso Bloqueado", "Sua conta está autorizada para bater ponto <strong>APENAS PELO COMPUTADOR</strong>.");
                        btn.disabled = false;
                        btn.innerHTML = "Entrar no Sistema";
                        return;
                    }

                    // Login Autorizado com Sucesso
                    usuarioLogado = encontrarUser;
                    PREFIXO_DB_EMPRESA = empresaEmailVinculo;
                    localStorage.setItem("ponto_web_sessao_colab", JSON.stringify(usuarioLogado));
                    localStorage.setItem("ponto_web_email_empresa_colab", PREFIXO_DB_EMPRESA); 
                    
                    renderizarFichaFuncionario();
                    renderizarHistoricoHoje();
                    irParaTela("horarios");
                    
                    buscarNomeEmpresaNuvem();
                    exibirAvisoColab("🔓 Logado", `Ficha validada na Nuvem com sucesso!`);

                } catch (err) {
                    console.error(err);
                    exibirAvisoColab("⚠️ Erro Interno", "Falha ao processar regras de segurança.");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = "Entrar no Sistema";
                }
            },
            (error) => {
                exibirAvisoColab("⚠️ GPS Desativado", "Para entrar na plataforma, você precisa ativar a permissão de localização do seu navegador/aparelho.");
                btn.disabled = false;
                btn.innerHTML = "Entrar no Sistema";
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );

    } catch (error) {
        console.error(error);
        exibirAvisoColab("⚠️ Erro de Conexão", "Falha ao comunicar com a Nuvem. Verifique sua internet.");
        btn.disabled = false;
        btn.innerHTML = "Entrar no Sistema";
    }
}

function renderizarFichaFuncionario() {
    document.getElementById("nomeFuncionarioConectado").innerHTML = `
        <div class="text-center mt-2">
            <img src="${usuarioLogado.foto}" style="width: 75px; height: 75px; border-radius: 50%; object-fit: cover; border: 3px solid #f97316; margin-bottom: 8px;" onerror="this.src='https://ui-avatars.com/api/?name=User'">
            <h6 class="mb-0 text-dark fw-bold">${usuarioLogado.nome}</h6>
            <p class="text-muted" style="font-size: 0.75rem; margin-bottom: 0;">CPF: ${usuarioLogado.cpf}</p>
        </div>
    `;
}

async function solicitarMarcacaoPonto(tipo) {
    const hojeStr = new Date().toLocaleDateString("pt-BR");
    try {
        const snapshot = await db.collection("historico_pontos")
            .where("colaboradorId", "==", String(usuarioLogado.id))
            .where("data", "==", hojeStr)
            .where("tipo", "==", tipo)
            .get();

        if (!snapshot.empty) {
            exibirAvisoColab("⚠️ Registro Duplicado", `Você já realizou a marcação de <strong>${tipo}</strong> hoje. Escolha outra opção!`);
            return; 
        }

        tipoPontoPendente = tipo;
        document.getElementById("txtTipoPontoConfirmar").innerText = tipo;
        new bootstrap.Modal(document.getElementById("modalConfirmarPonto")).show();

    } catch (error) {
        exibirAvisoColab("⚠️ Erro", "Não foi possível consultar seu histórico na Nuvem.");
    }
}

function confirmarEGravarPonto() {
    if (!navigator.geolocation) {
        exibirAvisoColab("Erro", "GPS não suportado pelo navegador.");
        return;
    }

    const btn = document.getElementById("btnGravarPonto");
    btn.disabled = true;
    btn.innerHTML = "⏳ Validando GPS Inteligente...";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const usuarioLat = position.coords.latitude;
            const usuarioLng = position.coords.longitude;

            try {
                btn.innerHTML = "⏳ Validando Cerca Virtual...";
                
                const configSnapshot = await db.collection("configuracoes_empresa")
                                             .where("empresaEmail", "==", PREFIXO_DB_EMPRESA)
                                             .get();

                if (!configSnapshot.empty) {
                    const configEmpresa = configSnapshot.docs[0].data();
                    
                    if (configEmpresa.latitude && configEmpresa.longitude) {
                        const empresaLat = parseFloat(configEmpresa.latitude);
                        const empresaLng = parseFloat(configEmpresa.longitude);
                        const raioMaximo = parseInt(configEmpresa.raio, 10) || 50;

                        const distanciaRealMetros = calcularDistanciaHaversine(usuarioLat, usuarioLng, empresaLat, empresaLng);

                        if (distanciaRealMetros > raioMaximo) {
                            bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();
                            
                            const metrosFora = Math.round(distanciaRealMetros);
                            exibirAvisoColab(
                                "🚫 Ponto Bloqueado (Fora do Raio)", 
                                `A cerca virtual barrou o seu registro.<br><br>Você está a <strong>${metrosFora} metros</strong> do local de trabalho.<br>O limite máximo autorizado é de <strong>${raioMaximo} metros</strong>.`
                            );
                            return; 
                        }
                    }
                }

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
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                btn.innerHTML = "⏳ Gravando na Nuvem...";
                await db.collection("historico_pontos").add(novoPonto);
                
                bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();
                renderizarHistoricoHoje(); 
                exibirAvisoColab("🎯 Sucesso!", `Seu ponto de <strong>${tipoPontoPendente}</strong> das ${horaMarcada} foi gravado na Nuvem com validação geográfica activa!`);
                
            } catch (error) {
                console.error(error);
                exibirAvisoColab("⚠️ Erro de Gravação", "Ocorreu uma falha ao enviar o ponto para a nuvem.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Sim, Gravar";
            }
        },
        (error) => { 
            bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();
            exibirAvisoColab("Erro de Autenticação", "Por favor, ative o GPS de alta precisão do seu aparelho para validar o ponto.");
            btn.disabled = false;
            btn.innerHTML = "Sim, Gravar";
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

async function renderizarHistoricoHoje() {
    const hojeStr = new Date().toLocaleDateString("pt-BR");
    const containerRegistros = document.getElementById("listaRegistrosHoje");
    if (!containerRegistros) return;
    containerRegistros.innerHTML = `<div class="text-center text-muted small py-2">⏳ Puxando histórico da Nuvem...</div>`;

    try {
        const snapshot = await db.collection("historico_pontos")
            .where("colaboradorId", "==", String(usuarioLogado.id))
            .where("data", "==", hojeStr)
            .get();

        containerRegistros.innerHTML = "";

        if(snapshot.empty) {
            containerRegistros.innerHTML = `<div id="txtSemPontos" class="text-center text-muted small py-2">Nenhum ponto registrado hoje.</div>`;
            return;
        }

        let logsDeHoje = [];
        snapshot.forEach(doc => logsDeHoje.push(doc.data()));
        
        const ordem = { "Entrada": 1, "Almoço Ida": 2, "Almoço Volta": 3, "Saída": 4 };
        logsDeHoje.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);

        logsDeHoje.forEach(log => {
            const div = document.createElement("div");
            div.className = "log-registro";
            div.innerHTML = `
                <span class="tipo">● ${log.tipo}</span>
                <span class="data-log">(${log.data})</span>
                <span class="hora">${log.hora}</span>
            `;
            containerRegistros.appendChild(div);
        });

    } catch (error) {
        containerRegistros.innerHTML = `<div class="text-center text-danger small py-2">⚠️ Falha ao carregar registros.</div>`;
    }
}

function ejecutarLogoutColaborador() {
    localStorage.removeItem("ponto_web_sessao_colab");
    localStorage.removeItem("ponto_web_email_empresa_colab");
    localStorage.removeItem("ponto_web_nome_empresa_colab");
    usuarioLogado = null;
    PREFIXO_DB_EMPRESA = "default";
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginSenha").value = "";
    irParaTela("login");
}

function irParaTela(nomeTela) {
    document.getElementById("secao-login").classList.remove("active");
    document.getElementById("secao-horarios").classList.remove("active");
    if (nomeTela === "login") document.getElementById("secao-login").classList.add("active");
    else if (nomeTela === "horarios") document.getElementById("secao-horarios").classList.add("active");
}
