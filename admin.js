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

let PREFIXO_EMPRESA = sessionStorage.getItem("email_empresa_ativa"); 

let usuarioSelecionadoId = null;
let bancoUsuarios = [];
let dadosEmpresaAtiva = {};

document.addEventListener("DOMContentLoaded", async () => {
    if (!sessionStorage.getItem("admin_autenticado") || !PREFIXO_EMPRESA) {
        window.location.href = "login-admin.html"; 
        return;
    }

    if (localStorage.getItem("ponto_web_sidebar_collapsed") === "true") {
        const sidebar = document.getElementById("sidebarMenu");
        const mainContent = document.getElementById("mainContentContainer");
        const btn = document.getElementById("btnToggleSidebar");
        if (sidebar && mainContent) {
            sidebar.classList.add("collapsed");
            mainContent.classList.add("expanded");
            if (btn) btn.innerText = "▶";
        }
    }

    try {
        try {
            const snapAtual = await db.collection("empresas_clientes").where("email", "==", PREFIXO_EMPRESA).get();
            if (!snapAtual.empty) {
                dadosEmpresaAtiva = snapAtual.docs[0].data();
                const cnpjAtual = dadosEmpresaAtiva.cnpj;
                const snapTodos = await db.collection("empresas_clientes").where("cnpj", "==", cnpjAtual).get();
                let contasVinculadas = [];
                snapTodos.forEach(doc => contasVinculadas.push(doc.data()));

                contasVinculadas.sort((a, b) => {
                    const tempoA = a.timestamp && typeof a.timestamp.toMillis === 'function' ? a.timestamp.toMillis() : 0;
                    const tempoB = b.timestamp && typeof b.timestamp.toMillis === 'function' ? b.timestamp.toMillis() : 0;
                    return tempoA - tempoB;
                });

                if (contasVinculadas.length > 0) {
                    PREFIXO_EMPRESA = contasVinculadas[0].email;
                    dadosEmpresaAtiva = contasVinculadas[0];
                }
            }
        } catch(error) {
            console.error("Erro ao sincronizar matriz e filiais:", error);
        }

        const nomeEmpresaSalvo = sessionStorage.getItem("nome_empresa_ativa");
        document.getElementById("sidebarNomeEmpresa").innerText = nomeEmpresaSalvo ? nomeEmpresaSalvo : (dadosEmpresaAtiva.nome || "Empresa Parceira");
        
        await carregarConfigsNuvem();
        await carregarUsuariosDaNuvem();

    } catch (e) {
        console.error("Erro critico de carregamento da tela:", e);
        document.getElementById("sidebarNomeEmpresa").innerText = "Modo de Segurança";
    }
function toggleSidebarMenu() {
    const sidebar = document.getElementById("sidebarMenu");
    const mainContent = document.getElementById("mainContentContainer");
    const btn = document.getElementById("btnToggleSidebar");
    if (!sidebar || !mainContent) return;

    sidebar.classList.toggle("collapsed");
    mainContent.classList.toggle("expanded");

    const isCollapsed = sidebar.classList.contains("collapsed");
    if (btn) btn.innerText = isCollapsed ? "▶" : "◀";
    localStorage.setItem("ponto_web_sidebar_collapsed", isCollapsed ? "true" : "false");
}

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
    }
}

function exibirAlertaTop(titulo, message) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalMensagem').innerHTML = `<p class="fs-6 text-secondary mb-0">${message}</p>`;
    document.getElementById('modalFeedbackFooter').innerHTML = `<button type="button" class="btn btn-primary px-4 btn-sm" data-bs-dismiss="modal">OK</button>`;
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

function mascaraPIS(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 10) {
        v = v.replace(/^(\d{3})(\d{5})(\d{2})(\d{1})$/, '$1.$2.$3-$4');
    } else if (v.length > 8) {
        v = v.replace(/^(\d{3})(\d{5})(\d{0,2})$/, '$1.$2.$3');
    } else if (v.length > 3) {
        v = v.replace(/^(\d{3})(\d{0,5})$/, '$1.$2');
    }
    input.value = v;
}

function mascaraCEPHtml(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    input.value = valor;
}

