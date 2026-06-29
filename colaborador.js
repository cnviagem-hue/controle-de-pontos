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
    document.getElementById("modalColabMensagem").innerHTML = message = mensagem;
    
    setTimeout(() => {
        const elementoModal = document.getElementById("modalFeedbackColab");
        const modalInstance = new bootstrap.Modal(elementoModal);
        modalInstance.show();
    }, 50);
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

        if (!navigator.geolocation) {
            exibirAvisoColab("⚠️ GPS Necessário", "Este sistema exige o uso de GPS ativo para validar o acesso ao trabalho.");
            btn.disabled = false;
            btn.innerHTML = "Entrar no Sistema";
            return;
        }

        btn.innerHTML = "⏳ Localizando Aparelho...";

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const usuarioLat = position.coords.latitude;
                const usuarioLng = position.coords.longitude;

                try {
                    const configSnapshot = await db.collection("configuracoes_empresa")
                                                 .where("empresaEmail", "==", empresaEmailVinculo)
                                                 .get();

                    if (configSnapshot.empty) {
                        document.getElementById("loginSenha").value = "";
                        exibirAvisoColab("🚫 Acesso Bloqueado", "Parâmetros de segurança não localizados.");
                        btn.disabled = false;
                        btn.innerHTML = "Entrar no Sistema";
                        return;
                    }

                    const configEmpresa = configSnapshot.docs[0].data();
                    
                    if (configEmpresa.latitude && configEmpresa.longitude) {
                        const empresaLat = parseFloat(configEmpresa.latitude);
                        const empresaLng = parseFloat(configEmpresa.longitude);
                        const raioMaximo = parseInt(configEmpresa.raio, 10) || 50;

                        const distanciaRealMetros = calcularDistanciaHaversine(usuarioLat, usuarioLng, empresaLat, empresaLng);

                        // MODO DE SEGURANÇA DESATIVADO TEMPORARIAMENTE PARA O SEU TESTE DE CASA FUNCIONAR DIRECTO
                        console.log("Distância real medida: " + distanciaRealMetros + "m contra raio de: " + raioMaximo + "m");
                    }

                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    
                    if (encontrarUser.permissao === "Celular" && !isMobile) {
                        exibirAvisoColab("🚫 Acesso Bloqueado", "Sua conta está autorizada apenas pelo celular.");
                        btn.disabled = false;
                        btn.innerHTML = "Entrar no Sistema";
                        return;
                    }
                    
                    if (encontrarUser.permissao === "PC" && isMobile) {
                        exibirAvisoColab("🚫 Acesso Bloqueado", "Sua conta está autorizada apenas pelo computador.");
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
                exibirAvisoColab("⚠️ GPS Requerido", "Ative a permissão de localização no seu navegador.");
                btn.disabled = false;
                btn.innerHTML = "Entrar no Sistema";
            },
            { 
                enableHighAccuracy: true, 
                timeout: 8000,            
                maximumAge: 0             
            }
        );

    } catch (error) {
        console.error(error);
        exibirAvisoColab("⚠️ Erro de Conexão", "Falha ao comunicar com a Nuvem.");
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
    if (!navigator.geolocation) {
        exibirAvisoColab("Erro", "GPS não suportado.");
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
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection("historico_pontos").add(novoPonto);
                
                bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();
                renderizarHistoricoHoje(); 
                exibirAvisoColab("🎯 Sucesso!", `Ponto de <strong>${tipoPontoPendente}</strong> gravado com sucesso!`);
                
            } catch (error) {
                console.error(error);
                exibirAvisoColab("⚠️ Erro de Gravação", "Falha ao salvar na nuvem.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Sim, Gravar";
            }
        },
        (error) => { 
            bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();
            exibirAvisoColab("Erro GPS", "Ative o seu GPS para marcar o ponto.");
            btn.disabled = false;
            btn.innerHTML = "Sim, Gravar";
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
}

// [Código restante mantido idêntico para segurança]
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
        logsDeHoje.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
        logsDeHoje.forEach(log => {
            const div = document.createElement("div"); div.className = "log-registro";
            div.innerHTML = `<span class="tipo">● ${log.tipo}</span><span class="data-log">(${log.data})</span><span class="hora">${log.hora}</span>`;
            containerRegistros.appendChild(div);
        });
    } catch (error) { containerRegistros.innerHTML = `<div class="text-center text-danger small py-2">⚠️ Falha ao carregar registros.</div>`; }
}
function executarLogoutColaborador() {
    localStorage.removeItem("ponto_web_sessao_colab"); localStorage.removeItem("ponto_web_email_empresa_colab"); localStorage.removeItem("ponto_web_nome_empresa_colab");
    usuarioLogado = null; PREFIXO_DB_EMPRESA = "default";
    document.getElementById("loginEmail").value = ""; document.getElementById("loginSenha").value = "";
    irParaTela("login");
}
function irParaTela(nomeTela) {
    document.getElementById("secao-login").classList.remove("active"); document.getElementById("secao-horarios").classList.remove("active");
    if (nomeTela === "login") document.getElementById("secao-login").classList.add("active");
    else if (nomeTela === "horarios") document.getElementById("secao-horarios").classList.add("active");
}
