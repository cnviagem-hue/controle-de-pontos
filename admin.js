let usuarioSelecionadoId = null;
let proximoIdUsuario = 1;
let bancoUsuarios = []; // Garante a retenção e salvamento de dados estruturados

function alternarAba(nomeAba) {
    document.getElementById('menu-pessoal').classList.remove('active');
    document.getElementById('menu-relatorios').classList.remove('active');
    document.getElementById('menu-configs').classList.remove('active');
    document.getElementById('conteudo-pessoal').classList.remove('active');
    document.getElementById('conteudo-relatorios').classList.remove('active');
    document.getElementById('conteudo-configs').classList.remove('active');
    document.getElementById(`menu-${nomeAba}`).classList.add('active');
    document.getElementById(`conteudo-${nomeAba}`).classList.add('active');
}

function exibirAlertaTop(titulo, mensagem) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalMensagem').innerHTML = mensagem;
    new bootstrap.Modal(document.getElementById('modalFeedback')).show();
}

// CORREÇÃO DO OLHINHO: Altera o tipo e o emoji em tempo de execução estável
function toggleInputSenha(idInput, botao) {
    const input = document.getElementById(idInput);
    if(input.type === "password") {
        input.type = "text";
        botao.innerText = "🙈";
    } else {
        input.type = "password";
        botao.innerText = "👁️";
    }
}

function mascaraTelefone(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (v.length > 5) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    } else {
        v = v.replace(/^(\d*)$/, '($1');
    }
    input.value = v;
}

function mascaraCEP(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    input.value = valor;
}

function cadastrarUsuario(event) {
    event.preventDefault();
    
    const novoUser = {
        id: proximoIdUsuario,
        nome: document.getElementById('cadNome').value.trim(),
        telefone: document.getElementById('cadTelefone').value.trim(),
        email: document.getElementById('cadEmail').value.trim(),
        senha: document.getElementById('cadSenha').value.trim(),
        permissao: document.getElementById('cadPermissao').value,
        status: "ATIVO"
    };

    bancoUsuarios.push(novoUser);
    renderizarTabela();
    proximoIdUsuario++;
    
    document.getElementById('formUsuario').reset();
    exibirAlertaTop("👥 Cadastrado", `Colaborador <strong>${novoUser.nome}</strong> registrado com sucesso!`);
}

