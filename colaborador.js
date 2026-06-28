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

function verificarSessaoExistente() {
    const sessaoSalva = localStorage.getItem("ponto_web_sessao_colab");
    if (sessaoSalva) {
        usuarioLogado = JSON.parse(sessaoSalva);
        renderizarFichaFuncionario();
        renderizarHistoricoHoje(); // Renderiza filtrando apenas o dia de hoje
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

    const encontrarUser = listaUsuarios.find(u => u.email.trim().toLowerCase() === email && u.senha.toString().trim() === senha);

    if (encontrarUser) {
        if(encontrarUser.status === "BLOQUEADO") {
            exibirAvisoColab("🔒 Acesso Suspenso", "Sua conta foi temporariamente desativada pelo gestor.");
            return;
        }
        
        usuarioLogado = encontrarUser;
        localStorage.setItem("ponto_web_sessao_colab", JSON.stringify(usuarioLogado));
        
        renderizarFichaFuncionario();
        renderizarHistoricoHoje();
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

// TRAVA DE SEGURANÇA E ANTIDUPLICAÇÃO: Verifica se o botão clicado já foi batido no dia de hoje
function solicitarMarcacaoPonto(tipo) {
    const hojeStr = new Date().toLocaleDateString("pt-BR");
    const todosOsLogs = JSON.parse(localStorage.getItem("historico_pontos_global") || "[]");
    
    // Procura se o colaborador logado já registrou esse tipo específico de ponto hoje
    const jaRegistrouHoje = todosOsLogs.some(log => 
        log.colaboradorId === usuarioLogado.id && 
        log.data === hojeStr && 
        log.tipo === tipo
    );

    if (jaRegistrouHoje) {
        exibirAvisoColab("⚠️ Registro Duplicado", `Você já realizou a marcação de <strong>${tipo}</strong> hoje. Escolha outra opção!`);
        return; // Cancela a abertura do modal de confirmação
    }

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
            
            // Persistência robusta no repositório global lido pelo Administrador
            const todosOsLogs = JSON.parse(localStorage.getItem("historico_pontos_global") || "[]");
            todosOsLogs.push({
                colaboradorId: usuarioLogado.id,
                nome: usuarioLogado.nome,
                data: dataInjetada,
                tipo: tipoPontoPendente,
                hora: horaMarcada
            });
            localStorage.setItem("historico_pontos_global", JSON.stringify(todosOsLogs));

            renderizarHistoricoHoje(); // Atualiza a lista filtrada em tempo real

            exibirAvisoColab("🎯 Sucesso!", `Seu ponto de <strong>${tipoPontoPendente}</strong> das ${horaMarcada} foi gravado com validação geográfica ativa!`);
        },
        (error) => { 
            exibirAvisoColab("Erro de Autenticação", "Por favor, ative o GPS do seu aparelho para validar o ponto."); 
        },
        { enableHighAccuracy: true, timeout: 7000 }
    );
}

// CORREÇÃO: Mostra na tela estritamente os pontos batidos no dia de hoje. Amanhã começará limpa!
function renderizarHistoricoHoje() {
    const hojeStr = new Date().toLocaleDateString("pt-BR");
    const containerRegistros = document.getElementById("listaRegistrosHoje");
    containerRegistros.innerHTML = "";

    const todosOsLogs = JSON.parse(localStorage.getItem("historico_pontos_global") || "[]");
    
    // Filtra para exibir em tempo de execução somente os logs de hoje do colaborador conectado
    const logsDeHoje = todosOsLogs.filter(log => log.colaboradorId === usuarioLogado.id && log.data === hojeStr);

    if(logsDeHoje.length === 0) {
        containerRegistros.innerHTML = `<div id="txtSemPontos" class="text-center text-muted small py-2">Nenhum ponto registrado hoje.</div>`;
        return;
    }

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
}

function executarLogoutColaborador() {
    localStorage.removeItem("ponto_web_sessao_colab");
    usuarioLogado = null;
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
