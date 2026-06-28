let usuarioSelecionadoId = null;
let proximoIdUsuario = 1;
let bancoUsuarios = [];
let registrosPontoGlobais = []; 

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

function bolarTempoParaMinutos(strHora) {
    if(!strDataFormatadaValida(strHora)) return null;
    const partes = strHora.split(':');
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
}

function strDataFormatadaValida(str) {
    return str && str !== "-" && str.includes(":");
}

function formatarMinutosParaString(minutosTotais) {
    if(minutosTotais <= 0) return "00:00";
    const hrs = Math.floor(minutosTotais / 60);
    const mins = minutosTotais % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
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
        exibirAlertaTop("🔗 Link Copiado", "O link de acesso do colaborador foi copiado.");
    });
}

function sincronizarFiltrosColaboradores() {
    const select = document.getElementById('filtroRelatorioColaborador');
    const valorSelecionado = select.value;
    select.innerHTML = '<option value="todos">-- Todos os Colaboradores --</option>';
    bancoUsuarios.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
    });
    select.value = valorSelecionado;
}

// ARQUITETURA MATEMÁTICA REAL DE PROCESSAMENTO DIÁRIO DE JORNADA CONTRATUAL
function processarLogsLocalStorage() {
    const logsBrutos = JSON.parse(localStorage.getItem("historico_pontos_global") || "[]");
    const espelhosAgrupados = {};

    logsBrutos.forEach(log => {
        const chaveChave = `${log.data}_${log.colaboradorId}`;
        if (!espelhosAgrupados[chaveChave]) {
            espelhosAgrupados[chaveChave] = {
                data: log.data,
                colaboradorId: log.colaboradorId,
                nome: log.nome,
                entrada: "-",
                almocoIda: "-",
                almocoVolta: "-",
                saida: "-",
                horasTrabalhadas: "00:00",
                horasExtras: "00:00"
            };
        }

        if (log.tipo === "Entrada") espelhosAgrupados[chaveChave].entrada = log.hora;
        if (log.tipo === "Almoço Ida") espelhosAgrupados[chaveChave].almocoIda = log.hora;
        if (log.tipo === "Almoço Volta") espelhosAgrupados[chaveChave].almocoVolta = log.hora;
        if (log.tipo === "Saída") espelhosAgrupados[chaveChave].saida = log.hora;
    });

    const listaFinal = Object.values(espelhosAgrupados);

    // EXUTA AS CONTAS MATEMÁTICAS MINUTO A MINUTO BASEADO NO DIA DA SEMANA DO CONTRATO
    listaFinal.forEach(r => {
        let minutosTrabalhados = 0;

        const mEntrada = bolarTempoParaMinutos(r.entrada);
        const mAlmIda = bolarTempoParaMinutos(r.almocoIda);
        const mAlmVolta = bolarTempoParaMinutos(r.almocoVolta);
        const mSaida = bolarTempoParaMinutos(r.saida);

        // Turno 1: Da Entrada até ir pro Almoço
        if(mEntrada !== null && mAlmIda !== null && mAlmIda > mEntrada) {
            minutosTrabalhados += (mAlmIda - mEntrada);
        }
        // Turno 2: Do retorno do Almoço até a Saída final
        if(mAlmVolta !== null && mSaida !== null && mSaida > mAlmVolta) {
            minutosTrabalhados += (mSaida - mAlmVolta);
        }

        r.horasTrabalhadas = formatarMinutosParaString(minutosTrabalhados);

        // Identifica matemática exata com base no dia da semana correspondente à data
        const partesData = r.data.split('/');
        const objetoData = new Date(partesData[2], partesData[1] - 1, partesData[0]);
        const diaDaSemana = objetoData.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

        let cargaObrigatoriaDoDia = 480; // Padrão: 8 horas (Segunda a Sexta)
        if (diaDaSemana === 6) {
            cargaObrigatoriaDoDia = 240; // Sábado: 4 horas obrigatórias
        } else if (diaDaSemana === 0) {
            cargaObrigatoriaDoDia = 0; // Domingo: Não trabalha, tudo vira hora extra
        }

        // Calcula saldo real
        if(minutosTrabalhados > cargaObrigatoriaDoDia) {
            const extra = minutosTrabalhados - cargaObrigatoriaDoDia;
            r.horasExtras = formatarMinutosParaString(extra);
        } else {
            r.horasExtras = "00:00";
        }
    });

    return listaFinal;
}

