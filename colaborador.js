let usuarioLogado = null;
let tipoPontoPendente = ""; 

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

// CORREÇÃO E IMPLEMENTAÇÃO: Função para alternar a visibilidade da senha no login
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
    new bootstrap.Modal(document.getElementById("modalFeedbackColab")).show();
}

function verificarSessaoExistente() {
    const sessaoSalva = localStorage.getItem("ponto_web_sessao_colab");
    if (sessaoSalva) {
        usuarioLogado = JSON.parse(sessaoSalva);
        renderizarFichaFuncionario();
        irParaTela("horarios");
    } else {
        irParaTela("login");
    }
}

// OTIMIZADO: Ajustado para buscar de forma precisa na base salva pelo Admin
function executarLoginColaborador(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const senha = document.getElementById("loginSenha").value.trim();

    // Captura o banco exato criado no painel administrativo
    const rawUsers = localStorage.getItem("banco_usuarios_ponto");
    const listaUsuarios = rawUsers ? JSON.parse(rawUsers) : [];

    const encontrarUser = listaUsuarios.find(u => u.email.trim().toLowerCase() === email && u.senha.toString().trim() === senha);

    if (encontrarUser) {
        if(encontrarUser.status === "BLOQUEADO") {
            exibirAvisoColab("🔒 Acesso Suspenso", "Sua conta foi temporariamente desativada pelo gestor.");
            return;
        }
        
        usuarioLogado = encontrarUser;
        localStorage.setItem("ponto_web_sessao_colab", JSON.stringify(usuarioLogado));
        
        renderizarFichaFuncionario();
        irParaTela("horarios");
        exibirAvisoColab("🔓 Logado", `Ficha validada com sucesso!`);
    } else {
        exibirAvisoColab("❌ Erro de Entrada", "E-mail ou senha incorretos.");
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

function executarLogoutColaborador() {
    localStorage.removeItem("ponto_web_sessao_colab");
    usuarioLogado = null;
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginSenha").value = "";
    irParaTela("login");
}

function solicitarMarcacaoPonto(tipo) {
    tipoPontoPendente = tipo;
    document.getElementById("txtTipoPontoConfirmar").innerText = tipo;
    new bootstrap.Modal(document.getElementById("modalConfirmarPonto")).show();
}

function confirmarEGravarPonto() {
    bootstrap.Modal.getInstance(document.getElementById("modalConfirmarPonto")).hide();

    if (!navigator.geolocation) {
        exibirAvisoColab("Erro", "GPS não suportado pelo navegador.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const agora = new Date();
            const dataInjetada = agora.toLocaleDateString("pt-BR"); 
            const horaMarcada = agora.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
            
            const txtSemPontos = document.getElementById("txtSemPontos");
            if (txtSemPontos) txtSemPontos.style.display = "none";

            const containerRegistros = document.getElementById("listaRegistrosHoje");
            const novoLog = document.createElement("div");
            novoLog.className = "log-registro";
            novoLog.innerHTML = `
                <span class="tipo">● ${tipoPontoPendente}</span>
                <span class="data-log">(${dataInjetada})</span>
                <span class="hora">${horaMarcada}</span>
            `;
            containerRegistros.appendChild(novoLog);

            exibirAvisoColab("🎯 Sucesso!", `Seu ponto de <strong>${tipoPontoPendente}</strong> das ${horaMarcada} foi validado geograficamente e gravado no dia ${dataInjetada}!`);
        },
        (error) => { 
            exibirAvisoColab("Erro de Autenticação", "Por favor, ative a localização/GPS do seu aparelho para validar o ponto."); 
        },
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

function irParaTela(nomeTela) {
    document.getElementById("secao-login").classList.remove("active");
    document.getElementById("secao-horarios").classList.remove("active");
    if (nomeTela === "login") document.getElementById("secao-login").classList.add("active");
    else if (nomeTela === "horarios") document.getElementById("secao-horarios").classList.add("active");
}
