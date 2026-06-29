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

// Pega de qual empresa o RH logou
const PREFIXO_EMPRESA = sessionStorage.getItem("email_empresa_ativa"); 

let usuarioSelecionadoId = null;
let bancoUsuarios = [];

document.addEventListener("DOMContentLoaded", async () => {
    // Valida se o ADMIN DA EMPRESA está autenticado legitimamente
    if (!sessionStorage.getItem("admin_autenticado") || !PREFIXO_EMPRESA) {
        window.location.href = "login-admin.html"; 
        return;
    }
    document.getElementById("sidebarNomeEmpresa").innerText = sessionStorage.getItem("nome_empresa_ativa");
    
    await carregarConfigsNuvem();
    await carregarUsuariosDaNuvem();
});

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
    if(tabela) tabela.innerHTML = `<tr><td colspan="10" class="text-center text-muted small py-3">⏳ Carregando dados da Nuvem...</td></tr>`;
    
    try {
        const snapshot = await db.collection("usuarios_ponto").where("empresaEmail", "==", PREFIXO_EMPRESA).get();
        bancoUsuarios = [];
        snapshot.forEach(doc => {
            bancoUsuarios.push({ firebaseId: doc.id, ...doc.data() });
        });
        renderTabelaComAtualizacao();
        sincronizarFiltrosColaboradores();
    } catch (error) {
        if(tabela) tabela.innerHTML = `<tr><td colspan="10" class="text-center text-danger small py-3">⚠️ Erro ao carregar equipe.</td></tr>`;
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
        tabela.innerHTML = `<tr><td colspan="10" class="text-center text-muted small py-3">Nenhum funcionário cadastrado.</td></tr>`;
        return;
    }

    bancoUsuarios.forEach((u, index) => {
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

// ==========================================
// SEÇÃO CORRIGIDA: RELATÓRIOS CONECTADOS À NUVEM
// ==========================================

async function puxarLogsEFiltrar() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    const btn = document.getElementById('btnFiltrarTela');
    if(btn) { btn.disabled = true; btn.innerHTML = "⏳ Buscando na Nuvem..."; }

    let dadosBrutosNuvem = [];

    try {
        // Consulta baseada no email da empresa ativa para isolar dados de forma segura
        const queryRef = db.collection("historico_pontos").where("empresaEmail", "==", PREFIXO_EMPRESA);
        const snapshot = await queryRef.get();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.data) return; 
            // Filtra o colaborador específico selecionado ou puxa todos
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

        if(mEntrada !== null && calcAlmIda !== null && calcAlmIda > mEntrada) {
            minutosTrabalhados += (calcAlmIda - mEntrada);
        }
        if(mAlmVolta !== null && calcSaida !== null && calcSaida > mAlmVolta) {
            minutosTrabalhados += (calcSaida - mAlmVolta);
        }

        r.minutosTrabalhadosNum = minutosTrabalhados;
        r.horasTrabalhadas = formatarMinutosParaString(minutosTrabalhados);

        const partesData = r.data.split('/');
        if (partesData.length === 3) {
            const objetoData = new Date(partesData[2], partesData[1] - 1, partesData[0]);
            const diaDaSemana = objetoData.getDay(); 

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

            if(minutosTrabalhados > cargaObrigatoriaDoDia) {
                const extra = minutosTrabalhados - cargaObrigatoriaDoDia;
                r.minutosExtrasNum = extra;
                r.horasExtras = formatarMinutosParaString(extra);
            } else {
                r.minutosExtrasNum = 0;
                r.horasExtras = "00:00";
            }
        }
    });

    return listaFinal;
}

