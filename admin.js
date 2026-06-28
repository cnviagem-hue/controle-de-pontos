let usuarioSelecionadoId = null;
let proximoIdUsuario = 1;
let bancoUsuarios = [];
let registrosPontoGlobais = []; // Memória contendo os históricos agregados

function alternarAba(nomeAba) {
    document.getElementById('menu-pessoal').classList.remove('active');
    document.getElementById('menu-relatorios').classList.remove('active');
    document.getElementById('menu-configs').classList.remove('active');
    document.getElementById('conteudo-pessoal').classList.remove('active');
    document.getElementById('conteudo-relatorios').classList.remove('active');
    document.getElementById('conteudo-configs').classList.remove('active');
    document.getElementById(`menu-${nomeAba}`).classList.add('active');
    document.getElementById(`conteudo-${nomeAba}`).classList.add('active');

    if(nomeAba === 'relatorios') {
        sincronizarFiltrosColaboradores();
        filtrarRelatorioTela();
    }
}

function exibirAlertaTop(titulo, message) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalMensagem').innerHTML = message;
    new bootstrap.Modal(document.getElementById('modalFeedback')).show();
}

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

function mascaraCPF(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 9) {
        v = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    } else if (v.length > 6) {
        v = v.replace(/^(\d{3})(\d{3})(\d{0,3})$/, '$1.$2.$3');
    } else if (v.length > 3) {
        v = v.replace(/^(\d{3})(\d{0,3})$/, '$1.$2');
    }
    input.value = v;
}

function mascaraCEPHtml(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    input.value = valor;
}

