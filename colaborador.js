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

// ==========================================
// CORREÇÃO: BUSCA INTELIGENTE DO NOME DA EMPRESA
// ==========================================
async function buscarNomeEmpresaNuvem() {
    let nomeFinal = "Empresa Parceira";
    try {
        // 1. Tenta pegar o nome customizado pelo RH nas configurações
        const confSnap = await db.collection("configuracoes_empresa").where("empresaEmail", "==", PREFIXO_DB_EMPRESA).get();
        if (!confSnap.empty && confSnap.docs[0].data().nomeEmpresa) {
            nomeFinal = confSnap.docs[0].data().nomeEmpresa;
        } else {
            // 2. Se não achar, pega o nome original do Super Admin
            const empSnap = await db.collection("empresas_clientes").where("email", "==", PREFIXO_DB_EMPRESA).get();
            if (!empSnap.empty && empSnap.docs[0].data().nome) {
                nomeFinal = empSnap.docs[0].data().nome;
            }
        }
    } catch (error) {
        console.error("Erro ao buscar nome da empresa:", error);
    }
    
    // Salva na memória para não gastar o banco nas próximas vezes
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
        
        // Verifica se a memória está desatualizada e busca da nuvem se necessário
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
    btn.innerHTML = "⏳ Conectando à Nuvem...";

    try {
        const snapshot = await db.collection("usuarios_ponto").where("email", "==", email).where("senha", "==", senha).get();

        if (!snapshot.empty) {
            const encontrarUser = snapshot.docs[0].data();
            
            PREFIXO_DB_EMPRESA = encontrarUser.empresaEmail;

            // Trava 1: Usuário Bloqueado
            if(encontrarUser.status === "BLOQUEADO") {
                exibirAvisoColab("🔒 Acesso Suspenso", "Sua conta foi temporariamente desativada pelo gestor.");
                return;
            }
            
            // Trava 2: VALIDAÇÃO DE DISPOSITIVO AUTORIZADO
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (encontrarUser.permissao === "Celular" && !isMobile) {
                exibirAvisoColab("🚫 Acesso Bloqueado", "Sua conta está autorizada para bater ponto <strong>APENAS PELO CELULAR</strong>.<br><br>Acesso via Computador/PC foi negado.");
                return;
            }
            
            if (encontrarUser.permissao === "PC" && isMobile) {
                exibirAvisoColab("🚫 Acesso Bloqueado", "Sua conta está autorizada para bater ponto <strong>APENAS PELO COMPUTADOR</strong>.<br><br>Acesso via Celular foi negado.");
                return;
            }

            // Sucesso: Libera o login
            usuarioLogado = encontrarUser;
            localStorage.setItem("ponto_web_sessao_colab", JSON.stringify(usuarioLogado));
            localStorage.setItem("ponto_web_email_empresa_colab", PREFIXO_DB_EMPRESA); 
            
            renderizarFichaFuncionario();
            renderizarHistoricoHoje();
            irParaTela("horarios");
            
            // Dispara a busca do nome em segundo plano para não travar a tela
            buscarNomeEmpresaNuvem();
            
            exibirAvisoColab("🔓 Logado", `Ficha validada na Nuvem com sucesso!`);
        } else {
            exibirAvisoColab("❌ Erro de Entrada", "E-mail ou senha incorretos.");
        }
    } catch (error) {
        console.error(error);
        exibirAvisoColab("⚠️ Erro de Conexão", "Falha ao comunicar com a Nuvem. Verifique sua internet.");
    } finally {
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
        exibirAvisoColab("⚠️ Erro", "Não foi possível consultar seu histórico na Nuvem. Verifique a internet.");
    }
}

function confirmarEGravarPonto() {
    if (!navigator.geolocation) {
        exibirAvisoColab("Erro", "GPS não suportado pelo navegador.");
        return;
    }

    const btn = document.getElementById("btnGravarPonto");
    btn.disabled = true;
    btn.innerHTML = "⏳ Validando GPS...";

    navigator.geolocation.getCurrentPosition(
        async (position) => {
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
                latitudeGravada: position.coords.latitude,
                longitudeGravada: position.coords.longitude,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            try {
                btn.innerHTML = "⏳ Gravando na Nuvem...";
                await db.collection("historico_pontos").add(novoPonto);
                
                bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();
                renderizarHistoricoHoje(); 
                exibirAvisoColab("🎯 Sucesso!", `Seu ponto de <strong>${tipoPontoPendente}</strong> das ${horaMarcada} foi gravado na Nuvem com validação geográfica ativa!`);
            } catch (error) {
                exibirAvisoColab("⚠️ Erro de Gravação", "Ocorreu uma falha ao enviar o ponto para a nuvem.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Sim, Gravar";
            }
        },
        (error) => { 
            bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();
            exibirAvisoColab("Erro de Autenticação", "Por favor, ative o GPS do seu aparelho para validar o ponto.");
            btn.disabled = false;
            btn.innerHTML = "Sim, Gravar";
        },
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

async function renderizarHistoricoHoje() {
    const hojeStr = new Date().toLocaleDateString("pt-BR");
    const containerRegistros = document.getElementById("listaRegistrosHoje");
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

function executarLogoutColaborador() {
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