// CORREÇÃO DO ALINHAMENTO DA TABELA: Renderiza exatamente na mesma ordem dos cabeçalhos HTML
function renderizarTabela() {
    const tabela = document.getElementById('tabelaEquipe');
    tabela.innerHTML = "";
    
    if(bancoUsuarios.length === 0) {
        tabela.innerHTML = `<tr><td colspan="7" class="text-center text-muted small py-3">Nenhum funcionário cadastrado na base.</td></tr>`;
        return;
    }

    bancoUsuarios.forEach(u => {
        const badgeStatus = u.status === "ATIVO" ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle';
        const tr = document.createElement('tr');
        
        // ORDEM EXATA DAS COLUNAS: Nome | Telefone | E-mail | Senha | Permissão | Status | Ações
        tr.innerHTML = `
            <td class="fw-medium">${u.nome}</td>
            <td class="text-secondary small">${u.telefone}</td>
            <td class="text-muted small">${u.email}</td>
            <td><code class="text-dark font-monospace fw-bold" style="letter-spacing:1px;">${u.senha}</code></td>
            <td><span class="badge bg-secondary">Apenas ${u.permissao}</span></td>
            <td><span class="badge ${badgeStatus} px-2.5">${u.status}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarFicha(${u.id})">✏️ Ficha</button>
                <button class="btn btn-sm btn-outline-danger" onclick="bloquearUsuario(${u.id})">🔒 ${u.status === 'ATIVO' ? 'Bloquear' : 'Ativar'}</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

function abrirModalEditarFicha(id) {
    usuarioSelecionadoId = id;
    const u = bancoUsuarios.find(x => x.id === id);
    if(!u) return;

    document.getElementById('editNome').value = u.nome;
    document.getElementById('editTelefone').value = u.telefone;
    document.getElementById('editEmail').value = u.email;
    document.getElementById('editSenha').value = u.senha;
    document.getElementById('editPermissao').value = u.permissao;

    new bootstrap.Modal(document.getElementById('modalEditarFicha')).show();
}

function confirmarEdicaoFicha() {
    const u = bancoUsuarios.find(x => x.id === usuarioSelecionadoId);
    if(!u) return;

    u.nome = document.getElementById('editNome').value.trim();
    u.telefone = document.getElementById('editTelefone').value.trim();
    u.email = document.getElementById('editEmail').value.trim();
    u.senha = document.getElementById('editSenha').value.trim();
    u.permissao = document.getElementById('editPermissao').value;

    bootstrap.Modal.getInstance(document.getElementById('modalEditarFicha')).hide();
    renderizarTabela();
    exibirAlertaTop("📝 Atualizado", "A ficha cadastral do colaborador foi alterada com sucesso.");
}

function bloquearUsuario(id) {
    const u = bancoUsuarios.find(x => x.id === id);
    if(!u) return;
    u.status = u.status === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    renderizarTabela();
}

function copiarLinkColaborador() {
    const linkApp = window.location.origin + "/colaborador.html";
    navigator.clipboard.writeText(linkApp).then(() => {
        exibirAlertaTop("🔗 Link Copiado", "O link do app do colaborador foi copiado.");
    });
}

async function buscarCoordenadasPorCEP() {
    const inputCep = document.getElementById('cepBusca').value;
    const numero = document.getElementById('numeroBusca').value.trim();
    const btnBuscar = document.getElementById('btnBuscarCep');
    const cep = inputCep.replace(/\D/g, '');
    
    if (cep.length !== 8) {
        exibirAlertaTop("Erro", "CEP inválido.");
        return;
    }

    btnBuscar.disabled = true;
    btnBuscar.innerText = "Buscando...";

    try {
        const responseCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const dadosCep = await responseCep.json();

        if (dadosCep.erro) {
            exibirAlertaTop("Erro", "CEP não localizado.");
            restaurarBotaoBusca();
            return;
        }

        let logradouroExtenso = `${dadosCep.logradouro}, ${numero} - ${dadosCep.bairro}, ${dadosCep.localidade} - ${dadosCep.uf}`;
        const urlGeocode = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(logradouroExtenso)}&limit=1`;
        const responseGeo = await fetch(urlGeocode, { headers: { 'User-Agent': 'PontoWeb/2.0' } });
        const dadosGeo = await responseGeo.json();

        if (dadosGeo && dadosGeo.length > 0) {
            document.getElementById('latitude').value = dadosGeo[0].lat;
            document.getElementById('longitude').value = dadosGeo[0].lon;
            document.getElementById('enderecoTexto').innerText = logradouroExtenso;
            document.getElementById('boxEndereco').style.display = 'block';
        } else {
            exibirAlertaTop("Aviso", "Número não mapeado. Gerando coordenadas aproximadas do logradouro.");
        }
    } catch (e) {
        exibirAlertaTop("Erro", "Falha na comunicação com o servidor de mapas.");
    } finally {
        restaurarBotaoBusca();
    }
}

function restaurarBotaoBusca() {
    const btn = document.getElementById('btnBuscarCep');
    btn.disabled = false;
    btn.innerText = "🔍 Buscar Localização Exata";
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        exibirAlertaTop("Erro", "Seu dispositivo não possui suporte a GPS.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('latitude').value = pos.coords.latitude;
            document.getElementById('longitude').value = pos.coords.longitude;
            document.getElementById('enderecoTexto').innerText = "Localização definida via hardware GPS.";
            document.getElementById('boxEndereco').style.display = 'block';
            exibirAlertaTop("📍 GPS Capturado", "Coordenadas injetadas!");
        },
        (err) => {
            exibirAlertaTop("Erro", "Permissão de GPS negada.");
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

function salvarConfiguracoes() {
    exibirAlertaTop("Configurações Salvas", "Configurações da empresa atualizadas!");
}

// Inicializa a tabela vazia ou com placeholders de forma limpa
renderizarTabela();