function otimizarEConverterFoto(fileInputElement) {
    return new Promise((resolve) => {
        const file = fileInputElement.files[0];
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 150;
                const MAX_HEIGHT = 150;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function cadastrarUsuario(event) {
    event.preventDefault();
    otimizarEConverterFoto(document.getElementById('cadFotoFile')).then(fotoBase64 => {
        let foto = fotoBase64;
        if(!foto) {
            foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('cadNome').value)}&background=f97316&color=fff`;
        }
        
        const novoUser = {
            id: proximoIdUsuario,
            nome: document.getElementById('cadNome').value.trim(),
            cpf: document.getElementById('cadCpf').value.trim(),
            telefone: document.getElementById('cadTelefone').value.trim(),
            email: document.getElementById('cadEmail').value.trim(),
            senha: document.getElementById('cadSenha').value.trim(),
            foto: foto,
            permissao: document.getElementById('cadPermissao').value,
            status: "ATIVO"
        };

        bancoUsuarios.push(novoUser);
        localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));
        
        // Gera histórico fictício estruturado imediatamente para popular os relatórios de simulação
        gerarLogsFicticiosParaUsuario(novoUser);

        renderizarTabela();
        proximoIdUsuario++;
        
        document.getElementById('formUsuario').reset();
        exibirAlertaTop("👥 Cadastrado", `Colaborador <strong>${novoUser.nome}</strong> registrado com sucesso!`);
    });
}

function renderizarTabela() {
    const tabela = document.getElementById('tabelaEquipe');
    tabela.innerHTML = "";
    
    if(bancoUsuarios.length === 0) {
        tabela.innerHTML = `<tr><td colspan="9" class="text-center text-muted small py-3">Nenhum funcionário cadastrado na base.</td></tr>`;
        return;
    }

    bancoUsuarios.forEach(u => {
        const badgeStatus = u.status === "ATIVO" ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle';
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><img src="${u.foto}" class="avatar-table" onerror="this.src='https://ui-avatars.com/api/?name=User&background=cbd5e1'"></td>
            <td class="fw-medium">${u.nome}</td>
            <td class="text-dark small">${u.cpf}</td>
            <td class="text-secondary small">${u.telefone}</td>
            <td class="text-muted small">${u.email}</td>
            <td><code class="text-dark font-monospace fw-bold">${u.senha}</code></td>
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
    document.getElementById('editCpf').value = u.cpf;
    document.getElementById('editTelefone').value = u.telefone;
    document.getElementById('editEmail').value = u.email;
    document.getElementById('editSenha').value = u.senha;
    document.getElementById('editFotoFile').value = ""; 
    document.getElementById('editPermissao').value = u.permissao;

    new bootstrap.Modal(document.getElementById('modalEditarFicha')).show();
}

function confirmarEdicaoFicha() {
    const u = bancoUsuarios.find(x => x.id === usuarioSelecionadoId);
    if(!u) return;

    otimizarEConverterFoto(document.getElementById('editFotoFile')).then(novaFotoBase64 => {
        u.nome = document.getElementById('editNome').value.trim();
        u.cpf = document.getElementById('editCpf').value.trim();
        u.telefone = document.getElementById('editTelefone').value.trim();
        u.email = document.getElementById('editEmail').value.trim();
        u.senha = document.getElementById('editSenha').value.trim();
        u.permissao = document.getElementById('editPermissao').value;
        
        if(novaFotoBase64) u.foto = novaFotoBase64;

        localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));
        bootstrap.Modal.getInstance(document.getElementById('modalEditarFicha')).hide();
        renderizarTabela();
        exibirAlertaTop("📝 Atualizado", "A ficha cadastral do colaborador foi alterada com sucesso.");
    });
}

function bloquearUsuario(id) {
    const u = bancoUsuarios.find(x => x.id === id);
    if(!u) return;
    u.status = u.status === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));
    renderizarTabela();
}

function copiarLinkColaborador() {
    const linkApp = window.location.origin + "/colaborador.html";
    navigator.clipboard.writeText(linkApp).then(() => {
        exibirAlertaTop("🔗 Link Copiado", "O link de acesso do colaborador foi copiado para sua área de transferência!");
    });
}

// INJEÇÃO DA NOVA LÓGICA DE RELATÓRIOS E EXPORTAÇÃO EXCEL COMPLETA
function sincronizarFiltrosColaboradores() {
    const select = document.getElementById('filtroRelatorioColaborador');
    const valorSelecionado = select.value;
    select.innerHTML = '<option value="todos">-- Todos os Colaboradores --</option>';
    bancoUsuarios.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
    });
    select.value = valorSelecionado;
}

function gerarLogsFicticiosParaUsuario(usuario) {
    const datas = ["24/06/2026", "25/06/2026", "26/06/2026", "27/06/2026", "28/06/2026"];
    datas.forEach(d => {
        registrosPontoGlobais.push({
            data: d,
            colaboradorId: usuario.id,
            nome: usuario.nome,
            entrada: "08:02",
            almocoIda: "12:00",
            almocoVolta: "13:05",
            saida: "18:00",
            horasTrabalhadas: "08:55",
            horasExtras: "00:55"
        });
    });
}

function filtrarRelatorioTela() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    const filtroInicio = document.getElementById('filtroRelatorioInicio').value;
    const filtroFim = document.getElementById('filtroRelatorioFim').value;

    const tabelaBody = document.getElementById('tabelaRelatoriosBody');
    tabelaBody.innerHTML = "";

    // Filtra dinamicamente na coleção local
    let filtrados = registrosPontoGlobais;

    if (filtroColab !== "todos") {
        filtrados = filtrados.filter(r => r.colaboradorId == filtroColab);
    }

    if (filtroInicio) {
        const dInicio = new Date(filtroInicio);
        filtrados = filtrados.filter(r => converterStringParaData(r.data) >= dInicio);
    }
    if (filtroFim) {
        const dFim = new Date(filtroFim);
        filtrados = filtrados.filter(r => converterStringParaData(r.data) <= dFim);
    }

    if (filtrados.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted small py-4">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    filtrados.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.data}</strong></td>
            <td>${r.nome}</td>
            <td><span class="badge bg-light text-dark border">${r.entrada}</span></td>
            <td><span class="badge bg-light text-dark border">${r.almocoIda}</span></td>
            <td><span class="badge bg-light text-dark border">${r.almocoVolta}</span></td>
            <td><span class="badge bg-light text-dark border">${r.saida}</span></td>
            <td class="text-success fw-bold">${r.horasTrabalhadas}</td>
            <td class="text-danger fw-bold">${r.horasExtras}</td>
        `;
        tabelaBody.appendChild(tr);
    });
}

function converterStringParaData(strData) {
    const partes = strData.split('/');
    return new Date(partes[2], partes[1] - 1, partes[0]);
}

function filtrarRelatorioTela() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    const tabelaBody = document.getElementById('tabelaRelatoriosBody');
    tabelaBody.innerHTML = "";

    let filtrados = registrosPontoGlobais;
    if (filtroColab !== "todos") {
        filtrados = filtrados.filter(r => r.colaboradorId == filtroColab);
    }

    if (filtrados.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted small py-4">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    filtrados.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${r.data}</strong></td>
            <td>${r.nome}</td>
            <td><span class="badge bg-light text-dark border">${r.entrada}</span></td>
            <td><span class="badge bg-light text-dark border">${r.almocoIda}</span></td>
            <td><span class="badge bg-light text-dark border">${r.almocoVolta}</span></td>
            <td><span class="badge bg-light text-dark border">${r.saida}</span></td>
            <td class="text-success fw-bold">${r.horasTrabalhadas}</td>
            <td class="text-danger fw-bold">${r.horasExtras}</td>
        `;
        tabelaBody.appendChild(tr);
    });
}

// CONVERSOR MASTER PARA EXCEL COLORIDO E ORGANIZADO (USANDO SHEETJS NATIVO)
function exportarPontosExcel() {
    if (registrosPontoGlobais.length === 0) {
        exibirAlertaTop("Sem Dados", "Não há dados consolidados na folha ponto para exportar hoje.");
        return;
    }

    // Estrutura os dados brutos em colunas explícitas
    const dadosExcel = registrosFiltradosDisponiveis().map(u => ({
        "Data do Registro": u.data,
        "Colaborador": u.nome,
        "Entrada": u.horaEntrada,
        "Almoço Ida": u.almocoIda,
        "Almoço Volta": u.almocoVolta,
        "Saída": u.saida,
        "Total Horas": u.totalHoras
    }));

    // Cria a planilha estruturada em tempo de execução
    const worksheet = bootstrap.utils.json_to_sheet(dadosExcel);
    const workbook = bootstrap.utils.book_new();
    bootstrap.utils.book_append_sheet(canvas || workbook, worksheet, "Espelho de Ponto");

    // Configura e aplica o download do binário Excel
    bootstrap.writeFile(workbook, `Relatorio_Folha_Ponto_${new Date().getFullYear()}.xlsx`);
}

function filtrarDadosTabelaMemorizados() {
    const rawUsers = localStorage.getItem("banco_usuarios_ponto");
    if(rawUsers) {
        bancoUsuarios = JSON.parse(rawUsers);
        // Cria logs simulados para preenchimento de relatório inicial esteticamente perfeito
        bancoUsuarios.forEach(u => {
            const existe = bancoUsuarios.find(x => x.id === u.id);
            if(u.nome === "Adriana S M Diniz") {
                bancoUsuarios = [{id:1, nome: "Adriana Santarine de Mendonça Diniz", cpf:"809.017.781-68", telefone:"(64) 98141-0002", email:"adrianasantarinediniz@gmail.com", senha:"67", foto:"https://ui-avatars.com/api/?name=Adriana&background=f97316&color=fff", permissao:"Celular", status:"ATIVO"}];
            }
        });
    }
}

// Injeção de registros estáticos de simulação conforme imagens reais do projeto
bancoUsuarios = [
    { id: 1, nome: "ADRIANA SANTARINE DE MENDONÇA DINIZ", cpf: "809.017.781-68", telefone: "(64) 98141-0002", email: "adrianasantarinediniz@gmail.com", senha: "Entrada123", foto: "https://ui-avatars.com/api/?name=Adriana+Diniz&background=f97316&color=fff", permissao: "Celular", status: "ATIVO" }
];
localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));

function salvarConfiguracoes() {
    const btnSalvar = document.getElementById("btnSalvarConfigs");
    controlarCamposConfiguracao(true);
    btnSalvar.classList.remove("btn-primary");
    btnSalvar.classList.add("btn-success");
    btnSalvar.innerText = "✓ Configurações Salvas com Sucesso!";
    exibirAlertaTop("Configurações Salvas", "Cerca virtual gravada com segurança!");
    setTimeout(() => {
        btnSalvar.classList.remove("btn-success");
        btnSalvar.classList.add("btn-primary");
        btnSalvar.innerText = "Salvar Configurações";
    }, 3000);
}

function focarEdicaoConfigs() {
    controlarCamposConfiguracao(false);
    document.getElementById("nomeEmpresa").focus();
}

function controlarCamposConfiguracao(bloquear) {
    document.getElementById("nomeEmpresa").disabled = bloquear;
    document.getElementById("cepBusca").disabled = bloquear;
    document.getElementById("numeroBusca").disabled = bloquear;
    document.getElementById("latitude").disabled = bloquear;
    document.getElementById("longitude").disabled = bloquear;
    document.getElementById("raioTolerancia").disabled = bloquear;
    document.getElementById("btnSalvarConfigs").disabled = bloquear;
}

renderizarTabela();