async function filtrarRelatorioTela() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    const filtroInicio = document.getElementById('filtroRelatorioInicio').value;
    const filtroFim = document.getElementById('filtroRelatorioFim').value;
    const tabelaBody = document.getElementById('tabelaRelatoriosBody');
    if(!tabelaBody) return;
    
    tabelaBody.innerHTML = "";

    if (filtroColab === "todos") {
        tabelaBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted small py-4">⚠️ Por favor, selecione um colaborador específico para carregar o relatório.</td></tr>`;
        return;
    }

    let dadosConsolidados = await puxarLogsEFiltrar();

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

    if (dadosConsolidados.length === 0) {
        tabelaBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted small py-4">Nenhum registro encontrado para este colaborador no período selecionado.</td></tr>`;
        return;
    }

    let acumuladorTrabalhadas = 0;
    let acumuladorExtras = 0;

    dadosConsolidados.sort((a,b) => {
        if(!a.data || !b.data) return 0;
        const pa = a.data.split('/');
        const pb = b.data.split('/');
        if(pa.length !== 3 || pb.length !== 3) return 0;
        return new Date(pa[2], pa[1]-1, pa[0]) - new Date(pb[2], pb[1]-1, pb[0]);
    });

    dadosConsolidados.forEach(r => {
        acumuladorTrabalhadas += r.minutosTrabalhadosNum;
        acumuladorExtras += r.minutosExtrasNum;

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

    const trTotal = document.createElement('tr');
    trTotal.style.backgroundColor = "#e5e7eb";
    trTotal.className = "table-secondary fw-bold text-dark";
    trTotal.innerHTML = `
        <td colspan="6" class="text-end pe-3">TOTAL DO PERÍODO SELECIONADO:</td>
        <td class="text-success fw-extrabold">${formatarMinutosParaString(acumuladorTrabalhadas)}</td>
        <td class="text-danger fw-extrabold">${formatarMinutosParaString(acumuladorExtras)}</td>
    `;
    tabelaBody.appendChild(trTotal);
}

async function exportarPontosExcel() {
    const filtroColab = document.getElementById('filtroRelatorioColaborador').value;
    
    if (filtroColab === "todos") {
        exibirAlertaTop("Selecione um Colaborador", "Por favor, defina qual colaborador deseja exportar para gerar o arquivo formatado.");
        return;
    }

    let dadosParaPlanilha = await puxarLogsEFiltrar();
    
    const filtroInicio = document.getElementById('filtroRelatorioInicio').value;
    const filtroFim = document.getElementById('filtroRelatorioFim').value;
    
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

    const colabNome = dadosParaPlanilha[0].nome;
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    
    const matrizPlanilha = [
        ["DRE - ESPELHO DE PONTO EXECUTIVO"],
        [`Colaborador: ${colabNome} | Emissão: ${dataEmissao}`],
        [],
        ["Data", "Colaborador", "Entrada", "Almoço Ida", "Almoço Volta", "Saída", "Horas Trab.", "Horas Extras"]
    ];

    let somaTrab = 0;
    let somaExtra = 0;

    dadosParaPlanilha.forEach(r => {
        somaTrab += r.minutosTrabalhadosNum;
        somaExtra += r.minutosExtrasNum;
        matrizPlanilha.push([r.data, r.nome, r.entrada, r.almocoIda, r.almocoVolta, r.saida, r.horasTrabalhadas, r.horasExtras]);
    });

    matrizPlanilha.push([]);
    matrizPlanilha.push(["TOTAL DE HORAS TRABALHADAS DO PERÍODO:", "", "", "", "", "", formatarMinutosParaString(somaTrab), formatarMinutosParaString(somaExtra)]);

    const worksheet = XLSX.utils.aoa_to_sheet(matrizPlanilha);

    const orangeFill = { fill: { fgColor: { rgb: "F97316" } }, font: { bold: true, color: { rgb: "FFFFFF" }, size: 12 }, alignment: { horizontal: "center", vertical: "center" } };
    const greyTotalAlignRight = { fill: { fgColor: { rgb: "E5E7EB" } }, font: { bold: true, color: { rgb: "000000" } }, alignment: { horizontal: "right", vertical: "center" } };
    const greyTotalGreen = { fill: { fgColor: { rgb: "E5E7EB" } }, font: { bold: true, color: { rgb: "16A34A" } }, alignment: { horizontal: "center", vertical: "center" } };
    const greyTotalRed = { fill: { fgColor: { rgb: "E5E7EB" } }, font: { bold: true, color: { rgb: "EF4444" } }, alignment: { horizontal: "center", vertical: "center" } };

    if(worksheet['A1']) worksheet['A1'].s = orangeFill;
    
    const ultimaLinhaIndex = matrizPlanilha.length;
    if(worksheet[`A${ultimaLinhaIndex}`]) worksheet[`A${ultimaLinhaIndex}`].s = greyTotalAlignRight;
    if(worksheet[`G${ultimaLinhaIndex}`]) worksheet[`G${ultimaLinhaIndex}`].s = greyTotalGreen;
    if(worksheet[`H${ultimaLinhaIndex}`]) worksheet[`H${ultimaLinhaIndex}`].s = greyTotalRed;

    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, 
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, 
        { s: { r: ultimaLinhaIndex - 1, c: 0 }, e: { r: ultimaLinhaIndex - 1, c: 5 } } 
    ];

    worksheet['!cols'] = [
        { wch: 12 }, { wch: 45 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Espelho_Executivo");
    XLSX.writeFile(workbook, `Espelho_Ponto_${colabNome.replace(/ /g, "_")}.xlsx`);
}

// ==========================================
// RESTANTE DO ARQUIVO MANTIDO INTACTO
// ==========================================

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

function obtenerLocalizacaoAtual() {
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
}