function fazerLogout() {
    sessionStorage.clear();
    window.location.href = "login-admin.html";
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

async function carregarUsuariosDaNuvem() {
    const tabela = document.getElementById('tabelaEquipe');
    if(tabela) tabela.innerHTML = `<tr><td colspan="14" class="text-center text-muted small py-3">⏳ Carregando dados da Nuvem...</td></tr>`;
    
    try {
        const snapshot = await db.collection("usuarios_ponto").where("empresaEmail", "==", PREFIXO_EMPRESA).get();
        bancoUsuarios = [];
        snapshot.forEach(doc => {
            bancoUsuarios.push({ firebaseId: doc.id, ...doc.data() });
        });
        renderTabelaComAtualizacao();
        sincronizarFiltrosColaboradores();
    } catch (error) {
        if(tabela) tabela.innerHTML = `<tr><td colspan="14" class="text-center text-danger small py-3">⚠️ Erro ao carregar equipe.</td></tr>`;
    }
}

async function cadastrarUsuario(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById("btnSalvarUsuario");
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = "⏳ Salvando...";

    otimizarEConverterFoto(document.getElementById('cadFotoFile')).then(async (fotoBase64) => {
        let foto = fotoBase64;
        if(!foto) {
            foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(document.getElementById('cadNome').value)}&background=f97316&color=fff`;
        }
        
        const novoUser = {
            id: String(new Date().getTime()), 
            empresaEmail: PREFIXO_EMPRESA, 
            nome: document.getElementById('cadNome').value.trim(),
            cpf: document.getElementById('cadCpf').value.trim(),
            cargo: document.getElementById('cadCargo').value.trim() || "-",
            funcao: document.getElementById('cadFuncao').value.trim() || "-",
            pis: document.getElementById('cadPis').value.trim() || "-",
            ctps: document.getElementById('cadCtps').value.trim() || "-",
            dataInicio: document.getElementById('cadDataInicio').value.trim() || "-",
            horasSegSex: document.getElementById('cadHorasSegSex').value.trim() || "-",
            horasSab: document.getElementById('cadHorasSab').value.trim() || "-",
            telefone: document.getElementById('cadTelefone').value.trim(),
            email: document.getElementById('cadEmail').value.trim().toLowerCase(),
            senha: document.getElementById('cadSenha').value.trim(),
            foto: foto,
            permissao: document.getElementById('cadPermissao').value,
            status: "ATIVO",
            cargaSegSex: document.getElementById('cadCargaSegSex').value || "08:00",
            cargaSab: document.getElementById('cadCargaSab').value || "04:00",
            cargaDom: document.getElementById('cadCargaDom').value || "00:00"
        };

        try {
            const docRef = await db.collection("usuarios_ponto").add(novoUser);
            bancoUsuarios.push({ firebaseId: docRef.id, ...novoUser });
            
            renderTabelaComAtualizacao();
            sincronizarFiltrosColaboradores();
            
            document.getElementById('formUsuario').reset();
            document.getElementById('cadCargaSegSex').value = "08:00";
            document.getElementById('cadCargaSab').value = "04:00";
            document.getElementById('cadCargaDom').value = "00:00";

            exibirAlertaTop("☁️ Salvo na Nuvem", `Colaborador <strong>${novoUser.nome}</strong> registrado globalmente!`);
        } catch (error) {
            exibirAlertaTop("⚠️ Erro", "Falha ao gravar colaborador na nuvem.");
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = "➕ Cadastrar Usuário";
        }
    });
}

function renderTabelaComAtualizacao() {
    const tabela = document.getElementById('tabelaEquipe');
    if(!tabela) return;
    tabela.innerHTML = "";
    
    if(bancoUsuarios.length === 0) {
        tabela.innerHTML = `<tr><td colspan="14" class="text-center text-muted small py-3">Nenhum funcionário cadastrado.</td></tr>`;
        return;
    }

    bancoUsuarios.forEach((u, index) => {
        const badgeStatus = u.status === "ATIVO" ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle';
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td><img src="${u.foto}" class="avatar-table" onerror="this.src='https://ui-avatars.com/api/?name=User&background=cbd5e1'"></td>
            <td class="fw-medium">${u.nome}</td>
            <td class="text-dark small">${u.cpf}</td>
            <td class="text-secondary small">${u.cargo || "-"}</td>
            <td class="text-secondary small">${u.funcao || "-"}</td>
            <td class="text-secondary small font-monospace">${u.pis || "-"}</td>
            <td class="text-secondary small">${u.ctps || "-"}</td>
            <td class="text-secondary small">${u.dataInicio || "-"}</td>
            <td class="text-secondary small">${u.telefone}</td>
            <td class="text-muted small">${u.email}</td>
            <td><code class="text-dark font-monospace fw-bold">${u.senha}</code></td>
            <td><span class="badge bg-secondary">Apenas ${u.permissao}</span></td>
            <td><span class="badge ${badgeStatus} px-2.5">${u.status}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarFicha('${index}')">✏️ Ficha</button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="bloquearUsuario('${index}')">🔒 ${u.status === 'ATIVO' ? 'Bloquear' : 'Ativar'}</button>
                <button class="btn btn-sm btn-danger" onclick="solicitarExclusaoUsuario('${index}')">🗑️ Excluir</button>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

function abrirModalEditarFicha(index) {
    const idx = parseInt(index, 10);
    const u = bancoUsuarios[idx];
    if(!u) return;
    
    usuarioSelecionadoId = idx;

    document.getElementById('editNome').value = u.nome;
    document.getElementById('editCpf').value = u.cpf;
    document.getElementById('editCargo').value = u.cargo && u.cargo !== "-" ? u.cargo : "";
    document.getElementById('editFuncao').value = u.funcao && u.funcao !== "-" ? u.funcao : "";
    document.getElementById('editPis').value = u.pis && u.pis !== "-" ? u.pis : "";
    document.getElementById('editCtps').value = u.ctps && u.ctps !== "-" ? u.ctps : "";
    document.getElementById('editDataInicio').value = u.dataInicio && u.dataInicio !== "-" ? u.dataInicio : "";
    document.getElementById('editHorasSegSex').value = u.horasSegSex && u.horasSegSex !== "-" ? u.horasSegSex : "";
    document.getElementById('editHorasSab').value = u.horasSab && u.horasSab !== "-" ? u.horasSab : "";
    document.getElementById('editTelefone').value = u.telefone;
    document.getElementById('editEmail').value = u.email;
    document.getElementById('editSenha').value = u.senha;
    document.getElementById('editFotoFile').value = ""; 
    document.getElementById('editPermissao').value = u.permissao;

    document.getElementById('editCargaSegSex').value = u.cargaSegSex || "08:00";
    document.getElementById('editCargaSab').value = u.cargaSab || "04:00";
    document.getElementById('editCargaDom').value = u.cargaDom || "00:00";

    new bootstrap.Modal(document.getElementById('modalEditarFicha')).show();
}

async function confirmarEdicaoFicha() {
    if (usuarioSelecionadoId === null) return;
    const u = bancoUsuarios[usuarioSelecionadoId];
    if(!u) return;

    const btnEdit = document.getElementById("btnConfirmarEdicao");
    btnEdit.disabled = true;
    btnEdit.innerHTML = "⏳ Atualizando...";

    otimizarEConverterFoto(document.getElementById('editFotoFile')).then(async (novaFotoBase64) => {
        const dadosAtualizados = {
            nome: document.getElementById('editNome').value.trim(),
            cpf: document.getElementById('editCpf').value.trim(),
            cargo: document.getElementById('editCargo').value.trim() || "-",
            funcao: document.getElementById('editFuncao').value.trim() || "-",
            pis: document.getElementById('editPis').value.trim() || "-",
            ctps: document.getElementById('editCtps').value.trim() || "-",
            dataInicio: document.getElementById('editDataInicio').value.trim() || "-",
            horasSegSex: document.getElementById('editHorasSegSex').value.trim() || "-",
            horasSab: document.getElementById('editHorasSab').value.trim() || "-",
            telefone: document.getElementById('editTelefone').value.trim(),
            email: document.getElementById('editEmail').value.trim().toLowerCase(),
            senha: document.getElementById('editSenha').value.trim(),
            permissao: document.getElementById('editPermissao').value,
            cargaSegSex: document.getElementById('editCargaSegSex').value || "08:00",
            cargaSab: document.getElementById('editCargaSab').value || "04:00",
            cargaDom: document.getElementById('editCargaDom').value || "00:00"
        };

        if(novaFotoBase64) dadosAtualizados.foto = novaFotoBase64;

        try {
            await db.collection("usuarios_ponto").doc(u.firebaseId).update(dadosAtualizados);
            Object.assign(u, dadosAtualizados);
            
            bootstrap.Modal.getInstance(document.getElementById('modalEditarFicha')).hide();
            renderTabelaComAtualizacao();
            sincronizarFiltrosColaboradores();
            
            setTimeout(() => {
                exibirAlertaTop("☁️ Atualizado", "A ficha do colaborador foi alterada na nuvem.");
            }, 300);
        } catch (error) {
            exibirAlertaTop("⚠️ Erro", "Falha ao editar colaborador.");
        } finally {
            btnEdit.disabled = false;
            btnEdit.innerHTML = "Salvar Ficha";
        }
    });
}

function solicitarExclusaoUsuario(index) {
    const idx = parseInt(index, 10);
    const u = bancoUsuarios[idx];
    if(!u) return;

    usuarioSelecionadoId = idx;
    document.getElementById('nomeUsuarioExclusao').innerText = u.nome;
    new bootstrap.Modal(document.getElementById('modalExclusao')).show();
}

async function executarExclusaoDefinitiva() {
    if (usuarioSelecionadoId === null) return;
    
    const u = bancoUsuarios[usuarioSelecionadoId];
    const btnConf = document.getElementById("btnConfirmarExclusao");
    btnConf.disabled = true;
    btnConf.innerHTML = "⏳ Excluindo...";

    try {
        await db.collection("usuarios_ponto").doc(u.firebaseId).delete();
        bancoUsuarios.splice(usuarioSelecionadoId, 1);
        
        bootstrap.Modal.getInstance(document.getElementById('modalExclusao')).hide();
        renderTabelaComAtualizacao();
        sincronizarFiltrosColaboradores();
        
        setTimeout(() => {
            exibirAlertaTop("🗑️ Removido", "O colaborador foi excluído permanentemente da nuvem.");
        }, 300);
    } catch (error) {
        exibirAlertaTop("⚠️ Erro", "Falha ao excluir colaborador.");
    } finally {
        btnConf.disabled = false;
        btnConf.innerHTML = "Sim, Excluir";
    }
}

async function bloquearUsuario(index) {
    const idx = parseInt(index, 10);
    const u = bancoUsuarios[idx];
    if(!u) return;

    const novoStatus = u.status === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    try {
        await db.collection("usuarios_ponto").doc(u.firebaseId).update({ status: novoStatus });
        u.status = novoStatus;
        renderTabelaComAtualizacao();
    } catch (error) {
        exibirAlertaTop("⚠️ Erro", "Falha ao mudar status do usuário na nuvem.");
    }
}

function copiarLinkColaborador() {
    const linkApp = window.location.origin + "/colaborador.html";
    navigator.clipboard.writeText(linkApp).then(() => {
        exibirAlertaTop("🔗 Link Copiado", "O link de acesso do colaborador foi copiado.");
    });
}

function sincronizarFiltrosColaboradores() {
    const select = document.getElementById('filtroRelatorioColaborador');
    if(!select) return;
    const valorSelecionado = select.value;
    select.innerHTML = '<option value="todos">-- Selecione um Colaborador --</option>'; 
    bancoUsuarios.forEach(u => {
        select.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
    });
    select.value = valorSelecionado;
}

function bolarTempoParaMinutos(strHora) {
    if(!strHora || strHora === "-" || !strHora.includes(":")) return null;
    const partes = strHora.split(':');
    return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
}

function formatarMinutosParaString(minutosTotais) {
    if(minutosTotais <= 0) return "00:00";
    const hrs = Math.floor(minutosTotais / 60);
    const mins = minutosTotais % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function converterDataBrParaIso(dataBr) {
    if (!dataBr || !dataBr.includes('/')) return "";
    const p = dataBr.split('/');
    if (p.length !== 3) return "";
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
}

function converterDataIsoParaBr(dataIso) {
    if (!dataIso || !dataIso.includes('-')) return "";
    const p = dataIso.split('-');
    if (p.length !== 3) return "";
    return `${p[2].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[0]}`;
}

function aplicarFiltroRapido(tipo) {
    const inputInicio = document.getElementById('filtroRelatorioInicio');
    const inputFim = document.getElementById('filtroRelatorioFim');
    
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    const formatarDataInput = (data) => {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const dia = String(data.getDate()).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
    };

    if (tipo === 'hoje') {
        inicio = hoje;
        fim = hoje;
    } else if (tipo === 'semana') {
        inicio.setDate(hoje.getDate() - 7);
        fim = hoje;
    } else if (tipo === '15dias') {
        inicio.setDate(hoje.getDate() - 15);
        fim = hoje;
    } else if (tipo === 'mes') {
        const mesVal = document.getElementById('filtroMesRapido').value;
        if (!mesVal) return; 
        const partes = mesVal.split('-');
        const anoSelecionado = parseInt(partes[0], 10);
        const mesSelecionado = parseInt(partes[1], 10);
        
        inicio = new Date(anoSelecionado, mesSelecionado - 1, 1);
        fim = new Date(anoSelecionado, mesSelecionado, 0); 
    }

    if(inputInicio) inputInicio.value = formatarDataInput(inicio);
    if(inputFim) inputFim.value = formatarDataInput(fim);

    filtrarRelatorioTela();
}

async function puxarLogsEFiltrar() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    const btn = document.getElementById('btnFiltrarTela');
    if(btn) { btn.disabled = true; btn.innerHTML = "⏳ Buscando na Nuvem..."; }

    let dadosBrutosNuvem = [];

    try {
        const queryRef = db.collection("historico_pontos").where("empresaEmail", "==", PREFIXO_EMPRESA);
        const snapshot = await queryRef.get();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.data) return; 
            if (filtroColab === "todos" || String(data.colaboradorId) === String(filtroColab)) {
                dadosBrutosNuvem.push(data);
            }
        });
        
    } catch (error) {
        console.error("Erro no Firebase:", error);
        exibirAlertaTop("⚠️ Erro", "Falha ao consultar a base de dados.");
    } finally {
        if(btn) { btn.disabled = false; btn.innerHTML = "🔍 Filtrar na Tela"; }
    }

    return consolidarLogsBrutos(dadosBrutosNuvem);
}

function consolidarLogsBrutos(logsArray) {
    const espelhosAgrupados = {};

    logsArray.forEach(log => {
        if(!log.data || !log.colaboradorId) return; 
        
        const chaveChave = `${log.data}_${log.colaboradorId}`;
        if (!espelhosAgrupados[chaveChave]) {
            espelhosAgrupados[chaveChave] = {
                data: log.data,
                colaboradorId: log.colaboradorId,
                nome: log.nome || "Colaborador",
                entrada: "-",
                almocoIda: "-",
                almocoVolta: "-",
                saida: "-",
                minutosTrabalhadosNum: 0,
                minutosExtrasNum: 0,
                minutosEsperadosNum: 0,
                horasTrabalhadas: "00:00",
                horasExtras: "00:00",
                classeCorExtra: "text-muted",
                isDomingo: false,
                statusDia: "NORMAL",
                observacoes: []
            };
        }

        if (log.tipo === "Entrada") espelhosAgrupados[chaveChave].entrada = log.hora;
        if (log.tipo === "Almoço Ida") espelhosAgrupados[chaveChave].almocoIda = log.hora;
        if (log.tipo === "Almoço Volta") espelhosAgrupados[chaveChave].almocoVolta = log.hora;
        if (log.tipo === "Saída") espelhosAgrupados[chaveChave].saida = log.hora;

        if (log.statusDia && log.statusDia !== "NORMAL") {
            espelhosAgrupados[chaveChave].statusDia = log.statusDia;
        }

        if (log.observacao && log.observacao.trim() !== "") {
            espelhosAgrupados[chaveChave].observacoes.push({
                tipo: log.tipo,
                texto: log.observacao
            });
        }
    });

    const listaFinal = Object.values(espelhosAgrupados);

    listaFinal.forEach(r => {
        let minutosTrabalhados = 0;

        const mEntrada = bolarTempoParaMinutos(r.entrada);
        const mAlmIda = bolarTempoParaMinutos(r.almocoIda);
        const mAlmVolta = bolarTempoParaMinutos(r.almocoVolta);
        const mSaida = bolarTempoParaMinutos(r.saida);
        
        let calcAlmIda = mAlmIda;
        let calcSaida = mSaida;

        const hojeStr = new Date().toLocaleDateString('pt-BR');
        if (r.data === hojeStr) {
            const agora = new Date();
            const mAtual = agora.getHours() * 60 + agora.getMinutes();

            if (mEntrada !== null && mAlmIda === null && mSaida === null) {
                calcAlmIda = mAtual; 
            }
            if (mAlmVolta !== null && mSaida === null) {
                calcSaida = mAtual;
            }
        }

        if (mEntrada !== null && calcAlmIda === null && mAlmVolta === null && calcSaida !== null) {
            if (calcSaida > mEntrada) {
                minutosTrabalhados += (calcSaida - mEntrada);
            }
        } else {
            if(mEntrada !== null && calcAlmIda !== null && calcAlmIda > mEntrada) {
                minutosTrabalhados += (calcAlmIda - mEntrada);
            }
            if(mAlmVolta !== null && calcSaida !== null && calcSaida > mAlmVolta) {
                minutosTrabalhados += (calcSaida - mAlmVolta);
            }
        }

        const partesData = r.data.split('/');
        if (partesData.length === 3) {
            const objetoData = new Date(partesData[2], partesData[1] - 1, partesData[0]);
            const diaDaSemana = objetoData.getDay(); 

            r.isDomingo = (diaDaSemana === 0);

            const user = bancoUsuarios.find(u => String(u.id) === String(r.colaboradorId));
            const cargaSegSex = user ? (user.cargaSegSex || "08:00") : "08:00";
            const cargaSab = user ? (user.cargaSab || "04:00") : "04:00";
            const cargaDom = user ? (user.cargaDom || "00:00") : "00:00";

            let cargaObrigatoriaDoDia = 0; 
            if (diaDaSemana === 6) { 
                const minCalc = bolarTempoParaMinutos(cargaSab);
                cargaObrigatoriaDoDia = minCalc !== null ? minCalc : 240;
            } else if (diaDaSemana === 0) { 
                const minCalc = bolarTempoParaMinutos(cargaDom);
                cargaObrigatoriaDoDia = minCalc !== null ? minCalc : 0;
            } else { 
                const minCalc = bolarTempoParaMinutos(cargaSegSex);
                cargaObrigatoriaDoDia = minCalc !== null ? minCalc : 480;
            }

            // ABONO DE HORAS: FERIADO, FÉRIAS, ATESTADO E FOLGA
            if (r.statusDia === "FERIADO" || r.statusDia === "FERIAS" || r.statusDia === "ATESTADO" || r.statusDia === "FOLGA") {
                if (minutosTrabalhados < cargaObrigatoriaDoDia) {
                    minutosTrabalhados = cargaObrigatoriaDoDia;
                }
            }

            // =========================================================
            // REGRA DE TOLERÂNCIA TRABALHISTA (15 MINUTOS ANTES/DEPOIS)
            // =========================================================
            let diferencaDia = minutosTrabalhados - cargaObrigatoriaDoDia;

            if (minutosTrabalhados > 0 && cargaObrigatoriaDoDia > 0) {
                if (Math.abs(diferencaDia) <= 15) {
                    minutosTrabalhados = cargaObrigatoriaDoDia;
                    diferencaDia = 0;
                }
            }

            r.minutosTrabalhadosNum = minutosTrabalhados;
            r.horasTrabalhadas = formatarMinutosParaString(minutosTrabalhados);
            r.minutosEsperadosNum = cargaObrigatoriaDoDia;
            r.minutosExtrasNum = diferencaDia;

            if (diferencaDia > 0) {
                r.horasExtras = `+${formatarMinutosParaString(diferencaDia)}`;
                r.classeCorExtra = "text-success";
            } else if (diferencaDia < 0) {
                r.horasExtras = `-${formatarMinutosParaString(Math.abs(diferencaDia))}`;
                r.classeCorExtra = "text-danger";
            } else {
                r.horasExtras = "00:00";
                r.classeCorExtra = "text-secondary";
            }
        }
    });

    return listaFinal;
}

function preencherCalendarioCompleto(dadosConsolidados, dataInicioStr, dataFimStr, colaboradorId) {
    if (!dataInicioStr || !dataFimStr) return dadosConsolidados;

    const user = bancoUsuarios.find(u => String(u.id) === String(colaboradorId));
    const nomeColab = user ? user.nome : (dadosConsolidados[0] ? dadosConsolidados[0].nome : "Colaborador");
    const cargaSegSex = user ? (user.cargaSegSex || "08:00") : "08:00";
    const cargaSab = user ? (user.cargaSab || "04:00") : "04:00";
    const cargaDom = user ? (user.cargaDom || "00:00") : "00:00";

    const dInicio = new Date(dataInicioStr + "T00:00:00");
    const dFim = new Date(dataFimStr + "T00:00:00");

    const mapaExistentes = {};
    dadosConsolidados.forEach(r => {
        if (r.data) mapaExistentes[r.data] = r;
    });

    const listaCompleta = [];
    let cur = new Date(dInicio);

    while (cur <= dFim) {
        const diaStr = String(cur.getDate()).padStart(2, '0');
        const mesStr = String(cur.getMonth() + 1).padStart(2, '0');
        const anoStr = cur.getFullYear();
        const dataFormatada = `${diaStr}/${mesStr}/${anoStr}`;
        const diaDaSemana = cur.getDay();

     if (mapaExistentes[dataFormatada]) {
        const reg = mapaExistentes[dataFormatada];
        
        const inicioAtestado = reg.horaInicioAtestado || "";
        const fimAtestado = reg.horaFimAtestado || "";
        
        if (inicioAtestado && fimAtestado) {
            const minInicio = bolarTempoParaMinutos(inicioAtestado) || 0;
            const minFim = bolarTempoParaMinutos(fimAtestado) || 0;
            const minAtestado = Math.max(0, minFim - minInicio);
            
            if (minAtestado > 0 && !reg._atestadoSomado) {
                const minPonto = reg.minutosTrabalhadosNum || 0;
                reg.minutosTrabalhadosNum = minPonto + minAtestado;
                reg.horasTrabalhadas = formatarMinutosParaString(reg.minutosTrabalhadosNum);
                reg._atestadoSomado = true;
            }
        }
                    const saldo = (reg.minutosTrabalhadosNum || 0) - (reg.minutosEsperadosNum || 0);
                    reg.minutosExtrasNum = saldo;
                    if (saldo < 0) {
                        reg.horasExtras = `-${formatarMinutosParaString(Math.abs(saldo))}`;
                        reg.classeCorExtra = "text-danger";
                    } else if (saldo > 0) {
                        reg.horasExtras = formatarMinutosParaString(saldo);
                        reg.classeCorExtra = "text-success";
                    } else {
        reg.horasExtras = "00:00";
        reg.classeCorExtra = "text-secondary";
    }
    
    listaCompleta.push(reg);
}
        else {
            let cargaObrigatoria = 0;
            if (diaDaSemana === 6) {
                const minCalc = bolarTempoParaMinutos(cargaSab);
                cargaObrigatoria = minCalc !== null ? minCalc : 240;
            } else if (diaDaSemana === 0) {
                const minCalc = bolarTempoParaMinutos(cargaDom);
                cargaObrigatoria = minCalc !== null ? minCalc : 0;
            } else {
                const minCalc = bolarTempoParaMinutos(cargaSegSex);
                cargaObrigatoria = minCalc !== null ? minCalc : 480;
            }

            let strExtras = "00:00";
            let corExtras = "text-secondary";
            let minExtras = 0;

            if (cargaObrigatoria > 0) {
                minExtras = -cargaObrigatoria;
                strExtras = `-${formatarMinutosParaString(cargaObrigatoria)}`;
                corExtras = "text-danger";
            }

            listaCompleta.push({
                data: dataFormatada,
                colaboradorId: String(colaboradorId),
                nome: nomeColab,
                entrada: "-",
                almocoIda: "-",
                almocoVolta: "-",
                saida: "-",
                minutosTrabalhadosNum: 0,
                minutosEsperadosNum: cargaObrigatoria,
                minutosExtrasNum: minExtras,
                horasTrabalhadas: "00:00",
                horasExtras: strExtras,
                classeCorExtra: corExtras,
            isDomingo: (diaDaSemana === 0),
            statusDia: (mapaExistentes[dataFormatada] ? mapaExistentes[dataFormatada].statusDia : "NORMAL"),
            observacoes: (mapaExistentes[dataFormatada] ? mapaExistentes[dataFormatada].observacoes : []),
            horaInicioAtestado: mapaExistentes[dataFormatada] ? mapaExistentes[dataFormatada].horaInicioAtestado : "",
            horaFimAtestado: mapaExistentes[dataFormatada] ? mapaExistentes[dataFormatada].horaFimAtestado : ""
        });
              }
        cur.setDate(cur.getDate() + 1);
    }

    return listaCompleta;
}

window.abrirModalLerObs = function(obsStrBase64) {
    const stringDecodificada = decodeURIComponent(escape(atob(obsStrBase64)));
    const observacoes = JSON.parse(stringDecodificada);
    
    let html = "";
    observacoes.forEach(obs => {
        html += `<div class="mb-3 p-3 bg-light border rounded text-start">
                    <strong class="text-dark d-block mb-1">Batida: ${obs.tipo}</strong>
                    <span class="text-secondary small">${obs.texto}</span>
                 </div>`;
    });
    document.getElementById('conteudoLerObservacao').innerHTML = html;
    new bootstrap.Modal(document.getElementById('modalLerObservacao')).show();
};

window.alternarCamposPorStatus = function() {
    const status = document.getElementById("ajusteStatusDia").value;
    const containerPeriodo = document.getElementById("containerPeriodoStatus");
    const containerCamposHorarios = document.getElementById("containerCamposHorarios");

    if (status === "FERIAS" || status === "ATESTADO" || status === "FOLGA") {
        if (containerPeriodo) containerPeriodo.style.display = "block";
        if (containerCamposHorarios) containerCamposHorarios.style.display = "none";
    } else {
        if (containerPeriodo) containerPeriodo.style.display = "none";
        if (containerCamposHorarios) containerCamposHorarios.style.display = "flex";
    }
};

window.abrirModalEditarDia = function(diaBase64) {
    const obj = JSON.parse(decodeURIComponent(escape(atob(diaBase64))));
    
    document.getElementById("modalAjusteNome").innerText = obj.nome;
    document.getElementById("modalAjusteData").innerText = obj.data;
    document.getElementById("modalAjusteDataVal").value = obj.data;
    document.getElementById("modalAjusteColabIdVal").value = obj.colaboradorId;

    const dataIsoDia = converterDataBrParaIso(obj.data);
    const inputInicio = document.getElementById("ajusteDataInicioPeriodo");
    const inputFim = document.getElementById("ajusteDataFimPeriodo");
    if (inputInicio) inputInicio.value = dataIsoDia;
    if (inputFim) inputFim.value = dataIsoDia;

    const statusAtual = (obj.statusDia === "EDITADO") ? "NORMAL" : (obj.statusDia || "NORMAL");
    document.getElementById("ajusteStatusDia").value = statusAtual;
document.getElementById("horaInicioAtestado").value = obj.horaInicioAtestado || "";
document.getElementById("horaFimAtestado").value = obj.horaFimAtestado || "";
alternarCamposPorStatus();
  document.getElementById("ajusteEntrada").value = (obj.entrada && obj.entrada !== "-") ? obj.entrada : "";
    document.getElementById("ajusteAlmIda").value = (obj.almocoIda && obj.almocoIda !== "-") ? obj.almocoIda : "";
    document.getElementById("ajusteAlmVolta").value = (obj.almocoVolta && obj.almocoVolta !== "-") ? obj.almocoVolta : "";
    document.getElementById("ajusteSaida").value = (obj.saida && obj.saida !== "-") ? obj.saida : "";

    new bootstrap.Modal(document.getElementById('modalEditarDiaPonto')).show();
};

async function salvarAjusteHorariosDia(event) {
    event.preventDefault();
    const dataAlvoOriginal = document.getElementById("modalAjusteDataVal").value;
    const colabId = document.getElementById("modalAjusteColabIdVal").value;
    let statusDiaEscolhido = document.getElementById("ajusteStatusDia").value;
    
    const hEntrada = document.getElementById("ajusteEntrada").value;
    const hAlmIda = document.getElementById("ajusteAlmIda").value;
    const hAlmVolta = document.getElementById("ajusteAlmVolta").value;
    const hSaida = document.getElementById("ajusteSaida").value;
const horaInicioAtestado = document.getElementById("horaInicioAtestado") ? document.getElementById("horaInicioAtestado").value : "";
const horaFimAtestado = document.getElementById("horaFimAtestado") ? document.getElementById("horaFimAtestado").value : "";
    const btn = document.getElementById("btnSalvarAjusteDia");
    btn.disabled = true;
    btn.innerHTML = "⏳ Gravando Ajuste...";

    try {
        const user = bancoUsuarios.find(u => String(u.id) === String(colabId));
        const nomeColab = user ? user.nome : "Colaborador";

        // SE FOR FÉRIAS, ATESTADO OU FOLGA: GRAVA NO INTERVALO SELECIONADO DE UMA ÚNICA VEZ
        if (statusDiaEscolhido === "FERIAS" || statusDiaEscolhido === "ATESTADO" || statusDiaEscolhido === "FOLGA") {
            const dataInicioIso = document.getElementById("ajusteDataInicioPeriodo").value;
            const dataFimIso = document.getElementById("ajusteDataFimPeriodo").value;

            if (!dataInicioIso || !dataFimIso) {
                exibirAlertaTop("⚠️ Datas Inválidas", "Por favor, selecione as datas de início e término do período.");
                btn.disabled = false;
                btn.innerHTML = "💾 Salvar Ajuste";
                return;
            }

            const dInicio = new Date(dataInicioIso + "T00:00:00");
            const dFim = new Date(dataFimIso + "T00:00:00");

            if (dInicio > dFim) {
                exibirAlertaTop("⚠️ Período Incoerente", "A data de início não pode ser maior que a data de término.");
                btn.disabled = false;
                btn.innerHTML = "💾 Salvar Ajuste";
                return;
            }

            let cur = new Date(dInicio);
            while (cur <= dFim) {
                const diaStr = String(cur.getDate()).padStart(2, '0');
                const mesStr = String(cur.getMonth() + 1).padStart(2, '0');
                const anoStr = cur.getFullYear();
                const dataFormatada = `${diaStr}/${mesStr}/${anoStr}`;

                const snapExistentes = await db.collection("historico_pontos")
                    .where("empresaEmail", "==", PREFIXO_EMPRESA)
                    .where("colaboradorId", "==", String(colabId))
                    .where("data", "==", dataFormatada)
                    .get();

                if (!snapExistentes.empty) {
    for (let doc of snapExistentes.docs) {
        await db.collection("historico_pontos").doc(doc.id).update({
            statusDia: statusDiaEscolhido,
            horaInicioAtestado: horaInicioAtestado,
            horaFimAtestado: horaFimAtestado
        });
    }
} else {
                  await db.collection("historico_pontos").add({
                        colaboradorId: String(colabId),
                        nome: nomeColab,
                        data: dataFormatada,
                        tipo: "Registro Especial",
                        hora: "-",
                        statusDia: statusDiaEscolhido,
                        horaInicioAtestado: horaInicioAtestado,
                        horaFimAtestado: horaFimAtestado,
                        empresaEmail: PREFIXO_EMPRESA,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                cur.setDate(cur.getDate() + 1);
            }

            bootstrap.Modal.getInstance(document.getElementById('modalEditarDiaPonto')).hide();
            exibirAlertaTop("Período Atualizado", `O período de <strong>${converterDataIsoParaBr(dataInicioIso)} até ${converterDataIsoParaBr(dataFimIso)}</strong> foi registrado como <strong>${statusDiaEscolhido}</strong> com sucesso!`);
            await filtrarRelatorioTela();
            return;
        }

        // SE O USUÁRIO SALVOU COMO NORMAL VIA MODAL, MARCA COMO "EDITADO" PARA MOSTRAR NA TELA EM VERMELHO
        if (statusDiaEscolhido === "NORMAL") {
            statusDiaEscolhido = "EDITADO";
        }

        // AJUSTE NORMAL / FERIADO (DIA PONTUAL)
        const snapExistentes = await db.collection("historico_pontos")
            .where("empresaEmail", "==", PREFIXO_EMPRESA)
            .where("colaboradorId", "==", String(colabId))
            .where("data", "==", dataAlvoOriginal)
            .get();

        const mapaDocExistente = {};
        snapExistentes.forEach(doc => {
            const d = doc.data();
            mapaDocExistente[d.tipo] = doc.id;
        });

        const tiposHorarios = [
            { tipo: "Entrada", hora: hEntrada },
            { tipo: "Almoço Ida", hora: hAlmIda },
            { tipo: "Almoço Volta", hora: hAlmVolta },
            { tipo: "Saída", hora: hSaida }
        ];

        let salvouAlgumPonto = false;

        for (let item of tiposHorarios) {
            const docId = mapaDocExistente[item.tipo];
         if ((item.hora && item.hora.trim() !== "") || (horaInicioAtestado !== "" || horaFimAtestado !== "")) {
                salvouAlgumPonto = true;
                if (docId) {
                    await db.collection("historico_pontos").doc(docId).update({
    hora: item.hora.trim(),
    statusDia: statusDiaEscolhido,
    horaInicioAtestado: horaInicioAtestado,
    horaFimAtestado: horaFimAtestado
});
                } else {
        await db.collection("historico_pontos").add({
            colaboradorId: String(colabId),
            nome: nomeColab,
            data: dataAlvoOriginal,
            tipo: item.tipo,
            hora: item.hora.trim(),
            statusDia: statusDiaEscolhido,
            horaInicioAtestado: horaInicioAtestado,
            horaFimAtestado: horaFimAtestado,
            empresaEmail: PREFIXO_EMPRESA,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
            } else {
                if (docId) {
                    await db.collection("historico_pontos").doc(docId).delete();
                }
            }
        }

        if (!salvouAlgumPonto && statusDiaEscolhido !== "NORMAL") {
            const docGenerico = snapExistentes.docs[0];
            if (docGenerico) {
                await db.collection("historico_pontos").doc(docGenerico.id).update({
                    statusDia: statusDiaEscolhido,
            horaInicioAtestado: horaInicioAtestado,
            horaFimAtestado: horaFimAtestado
                });
            } else {
                await db.collection("historico_pontos").add({
                    colaboradorId: String(colabId),
                    nome: nomeColab,
                    data: dataAlvoOriginal,
                    tipo: "Registro Especial",
                    hora: "-",
                   statusDia: statusDiaEscolhido,
            horaInicioAtestado: horaInicioAtestado,
            horaFimAtestado: horaFimAtestado,
            empresaEmail: PREFIXO_EMPRESA,
                   timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        bootstrap.Modal.getInstance(document.getElementById('modalEditarDiaPonto')).hide();
        exibirAlertaTop("Ajuste Realizado", `O dia <strong>${dataAlvoOriginal}</strong> foi atualizado com sucesso.`);
        await filtrarRelatorioTela();

    } catch (err) {
        console.error("Erro ao salvar ajuste de ponto:", err);
        exibirAlertaTop("⚠️ Erro", "Falha ao gravar os novos horários.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "💾 Salvar Ajuste";
    }
}

async function filtrarRelatorioTela() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    const filtroInicio = document.getElementById('filtroRelatorioInicio').value;
    const filtroFim = document.getElementById('filtroRelatorioFim').value;
    const tabelaBody = document.getElementById('tabelaRelatoriosBody');
    if(!tabelaBody) return;
    
    tabelaBody.innerHTML = "";

    if (filtroColab === "todos") {
        tabelaBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted small py-4">⚠️ Por favor, selecione um colaborador específico para carregar o relatório.</td></tr>`;
        return;
    }

    let dadosConsolidados = await puxarLogsEFiltrar();

    if (filtroInicio && filtroFim) {
        dadosConsolidados = preencherCalendarioCompleto(dadosConsolidados, filtroInicio, filtroFim, filtroColab);
    } else {
        if (filtroInicio) {
            const dInicio = new Date(filtroInicio + "T00:00:00");
            dadosConsolidados = dadosConsolidados.filter(r => {
                if(!r.data) return false;
                const p = r.data.split('/');
                if(p.length !== 3) return false;
                return new Date(p[2], p[1]-1, p[0]) >= dInicio;
            });
        }
        if (filtroFim) {
            const dFim = new Date(filtroFim + "T23:59:59");
            dadosConsolidados = dadosConsolidados.filter(r => {
                if(!r.data) return false;
                const p = r.data.split('/');
                if(p.length !== 3) return false;
                return new Date(p[2], p[1]-1, p[0]) <= dFim;
            });
        }
    }

    if (dadosConsolidados.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted small py-4">Nenhum registro encontrado para este colaborador no período selecionado.</td></tr>`;
        return;
    }

    let acumuladorTrabalhadas = 0;
    let acumuladorEsperadas = 0;

    dadosConsolidados.sort((a,b) => {
        if(!a.data || !b.data) return 0;
        const pa = a.data.split('/');
        const pb = b.data.split('/');
        if(pa.length !== 3 || pb.length !== 3) return 0;
        return new Date(pa[2], pa[1]-1, pa[0]) - new Date(pb[2], pb[1]-1, pb[0]);
    });

    if (r.horaInicioAtestado && r.horaFimAtestado) {
        const minInicio = bolarTempoParaMinutos(r.horaInicioAtestado) || 0;
        const minFim = bolarTempoParaMinutos(r.horaFimAtestado) || 0; // <- corrigido aqui para FimAtestado
        const minutosAtestado = Math.max(0, minFim - minInicio);

        if (minutosAtestado > 0 && !r._atestadoSomado) {
            r.minutosTrabalhadosNum = (r.minutosTrabalhadosNum || 0) + minutosAtestado;
            r.horasTrabalhadas = formatarMinutosParaString(r.minutosTrabalhadosNum);
            r._atestadoSomado = true;
        }
  
    acumuladorTrabalhadas += r.minutosTrabalhadosNum;
  acumuladorEsperadas += r.minutosEsperadosNum;

        let btnObsHtml = `<span class="badge bg-success bg-opacity-25 text-success border border-success-subtle px-2" style="font-size:0.75rem;">● Sem Obs.</span>`;
        if (r.observacoes && r.observacoes.length > 0) {
            const obsStrBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(r.observacoes))));
            btnObsHtml = `<button class="btn btn-sm btn-danger fw-bold shadow-sm" style="font-size: 0.7rem; padding: 3px 8px; animation: pulse 2s infinite;" onclick="abrirModalLerObs('${obsStrBase64}')">🔔 Ver Obs.</button>`;
        }

        let tagStatusHtml = "";
        if (r.statusDia === "FERIADO") {
            tagStatusHtml = ` <span class="badge text-white border ms-1" style="font-size:0.65rem; background-color: #6f42c1 !important;">FERIADO</span>`;
        } else if (r.statusDia === "ATESTADO") {
            tagStatusHtml = ` <span class="badge bg-warning text-dark border ms-1" style="font-size:0.65rem;">ATESTADO</span>`;
         } else if (r.statusDia === "ATESTADO PARCIAL" || r.statusDia === "Atestado Parcial (Horas)" || r.statusDia === "ATESTADO_PARCIAL" || (r.horaInicioAtestado && r.horaFimAtestado)) {
          tagStatusHtml = `<span class="badge bg-warning text-dark border ms-1" style="font-size:0.65rem;">ATESTADO PARCIAL (${r.horaInicioAtestado || ''} - ${r.horaFimAtestado || ''})</span>`;
        } else if (r.statusDia === "FERIAS") {
            tagStatusHtml = ` <span class="badge bg-info text-dark border ms-1" style="font-size:0.65rem;">FÉRIAS</span>`;
        } else if (r.statusDia === "FOLGA") {
            tagStatusHtml = ` <span class="badge text-white border ms-1" style="font-size:0.65rem; background-color: #0d9488 !important;">FOLGA</span>`;
        } else if (r.statusDia === "EDITADO") {
            tagStatusHtml = ` <span class="badge bg-danger text-white border ms-1" style="font-size:0.65rem;">EDITADO</span>`;
        } else if (r.isDomingo) {
            tagStatusHtml = ` <span class="badge bg-secondary bg-opacity-25 text-secondary border ms-1" style="font-size:0.65rem;">DOM</span>`;
        }

        const objDiaBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(r))));
        const tr = document.createElement('tr');
        if (r.isDomingo || (r.statusDia && r.statusDia !== "NORMAL")) {
            tr.setAttribute('style', 'background-color: #f8fafc;');
        }
        
        const ehAtestadoParcial = (r.statusDia === "ATESTADO PARCIAL" || r.statusDia === "Atestado Parcial (Horas)" || (r.horaInicioAtestado && r.horaFimAtestado));

    tr.innerHTML = `
        <td><strong>${r.data}</strong>${tagStatusHtml}</td>
        <td>${r.nome}</td>
        <td><span class="badge bg-light text-dark border">${ehAtestadoParcial ? (r.horaInicioAtestado || '-') : (r.entrada || '-')}</span></td>
        <td><span class="badge bg-light text-dark border">${ehAtestadoParcial ? '-' : (r.almocoIda || '-')}</span></td>
        <td><span class="badge bg-light text-dark border">${ehAtestadoParcial ? '-' : (r.almocoVolta || '-')}</span></td>
        <td><span class="badge bg-light text-dark border">${ehAtestadoParcial ? (r.horaFimAtestado || '-') : (r.saida || '-')}</span></td>
        <td class="text-success fw-bold">${r.horasTrabalhadas || '00:00'}</td>
        <td class="${r.classeCorExtra || ''} fw-bold">${r.horasExtras || '00:00'}</td>
        <td class="text-center">${btnObsHtml}</td>
        <td class="text-center">
            <button class="btn btn-sm btn-outline-primary" style="font-size: 0.75rem; padding: 3px 8px;" title="Ajustar Horários / Motivo" onclick="abrirModalEditarDia('${objDiaBase64}')">✏️</button>
        </td>
    `;
        tabelaBody.appendChild(tr);
     const saldoFinal = acumuladorTrabalhadas - acumuladorEsperadas;
    const saldoAbsoluto = Math.abs(saldoFinal);
    const strSaldo = formatarMinutosParaString(saldoAbsoluto);
    
    let htmlSaldo = "";
    if (saldoFinal > 0) {
        htmlSaldo = `<span style="color: #16a34a; font-weight: 900; font-size: 1.1rem;">+ ${strSaldo} (Horas Extras Reais)</span>`;
    } else if (saldoFinal < 0) {
        htmlSaldo = `<span style="color: #ef4444; font-weight: 900; font-size: 1.1rem;">- ${strSaldo} (Horas Faltantes)</span>`;
    } else {
        htmlSaldo = `<span style="color: #64748b; font-weight: 900; font-size: 1.1rem;">00:00 (Zerado)</span>`;
    }

    const trTotal = document.createElement('tr');
    trTotal.style.backgroundColor = "#f8fafc";
    trTotal.innerHTML = `
        <td colspan="10" class="text-end pe-4 py-4 border-top">
            <div style="font-size: 0.95rem; line-height: 1.8;">
                <span class="text-secondary fw-bold text-uppercase me-2">Carga Esperada do Período:</span> <span class="fw-bold text-dark fs-6">${formatarMinutosParaString(acumuladorEsperadas)}</span><br>
                <span class="text-secondary fw-bold text-uppercase me-2">Total Realizado:</span> <span class="fw-bold text-dark fs-6">${formatarMinutosParaString(acumuladorTrabalhadas)}</span><br>
                <span class="text-dark fw-extrabold text-uppercase me-2" style="font-size: 1.1rem;">Saldo Final:</span> ${htmlSaldo}
            </div>
        </td>
    `;
    tabelaBody.appendChild(trTotal);
}

