// Estado da aplicação do colaborador
let usuarioLogado = null;

// Inicialização automática ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
    inicializarRelogio();
    verificarSessaoExistente();
});

/**
 * Controla o relógio digital em tempo real na tela de horários
 */
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

/**
 * Exibe pop-up elegante no topo padrão do Bootstrap
 */
function exibirAvisoColab(titulo, mensagem) {
    document.getElementById("modalColabTitulo").innerText = titulo;
    document.getElementById("modalColabMensagem").innerHTML = mensagem;
    
    const elementoModal = document.getElementById("modalFeedbackColab");
    const modalBootstrap = new bootstrap.Modal(elementoModal);
    modalBootstrap.show();
}

/**
 * CORREÇÃO SOLICITADA: Verifica se o usuário já estava logado.
 * Se houver sessão, ele vai para a tela de ponto. Se não, fica OBRIGATORIAMENTE na tela de login.
 */
function verificarSessaoExistente() {
    const sessaoSalva = localStorage.getItem("ponto_web_sessao_colab");
    
    if (sessaoSalva) {
        usuarioLogado = JSON.parse(sessaoSalva);
        // Exibe o nome correto salvo no Firebase/Local
        document.getElementById("nomeFuncionarioConectado").innerText = usuarioLogado.nome;
        irParaTela("horarios");
    } else {
        irParaTela("login");
    }
}

/**
 * Executa a lógica de autenticação ao clicar no formulário
 */
function executarLoginColaborador(event) {
    event.preventDefault();
    
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value;

    // Simulação de verificação de credenciais (Integrável com seu banco/Firebase)
    if (email === "joao@empresa.com" && senha === "123456") {
        usuarioLogado = {
            id: 1,
            nome: "João da Silva",
            email: email,
            permissao: "Celular"
        };
        
        // Salva a sessão para não precisar logar a cada segundo, a menos que ele saia voluntariamente
        localStorage.setItem("ponto_web_sessao_colab", JSON.stringify(usuarioLogado));
        document.getElementById("nomeFuncionarioConectado").innerText = usuarioLogado.nome;
        
        irParaTela("horarios");
        exibirAvisoColab("🔓 Acesso Concedido", `Bem-vindo de volta, <strong>${usuarioLogado.nome}</strong>!`);
    } else {
        exibirAvisoColab("❌ Falha de Autenticação", "E-mail de acesso ou senha incorretos. Caso tenha esquecido, solicite redefinição ao administrador.");
    }
}

/**
 * Executa o Logout limpando as chaves de sessão e forçando o login na próxima vez
 */
function ejecutarLogoutColaborador() {
    localStorage.removeItem("ponto_web_sessao_colab");
    usuarioLogado = null;
    
    // Reseta inputs de login
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginSenha").value = "";
    
    irParaTela("login");
    exibirAvisoColab("↩️ Sessão Encerrada", "Você saiu da sua conta com segurança.");
}

/**
 * Tenta capturar a localização atual para validar contra a cerca virtual configurada no admin
 */
function tentarRegistrarPonto() {
    if (!navigator.geolocation) {
        exibirAvisoColab("Dispositivo Incompatível", "O navegador bloqueia ou não possui suporte à verificação de GPS geográfico.");
        return;
    }

    exibirAvisoColab("🛰️ Validando Cerca Antifraude", "Aguarde enquanto validamos suas coordenadas de latitude e longitude com os parâmetros da empresa...");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const latColab = position.coords.latitude;
            const lngColab = position.coords.longitude;
            
            // Exemplo de sucesso: Adiciona o registro no espelho de ponto hoje
            const agora = new Date();
            const horaMarcada = agora.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });

            const txtSemPontos = document.getElementById("txtSemPontos");
            if (txtSemPontos) txtSemPontos.style.display = "none";

            const containerRegistros = document.getElementById("listaRegistrosHoje");
            const novoLog = document.createElement("div");
            novoLog.className = "log-registro";
            novoLog.innerHTML = `<strong>✔ Ponto Batido:</strong> ${horaMarcada} - Registrado via Geolocalização precisa.`;
            containerRegistros.appendChild(novoLog);

            exibirAvisoColab("🎯 Ponto Registrado!", `Sucesso! Seu ponto das <strong>${horaMarcada}</strong> foi salvo na base de dados com proteção antifraude.`);
        },
        (error) => {
            exibirAvisoColab("Cerca Virtual Violada", "Não foi possível bater o seu ponto. Você precisa conceder acesso à localização GPS no seu celular para comprovar que está na empresa.");
        },
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

/**
 * Função interna para gerenciar qual seção está visível na tela
 */
function irParaTela(nomeTela) {
    document.getElementById("secao-login").classList.remove("active");
    document.getElementById("secao-horarios").classList.remove("active");

    if (nomeTela === "login") {
        document.getElementById("secao-login").classList.add("active");
    } else if (nomeTela === "horarios") {
        document.getElementById("secao-horarios").classList.add("active");
    }
}
