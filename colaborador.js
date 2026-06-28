let usuarioLogado = null;

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

function exibirAvisoColab(titulo, mensagem) {
    document.getElementById("modalColabTitulo").innerText = titulo;
    document.getElementById("modalColabMensagem").innerHTML = mensagem;
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

function executarLoginColaborador(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const senha = document.getElementById("loginSenha").value.trim();

    const rawUsers = localStorage.getItem("banco_usuarios_ponto");
    const listaUsuarios = rawUsers ? JSON.parse(rawUsers) : [];

    const encontrarUser = listaUsuarios.find(u => u.email.toLowerCase() === email && u.senha === senha);

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
        <div class="text-center mt-3">
            <img src="${usuarioLogado.foto}" style="width: 85px; height: 85px; border-radius: 50%; object-fit: cover; border: 3px solid #f97316; margin-bottom: 10px;" onerror="this.src='https://ui-avatars.com/api/?name=User'">
            <h5 class="mb-0 text-dark fw-bold">${usuarioLogado.nome}</h5>
            <p class="text-muted small mb-0">CPF: ${usuarioLogado.cpf}</p>
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

function tentarRegistrarPonto() {
    if (!navigator.geolocation) {
        exibirAvisoColab("Erro", "GPS não suportado.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const agora = new Date();
            const horaMarcada = agora.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
            const txtSemPontos = document.getElementById("txtSemPontos");
            if (txtSemPontos) txtSemPontos.style.display = "none";

            const containerRegistros = document.getElementById("listaRegistrosHoje");
            const novoLog = document.createElement("div");
            novoLog.className = "log-registro";
            novoLog.innerHTML = `<strong>✔ Marcado:</strong> ${horaMarcada} - Validação geográfica ativa.`;
            containerRegistros.appendChild(novoLog);

            exibirAvisoColab("🎯 Sucesso!", `Ponto das ${horaMarcada} registrado!`);
        },
        (error) => { exibirAvisoColab("Erro", "Ative a localização do aparelho."); },
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

function irParaTela(nomeTela) {
    document.getElementById("secao-login").classList.remove("active");
    document.getElementById("secao-horarios").classList.remove("active");
    if (nomeTela === "login") document.getElementById("secao-login").classList.add("active");
    else if (nomeTela === "horarios") document.getElementById("secao-horarios").classList.add("active");
}