// =========================================================================
// EXPORTAÇÃO EXECUTIVA EXCEL COM DESIGN CLEAN E FORMATAÇÃO PROFISSIONAL
// =========================================================================
async function exportarPontosExcel() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    
    if (filtroColab === "todos") {
        exibirAlertaTop("Selecione um Colaborador", "Por favor, defina qual colaborador deseja exportar para gerar o arquivo formatado.");
        return;
    }

    let dadosParaPlanilha = await puxarLogsEFiltrar();
    
    const filtroInicio = document.getElementById('filtroRelatorioInicio').value;
    const filtroFim = document.getElementById('filtroRelatorioFim').value;
    
    if (filtroInicio && filtroFim) {
        dadosParaPlanilha = preencherCalendarioCompleto(dadosParaPlanilha, filtroInicio, filtroFim, filtroColab);
    } else {
        if (filtroInicio) {
            const dInicio = new Date(filtroInicio + "T00:00:00");
            dadosParaPlanilha = dadosParaPlanilha.filter(r => {
                if(!r.data) return false;
                const p = r.data.split('/');
                if(p.length !== 3) return false;
                return new Date(p[2], p[1]-1, p[0]) >= dInicio;
            });
        }
        if (filtroFim) {
            const dFim = new Date(filtroFim + "T23:59:59");
            dadosParaPlanilha = dadosParaPlanilha.filter(r => {
                if(!r.data) return false;
                const p = r.data.split('/');
                if(p.length !== 3) return false;
                return new Date(p[2], p[1]-1, p[0]) <= dFim;
            });
        }
    }
    
    if (dadosParaPlanilha.length === 0) {
        exibirAlertaTop("Sem Dados", "Não há dados consolidados para o colaborador filtrado.");
        return;
    }

    dadosParaPlanilha.sort((a,b) => {
        if (!a.data || !b.data) return 0;
        const pa = a.data.split('/');
        const pb = b.data.split('/');
        if(pa.length !== 3 || pb.length !== 3) return 0;
        return new Date(pa[2], pa[1]-1, pa[0]) - new Date(pb[2], pb[1]-1, pb[0]);
    });

    const user = bancoUsuarios.find(u => String(u.id) === String(filtroColab)) || {};
    const colabNome = user.nome || dadosParaPlanilha[0].nome;
    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    const mesesExtenso = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    let mesRelatorio = "MÊS ATUAL";
    let anoLetivo = new Date().getFullYear();

    if (dadosParaPlanilha[0] && dadosParaPlanilha[0].data) {
        const partesP = dadosParaPlanilha[0].data.split('/');
        if (partesP.length === 3) {
            const mNum = parseInt(partesP[1], 10) - 1;
            mesRelatorio = mesesExtenso[mNum] || mesRelatorio;
            anoLetivo = partesP[2];
        }
    }

    const nomeEmpresaTopo = dadosEmpresaAtiva.nome || sessionStorage.getItem("nome_empresa_ativa") || "Empresa Parceira";
    const cnpjEmpresaTopo = dadosEmpresaAtiva.cnpj || "-";
    const enderecoEmpresaTopo = dadosEmpresaAtiva.endereco || "-";

    const matrizPlanilha = [
        ["FOLHA DE PONTO"],
        [],
        ["EMPRESA:", nomeEmpresaTopo, "", "", "", "CNPJ:", cnpjEmpresaTopo, "", ""],
        ["ENDEREÇO:", enderecoEmpresaTopo, "", "", "", "", "", "", ""],
        [],
        ["COLABORADOR:", colabNome, "", "", "CTPS Nº SÉRIE:", user.ctps || "-", "", "DATA INÍCIO:", user.dataInicio || "-"],
        ["FUNÇÃO / CARGO:", `${user.funcao || "-"} / ${user.cargo || "-"}`, "", "", "PIS:", user.pis || "-", "", "EMISSÃO:", dataEmissao],
        ["HORÁRIO SEG A SEX:", user.horasSegSex || user.cargaSegSex || "08:00", "", "", "HORÁRIO SÁBADOS:", user.horasSab || user.cargaSab || "04:00", "", "DESCANSO:", "DOMINGO"],
        ["MÊS REFERÊNCIA:", mesRelatorio, "", "", "ANO LETIVO:", anoLetivo, "", "", ""],
        [],
        ["Data", "Colaborador", "Entrada", "Almoço Ida", "Almoço Volta", "Saída", "Horas Trab.", "Horas Extras", "Observações/Justificativas"]
    ];

    let somaTrab = 0;
    let somaEsperada = 0;

    dadosParaPlanilha.forEach(r => {
        somaTrab += r.minutosTrabalhadosNum;
        somaEsperada += r.minutosEsperadosNum;

        let textoObsFinal = "Sem observação";
        if (r.observacoes && r.observacoes.length > 0) {
            textoObsFinal = r.observacoes.map(o => `[${o.tipo}] ${o.texto}`).join(" | ");
        } else if (r.statusDia === "FERIADO") {
            textoObsFinal = "Feriado Abonado";
        } else if (r.statusDia === "ATESTADO") {
            textoObsFinal = "Atestado Médico";
        } else if (r.statusDia === "FERIAS") {
            textoObsFinal = "Férias Abonadas";
        } else if (r.statusDia === "FOLGA") {
            textoObsFinal = "Folga Abonada / Compensatória";
        } else if (r.isDomingo) {
            textoObsFinal = "Descanso Semanal (DSR / Domingo)";
        }

        // NO EXCEL: NÃO MOSTRA (EDITADO), APENAS OS DEMAIS STATUS
        let tagExcel = "";
        if (r.statusDia && r.statusDia !== "NORMAL" && r.statusDia !== "EDITADO") {
            tagExcel = ` (${r.statusDia})`;
        } else if (r.isDomingo) {
            tagExcel = " (DOM)";
        }

        const dataStrExcel = `${r.data}${tagExcel}`;
        matrizPlanilha.push([dataStrExcel, r.nome, r.entrada, r.almocoIda, r.almocoVolta, r.saida, r.horasTrabalhadas, r.horasExtras, textoObsFinal]);
    });

    const saldoFinal = somaTrab - somaEsperada;
    const saldoAbs = Math.abs(saldoFinal);
    const strSaldo = formatarMinutosParaString(saldoAbs);
    
    let textoSaldo = "";
    if (saldoFinal > 0) textoSaldo = `+ ${strSaldo} (Horas Extras Reais)`;
    else if (saldoFinal < 0) textoSaldo = `- ${strSaldo} (Horas Faltantes)`;
    else textoSaldo = "00:00 (Zerado)";

    matrizPlanilha.push([]);
    
    const idxTitle = matrizPlanilha.length;
    matrizPlanilha.push(["RESUMO FINANCEIRO DO PERÍODO", "", "", "", "", "", "", "", ""]);
    
    const idxCarga = matrizPlanilha.length;
    matrizPlanilha.push(["CARGA ESPERADA DO PERÍODO:", "", "", "", "", "", formatarMinutosParaString(somaEsperada), "", ""]);
    
    const idxTrab = matrizPlanilha.length;
    matrizPlanilha.push(["TOTAL REALIZADO:", "", "", "", "", "", formatarMinutosParaString(somaTrab), "", ""]);
    
    const idxSaldo = matrizPlanilha.length;
    matrizPlanilha.push(["SALDO FINAL:", "", "", "", "", "", textoSaldo, "", ""]);

    matrizPlanilha.push([]);
    matrizPlanilha.push([]);
    
    const idxDeclaracao = matrizPlanilha.length;
    matrizPlanilha.push(["Declaro ainda estar ciente de que a apresentação de informações falsas e rasuras, sujeitando-me às penalidades previstas no Art. 299 do Decreto Lei nº 2848 de 07/12/1940.", "", "", "", "", "", "", "", ""]);
    
    matrizPlanilha.push([]);
    matrizPlanilha.push([]);
    matrizPlanilha.push([]);
    
    const idxLinhaAssinatura = matrizPlanilha.length;
    matrizPlanilha.push(["", "", "Assinatura do Colaborador", "", "", "", "", "", ""]);

    const worksheet = XLSX.utils.aoa_to_sheet(matrizPlanilha);

    // ==========================================
    // ESTILIZAÇÃO COMPLETA NATIVA (XLSX-JS-STYLE)
    // ==========================================
    const bordaSuave = {
        top: { style: "thin", color: { rgb: "CBD5E1" } },
        bottom: { style: "thin", color: { rgb: "CBD5E1" } },
        left: { style: "thin", color: { rgb: "CBD5E1" } },
        right: { style: "thin", color: { rgb: "CBD5E1" } }
    };

    const estiloTitulo = {
        fill: { fgColor: { rgb: "0F172A" } },
        font: { bold: true, color: { rgb: "F97316" }, size: 16, name: "Calibri" },
        alignment: { horizontal: "center", vertical: "center" }
    };

    const estiloRotuloInfo = {
        fill: { fgColor: { rgb: "F1F5F9" } },
        font: { bold: true, color: { rgb: "475569" }, size: 9, name: "Calibri" },
        alignment: { horizontal: "left", vertical: "center" },
        border: bordaSuave
    };

    const estiloValorInfo = {
        fill: { fgColor: { rgb: "FFFFFF" } },
        font: { bold: true, color: { rgb: "0F172A" }, size: 9.5, name: "Calibri" },
        alignment: { horizontal: "left", vertical: "center" },
        border: bordaSuave
    };

    const estiloHeaderTabela = {
        fill: { fgColor: { rgb: "0F172A" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, size: 10, name: "Calibri" },
        alignment: { horizontal: "center", vertical: "center" },
        border: bordaSuave
    };

    const estiloLinhaBranca = {
        fill: { fgColor: { rgb: "FFFFFF" } },
        font: { color: { rgb: "334155" }, size: 9.5, name: "Calibri" },
        alignment: { horizontal: "center", vertical: "center" },
        border: bordaSuave
    };

    const estiloLinhaCinza = {
        fill: { fgColor: { rgb: "F8FAFC" } },
        font: { color: { rgb: "334155" }, size: 9.5, name: "Calibri" },
        alignment: { horizontal: "center", vertical: "center" },
        border: bordaSuave
    };

    const estiloLinhaDSR = {
        fill: { fgColor: { rgb: "F1F5F9" } },
        font: { color: { rgb: "64748B" }, size: 9, italic: true, name: "Calibri" },
        alignment: { horizontal: "center", vertical: "center" },
        border: bordaSuave
    };

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' };
            const cell = worksheet[cellAddress];

            if (R === 0) {
                cell.s = estiloTitulo;
            } else if (R >= 2 && R <= 8) {
                if ([0, 4, 5, 7].includes(C) && cell.v) {
                    cell.s = estiloRotuloInfo;
                } else {
                    cell.s = estiloValorInfo;
                }
            } else if (R === 10) {
                cell.s = estiloHeaderTabela;
            } else if (R >= 11 && R < idxTitle - 1) {
                const isDSR = String(matrizPlanilha[R][0] || "").includes("DOM");
                const isPar = (R % 2 === 0);

                if (isDSR) {
                    cell.s = JSON.parse(JSON.stringify(estiloLinhaDSR));
                } else {
                    cell.s = isPar ? JSON.parse(JSON.stringify(estiloLinhaCinza)) : JSON.parse(JSON.stringify(estiloLinhaBranca));
                }

                if (C === 1 || C === 8) {
                    cell.s.alignment = { horizontal: "left", vertical: "center" };
                }

                if (C === 6) {
                    cell.s.font = { bold: true, color: { rgb: "059669" }, size: 9.5 };
                }
                if (C === 7) {
                    const vStr = String(cell.v || "");
                    if (vStr.startsWith("+")) {
                        cell.s.font = { bold: true, color: { rgb: "059669" }, size: 9.5 };
                    } else if (vStr.startsWith("-")) {
                        cell.s.font = { bold: true, color: { rgb: "DC2626" }, size: 9.5 };
                    }
                }
            } else if (R === idxTitle) {
                cell.s = {
                    fill: { fgColor: { rgb: "0F172A" } },
                    font: { bold: true, color: { rgb: "FFFFFF" }, size: 10 },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: bordaSuave
                };
            } else if (R >= idxCarga && R <= idxSaldo) {
                if (C <= 5) {
                    cell.s = {
                        fill: { fgColor: { rgb: "F8FAFC" } },
                        font: { bold: true, color: { rgb: "334155" }, size: 9.5 },
                        alignment: { horizontal: "right", vertical: "center" },
                        border: bordaSuave
                    };
                } else {
                    let corTexto = "0F172A";
                    if (R === idxSaldo) {
                        corTexto = saldoFinal > 0 ? "059669" : (saldoFinal < 0 ? "DC2626" : "0F172A");
                    }
                    cell.s = {
                        fill: { fgColor: { rgb: "FFFFFF" } },
                        font: { bold: true, color: { rgb: corTexto }, size: 10.5 },
                        alignment: { horizontal: "center", vertical: "center" },
                        border: bordaSuave
                    };
                }
            } else if (R === idxDeclaracao) {
                cell.s = {
                    font: { italic: true, color: { rgb: "64748B" }, size: 8.5 },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            } else if (R === idxLinhaAssinatura) {
                cell.s = {
                    font: { bold: true, color: { rgb: "1E293B" }, size: 10 },
                    alignment: { horizontal: "center", vertical: "top" },
                    border: { top: { style: "medium", color: { rgb: "0F172A" } } }
                };
            }
        }
    }

    // Mesclagens Estruturais
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, 
        
        { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } }, 
        { s: { r: 2, c: 6 }, e: { r: 2, c: 8 } }, 
        { s: { r: 3, c: 1 }, e: { r: 3, c: 8 } }, 
        
        { s: { r: 5, c: 1 }, e: { r: 5, c: 3 } }, 
        { s: { r: 5, c: 5 }, e: { r: 5, c: 6 } }, 
        { s: { r: 5, c: 8 }, e: { r: 5, c: 8 } }, 

        { s: { r: 6, c: 1 }, e: { r: 6, c: 3 } }, 
        { s: { r: 6, c: 5 }, e: { r: 6, c: 6 } }, 

        { s: { r: 7, c: 1 }, e: { r: 7, c: 3 } }, 
        { s: { r: 7, c: 5 }, e: { r: 7, c: 6 } }, 

        { s: { r: 8, c: 1 }, e: { r: 8, c: 3 } }, 
        { s: { r: 8, c: 5 }, e: { r: 8, c: 6 } }, 

        { s: { r: idxTitle, c: 0 }, e: { r: idxTitle, c: 8 } }, 
        { s: { r: idxCarga, c: 0 }, e: { r: idxCarga, c: 5 } }, 
        { s: { r: idxCarga, c: 6 }, e: { r: idxCarga, c: 8 } }, 
        { s: { r: idxTrab, c: 0 }, e: { r: idxTrab, c: 5 } }, 
        { s: { r: idxTrab, c: 6 }, e: { r: idxTrab, c: 8 } }, 
        { s: { r: idxSaldo, c: 0 }, e: { r: idxSaldo, c: 5 } }, 
        { s: { r: idxSaldo, c: 6 }, e: { r: idxSaldo, c: 8 } }, 

        { s: { r: idxDeclaracao, c: 0 }, e: { r: idxDeclaracao, c: 8 } },
        { s: { r: idxLinhaAssinatura, c: 2 }, e: { r: idxLinhaAssinatura, c: 6 } }
    ];

    // Largura das Colunas
    worksheet['!cols'] = [
        { wch: 18 }, // Data
        { wch: 36 }, // Colaborador
        { wch: 10 }, // Entrada
        { wch: 12 }, // Almoço Ida
        { wch: 14 }, // Almoço Volta
        { wch: 10 }, // Saída
        { wch: 13 }, // Horas Trab.
        { wch: 13 }, // Horas Extras
        { wch: 40 }  // Observações
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Folha_de_Ponto");
    XLSX.writeFile(workbook, `Folha_Ponto_${colabNome.replace(/ /g, "_")}.xlsx`);
}