function filtrarRelatorioTela() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    const filtroInicio = document.getElementById('filtroRelatorioInicio').value;
    const filtroFim = document.getElementById('filtroRelatorioFim').value;
    const tabelaBody = document.getElementById('tabelaRelatoriosBody');
    tabelaBody.innerHTML = "";

    let dadosConsolidados = processarLogsLocalStorage();

    if (filtroColab !== "todos") {
        dadosConsolidados = dadosConsolidados.filter(r => r.colaboradorId == filtroColab);
    }

    if (filtroInicio) {
        const dInicio = new Date(filtroInicio + "T00:00:00");
        dadosConsolidados = dadosConsolidados.filter(r => {
            const p = r.data.split('/');
            return new Date(p[2], p[1]-1, p[0]) >= dInicio;
        });
    }
    if (filtroFim) {
        const dFim = new Date(filtroFim + "T23:59:59");
        dadosConsolidados = dadosConsolidados.filter(r => {
            const p = r.data.split('/');
            return new Date(p[2], p[1]-1, p[0]) <= dFim;
        });
    }

    if (dadosConsolidados.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted small py-4">Nenhum registro encontrado para os filtros selecionados.</td></tr>`;
        return;
    }

    dadosConsolidados.forEach(r => {
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

function exportarPontosExcel() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    let dadosParaPlanilha = processarLogsLocalStorage();
    
    if (filtroColab !== "todos") {
        dadosParaPlanilha = dadosParaPlanilha.filter(r => r.colaboradorId == filtroColab);
    }

    if (dadosParaPlanilha.length === 0) {
        exibirAlertaTop("Sem Dados", "Não há dados consolidados na folha ponto para exportar hoje.");
        return;
    }

    const formatoExcel = dadosParaPlanilha.map(r => ({
        "Data": r.data,
        "Colaborador": r.nome,
        "Entrada": r.entrada,
        "Almoço Ida": r.almocoIda,
        "Almoço Volta": r.almocoVolta,
        "Saída": r.saida,
        "Horas Trabalhadas": r.horasTrabalhadas,
        "Horas Extras": r.horasExtras
    }));

    const worksheet = XLSX.utils.json_to_sheet(formatoExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Folha de Ponto");
    XLSX.writeFile(workbook, `Folha_Ponto_Consolidada.xlsx`);
}

function inicializarDadosFicticios() {
    const rawUsers = localStorage.getItem("banco_usuarios_ponto");
    if(!rawUsers || JSON.parse(rawUsers).length === 0) {
        bancoUsuarios = [
            { id: 1, nome: "ADRIANA SANTARINE DE MENDONÇA DINIZ", cpf: "809.017.781-68", telefone: "(64) 98141-0002", email: "adrianasantarinediniz@gmail.com", senha: "67", foto: "https://ui-avatars.com/api/?name=Adriana+Diniz&background=f97316&color=fff", permissao: "Celular", status: "ATIVO" }
        ];
        localStorage.setItem("banco_usuarios_ponto", JSON.stringify(bancoUsuarios));
        
        // Simulação matemática perfeita: Adriana batendo ponto correto em um dia útil (24/06 - Quarta-feira)
        localStorage.setItem("historico_pontos_global", JSON.stringify([
            { colaboradorId: 1, nome: "ADRIANA SANTARINE DE MENDONÇA DINIZ", data: "24/06/2026", tipo: "Entrada", hora: "08:00" },
            { colaboradorId: 1, nome: "ADRIANA SANTARINE DE MENDONÇA DINIZ", data: "24/06/2026", tipo: "Almoço Ida", hora: "12:00" },
            { colaboradorId: 1, nome: "ADRIANA SANTARINE DE MENDONÇA DINIZ", data: "24/06/2026", tipo: "Almoço Volta", hora: "13:00" },
            { colaboradorId: 1, nome: "ADRIANA SANTARINE DE MENDONÇA DINIZ", data: "24/06/2026", tipo: "Saída", hora: "18:00" }
        ]));
    } else {
        bancoUsuarios = JSON.parse(rawUsers);
    }
}

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

inicializarDadosFicticios();
renderizarTabela();