let idConfigNuvemAtual = null;

async function buscarCoordenadasPorCEP() {
    const cepInput = document.getElementById("cepBusca").value.replace(/\D/g, '');
    const numInput = document.getElementById("numeroBusca").value.trim();

    if (cepInput.length !== 8) {
        exibirAlertaTop("⚠️ Aviso", "Por favor, digite um CEP válido com 8 dígitos.");
        return;
    }

    const btn = document.getElementById("btnBuscarCep");
    const textoOriginal = btn.innerText;
    btn.innerText = "⏳ Buscando Endereço...";
    btn.disabled = true;

    try {
        const resViaCep = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
        const dadosCep = await resViaCep.json();

        if (dadosCep.erro) throw new Error("CEP não encontrado na base de dados.");

        const enderecoCompleto = `${dadosCep.logradouro}${numInput ? ', ' + numInput : ''}, ${dadosCep.bairro}, ${dadosCep.localidade} - ${dadosCep.uf}`;
        
        btn.innerText = "⏳ Buscando Coordenadas...";

        const query = encodeURIComponent(`${dadosCep.logradouro}, ${dadosCep.localidade}, ${dadosCep.uf}, Brazil`);
        const resGeo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`);
        const dadosGeo = await resGeo.json();

        if (dadosGeo.length > 0) {
            document.getElementById("latitude").value = dadosGeo[0].lat;
            document.getElementById("longitude").value = dadosGeo[0].lon;
            document.getElementById("boxEndereco").style.display = "block";
            document.getElementById("enderecoTexto").innerText = enderecoCompleto;
            exibirAlertaTop("📍 Sucesso", "Endereço e coordenadas localizados com sucesso!");
        } else {
            const queryGenerica = encodeURIComponent(`${dadosCep.localidade}, ${dadosCep.uf}, Brazil`);
            const resGeoGen = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${queryGenerica}&limit=1`);
            const dadosGeoGen = await resGeoGen.json();

            if(dadosGeoGen.length > 0) {
                document.getElementById("latitude").value = dadosGeoGen[0].lat;
                document.getElementById("longitude").value = dadosGeoGen[0].lon;
                document.getElementById("boxEndereco").style.display = "block";
                document.getElementById("enderecoTexto").innerText = `${enderecoCompleto} (Coordenada aproximada pela cidade)`;
                exibirAlertaTop("📍 Sucesso Parcial", "Coordenadas aproximadas localizadas pela cidade.");
            } else {
                throw new Error("Não foi possível encontrar as coordenadas exatas para este CEP.");
            }
        }
    } catch (error) {
        exibirAlertaTop("⚠️ Erro", error.message || "Falha ao buscar dados de localização.");
        document.getElementById("boxEndereco").style.display = "none";
    } finally {
        btn.innerText = textoOriginal;
        btn.disabled = false;
    }
}

function obterLocalizacaoAtual() {
    if (!navigator.geolocation) {
        exibirAlertaTop("Erro", "Geolocalização não é suportada pelo seu navegador.");
        return;
    }

    const btn = document.getElementById("btnGpsConfigs");
    const textoOriginal = btn.innerText;
    btn.innerText = "⏳ Buscando...";
    btn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById("latitude").value = position.coords.latitude;
            document.getElementById("longitude").value = position.coords.longitude;
            document.getElementById("boxEndereco").style.display = "block";
            document.getElementById("enderecoTexto").innerText = "Localização capturada via GPS do dispositivo.";
            
            btn.innerText = textoOriginal;
            btn.disabled = false;
            exibirAlertaTop("📍 Sucesso", "Coordenadas capturadas com sucesso via GPS!");
        },
        (error) => {
            btn.innerText = textoOriginal;
            btn.disabled = false;
            exibirAlertaTop("⚠️ Erro de GPS", "Não foi possível obter a localização. Verifique as permissões do navegador.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function salvarConfiguracoes() {
    const btnSalvar = document.getElementById("btnSalvarConfigs");
    if(!btnSalvar) return;
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = "⏳ Salvando na Nuvem...";

    const configs = {
        empresaEmail: PREFIXO_EMPRESA,
        nomeEmpresa: document.getElementById("nomeEmpresa").value || sessionStorage.getItem("nome_empresa_ativa"),
        cep: document.getElementById("cepBusca").value,
        numero: document.getElementById("numeroBusca").value,
        latitude: document.getElementById("latitude").value,
        longitude: document.getElementById("longitude").value,
        raio: document.getElementById("raioTolerancia").value,
        endereco: document.getElementById("enderecoTexto").innerText
    };
    
    try {
        if (idConfigNuvemAtual) {
            await db.collection("configuracoes_empresa").doc(idConfigNuvemAtual).update(configs);
        } else {
            const docRef = await db.collection("configuracoes_empresa").add(configs);
            idConfigNuvemAtual = docRef.id;
        }

        const elSidebar = document.getElementById("sidebarNomeEmpresa");
        if(elSidebar) elSidebar.innerText = configs.nomeEmpresa;

        controlarCamposConfiguracao(true);
        btnSalvar.classList.remove("btn-primary");
        btnSalvar.classList.add("btn-success");
        btnSalvar.innerText = "✓ Configurações Salvas na Nuvem!";
        
        setTimeout(() => {
            btnSalvar.classList.remove("btn-success");
            btnSalvar.classList.add("btn-primary");
            btnSalvar.innerText = "Salvar Configurações";
        }, 3000);

    } catch (error) {
        exibirAlertaTop("⚠️ Erro", "Falha ao salvar configurações na nuvem.");
        btnSalvar.disabled = false;
        btnSalvar.innerText = "Salvar Configurações";
    }
}

async function carregarConfigsNuvem() {
    try {
        const snapshot = await db.collection("configuracoes_empresa").where("empresaEmail", "==", PREFIXO_EMPRESA).get();
        let configs = {};
        
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            configs = doc.data();
            idConfigNuvemAtual = doc.id;
        }
        
        const nomeExibicao = configs.nomeEmpresa || sessionStorage.getItem("nome_empresa_ativa") || "Empresa Parceira";

        if(document.getElementById("nomeEmpresa")) document.getElementById("nomeEmpresa").value = nomeExibicao;
        if(document.getElementById("cepBusca")) document.getElementById("cepBusca").value = configs.cep || "";
        if(document.getElementById("numeroBusca")) document.getElementById("numeroBusca").value = configs.numero || "";
        if(document.getElementById("latitude")) document.getElementById("latitude").value = configs.latitude || "";
        if(document.getElementById("longitude")) document.getElementById("longitude").value = configs.longitude || "";
        if(document.getElementById("raioTolerancia")) document.getElementById("raioTolerancia").value = configs.raio || "50";
        
        if(configs.endereco && document.getElementById("boxEndereco")) {
            document.getElementById("boxEndereco").style.display = "block";
            document.getElementById("enderecoTexto").innerText = configs.endereco;
        }

        const elSidebar = document.getElementById("sidebarNomeEmpresa");
        if(elSidebar) elSidebar.innerText = nomeExibicao;

    } catch (error) {
        console.error("Erro ao carregar configs:", error);
    }

function focarEdicaoConfigs() {
    controlarCamposConfiguracao(false);
    const inputNome = document.getElementById("nomeEmpresa");
    if(inputNome) inputNome.focus();
}

function controlarCamposConfiguracao(bloquear) {
    if(document.getElementById("nomeEmpresa")) document.getElementById("nomeEmpresa").disabled = bloquear;
    if(document.getElementById("cepBusca")) document.getElementById("cepBusca").disabled = bloquear;
    if(document.getElementById("numeroBusca")) document.getElementById("numeroBusca").disabled = bloquear;
    if(document.getElementById("latitude")) document.getElementById("latitude").disabled = bloquear;
    if(document.getElementById("longitude")) document.getElementById("longitude").disabled = bloquear;
    if(document.getElementById("raioTolerancia")) document.getElementById("raioTolerancia").disabled = bloquear;
    if(document.getElementById("btnSalvarConfigs")) document.getElementById("btnSalvarConfigs").disabled = bloquear;
    
    if(document.getElementById("btnGpsConfigs")) document.getElementById("btnGpsConfigs").disabled = bloquear;
    if(document.getElementById("btnBuscarCep")) document.getElementById("btnBuscarCep").disabled = bloquear;
} // Fecha a função controlarCamposConfiguracao
});

