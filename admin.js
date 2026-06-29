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

// Inicializa a Nuvem
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let empresaSelecionadaId = null;
let empresaParaExcluir = null;
let bancoEmpresas = []; 

// Máscaras (Intactas)
function mascaraCNPJ(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 14) v = v.slice(0, 14);
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    input.value = v;
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

// Verificação de Segurança e Carregamento
document.addEventListener("DOMContentLoaded", async () => {
    if (!sessionStorage.getItem("super_admin_autenticado")) {
        window.location.href = "index.html"; 
    }
    await carregarEmpresasDaNuvem();
});

function sairSuperAdmin() {
    sessionStorage.removeItem("super_admin_autenticado");
    window.location.href = "index.html";
}

// FUNÇÕES DE POP-UP E CÓPIA E OLHINHO
function exibirAlertaTop(titulo, message) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalMensagem').innerHTML = `<p class="fs-6 text-secondary mb-0">${message}</p>`;
    new bootstrap.Modal(document.getElementById('modalFeedback')).show();
}

function copiarLinkEmpresa() {
    const linkEmpresa = window.location.origin + "/login-admin.html";
    navigator.clipboard.writeText(linkEmpresa).then(() => {
        exibirAlertaTop("🔗 Link Copiado", "O link do painel para o gestor da empresa foi copiado para a área de transferência.");
    });
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

// ==========================================
// NOVO: ALTERAR SENHA DO SUPER ADMIN
// ==========================================
function abrirModalSenhaSuperAdmin() {
    document.getElementById("novaSenhaSuper").value = "";
    new bootstrap.Modal(document.getElementById("modalSenhaSuperAdmin")).show();
}

async function salvarSenhaSuperAdmin() {
    const novaSenha = document.getElementById("novaSenhaSuper").value.trim();
    if (novaSenha.length < 6) {
        alert("A senha precisa ter no mínimo 6 caracteres.");
        return;
    }

    const btn = document.getElementById("btnSalvarNovaSenhaSuper");
    btn.disabled = true;
    btn.innerHTML = "⏳ Salvando na Nuvem...";

    try {
        // Salva a nova senha na nuvem na coleção de configurações globais
        await db.collection("configuracoes_plataforma").doc("super_admin").set({
            senha_acesso: novaSenha
        }, { merge: true });

        bootstrap.Modal.getInstance(document.getElementById("modalSenhaSuperAdmin")).hide();
        exibirAlertaTop("🔐 Senha Alterada", "Sua nova senha de Super Admin foi salva com sucesso na Nuvem!");

    } catch (error) {
        console.error("Erro ao salvar senha:", error);
        alert("Erro ao conectar com a nuvem.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Salvar Nova Senha";
    }
}

// ==========================================
// CRUD EMPRESAS (NA NUVEM)
// ==========================================
async function carregarEmpresasDaNuvem() {
    const tbody = document.getElementById("tabelaEmpresas");
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">⏳ Carregando dados da Nuvem...</td></tr>`;
    
    try {
        const snapshot = await db.collection("empresas_clientes").get();
        bancoEmpresas = [];
        snapshot.forEach(doc => {
            bancoEmpresas.push(doc.data());
        });
        renderTabelaEmpresas();
    } catch (error) {
        console.error("Erro na nuvem:", error);
        exibirAlertaTop("⚠️ Erro de Conexão", "Não foi possível carregar as empresas da nuvem.");
    }
}

async function cadastrarEmpresa(event) {
    event.preventDefault();
    
    const btnSalvar = document.getElementById("btnSalvarEmpresa");
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = "⏳ Salvando na Nuvem...";

    const novaEmpresa = {
        id: "EMP_" + new Date().getTime(),
        nome: document.getElementById("cadNomeEmpresa").value.trim(),
        cnpj: document.getElementById("cadCnpj").value.trim(),
        endereco: document.getElementById("cadEndereco").value.trim(),
        whatsapp: document.getElementById("cadWhatsapp").value.trim(),
        email: document.getElementById("cadEmail").value.trim().toLowerCase(),
        senhaAtual: "mudar123",
        status: "ATIVO",
        primeiroAcesso: true
    };

    try {
        await db.collection("empresas_clientes").doc(novaEmpresa.id).set(novaEmpresa);
        
        bancoEmpresas.push(novaEmpresa);
        document.getElementById("formEmpresa").reset();
        renderTabelaEmpresas();
        
        exibirAlertaTop("☁️ Salvo na Nuvem", `A empresa <strong>${novaEmpresa.nome}</strong> foi cadastrada globalmente com sucesso!`);
    } catch (error) {
        console.error("Erro ao salvar:", error);
        exibirAlertaTop("⚠️ Erro", "Falha ao gravar os dados na nuvem.");
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = "🏢 Cadastrar e Liberar Acesso";
    }
}

function renderTabelaEmpresas() {
    const tbody = document.getElementById("tabelaEmpresas");
    tbody.innerHTML = "";

    if (bancoEmpresas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Nenhuma empresa cadastrada na plataforma.</td></tr>`;
        return;
    }

    bancoEmpresas.forEach((emp, index) => {
        const badgeStatus = emp.status === "ATIVO" ? 'bg-success text-white' : 'bg-danger text-white';
        const txtSenha = emp.primeiroAcesso ? `<span class="badge bg-warning text-dark">Pendente (mudar123)</span>` : `<span class="badge bg-info text-dark">Senha Alterada</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="fw-bold text-dark">${emp.nome}</td>
            <td class="text-secondary small">${emp.cnpj}</td>
            <td class="text-secondary small">${emp.whatsapp}</td>
            <td class="fw-medium text-primary">${emp.email}</td>
            <td>${txtSenha}</td>
            <td><span class="badge ${badgeStatus} px-2">${emp.status}</span></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarEmpresa('${index}')">✏️ Editar</button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="bloquearEmpresa('${index}')">🔒 ${emp.status === 'ATIVO' ? 'Bloquear' : 'Ativar'}</button>
                <button class="btn btn-sm btn-danger" onclick="excluirEmpresa('${index}')">🗑️ Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function bloquearEmpresa(index) {
    const emp = bancoEmpresas[index];
    const novoStatus = emp.status === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    
    try {
        await db.collection("empresas_clientes").doc(emp.id).update({ status: novoStatus });
        emp.status = novoStatus;
        renderTabelaEmpresas();
    } catch (error) {
        exibirAlertaTop("⚠️ Erro", "Não foi possível atualizar o status na nuvem.");
    }
}

function excluirEmpresa(index) {
    empresaParaExcluir = index;
    document.getElementById('nomeEmpresaExclusao').innerText = bancoEmpresas[index].nome;
    new bootstrap.Modal(document.getElementById('modalExclusao')).show();
}

async function executarExclusaoDefinitiva() {
    if (empresaParaExcluir === null) return;
    
    const btnConfirmar = document.getElementById("btnConfirmarExclusao");
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = "⏳ Excluindo...";
    
    const empId = bancoEmpresas[empresaParaExcluir].id;

    try {
        await db.collection("empresas_clientes").doc(empId).delete();
        bancoEmpresas.splice(empresaParaExcluir, 1);
        
        const elementoModal = document.getElementById('modalExclusao');
        const modalInstance = bootstrap.Modal.getInstance(elementoModal);
        if(modalInstance) modalInstance.hide();

        renderTabelaEmpresas();
        
        setTimeout(() => {
            exibirAlertaTop("🗑️ Removido da Nuvem", "A empresa foi excluída de todos os servidores globalmente.");
        }, 300);
    } catch (error) {
        exibirAlertaTop("⚠️ Erro", "Falha ao tentar excluir da nuvem.");
    } finally {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = "Sim, Excluir";
    }
}

function abrirModalEditarEmpresa(index) {
    empresaSelecionadaId = index;
    const emp = bancoEmpresas[index];

    document.getElementById("editNomeEmpresa").value = emp.nome;
    document.getElementById("editCnpj").value = emp.cnpj;
    document.getElementById("editEndereco").value = emp.endereco;
    document.getElementById("editWhatsapp").value = emp.whatsapp;
    document.getElementById("editEmail").value = emp.email;

    new bootstrap.Modal(document.getElementById("modalEditarEmpresa")).show();
}

async function confirmarEdicaoEmpresa() {
    const emp = bancoEmpresas[empresaSelecionadaId];
    const btnEdit = document.getElementById("btnConfirmarEdicao");
    btnEdit.disabled = true;
    btnEdit.innerHTML = "⏳ Atualizando...";
    
    const dadosAtualizados = {
        nome: document.getElementById("editNomeEmpresa").value.trim(),
        cnpj: document.getElementById("editCnpj").value.trim(),
        endereco: document.getElementById("editEndereco").value.trim(),
        whatsapp: document.getElementById("editWhatsapp").value.trim(),
        email: document.getElementById("editEmail").value.trim().toLowerCase()
    };

    try {
        await db.collection("empresas_clientes").doc(emp.id).update(dadosAtualizados);
        Object.assign(emp, dadosAtualizados);
        
        bootstrap.Modal.getInstance(document.getElementById("modalEditarEmpresa")).hide();
        renderTabelaEmpresas();
        
        setTimeout(() => {
            exibirAlertaTop("☁️ Atualizado na Nuvem", "Os dados da empresa foram alterados e sincronizados globalmente.");
        }, 300);
    } catch (error) {
        exibirAlertaTop("⚠️ Erro", "Falha ao atualizar dados na nuvem.");
    } finally {
        btnEdit.disabled = false;
        btnEdit.innerHTML = "Salvar Alterações";
    }
}

// ==========================================
// AUTOMAÇÃO DE CEP 
// ==========================================
function mascaraCEPSuper(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length > 5) valor = valor.replace(/^(\d{5})(\d)/, '$1-$2');
    input.value = valor;
}

async function buscarCepSuper() {
    const cepInput = document.getElementById("cadCep").value.replace(/\D/g, '');
    if (cepInput.length !== 8) return;

    const inputEndereco = document.getElementById("cadEndereco");
    const placeholderOriginal = inputEndereco.placeholder;
    inputEndereco.placeholder = "Buscando endereço...";
    
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
        const dados = await res.json();
        
        if (!dados.erro) {
            inputEndereco.value = `${dados.logradouro}, Nº  - ${dados.bairro}, ${dados.localidade} - ${dados.uf}`;
            inputEndereco.focus(); 
        } else {
            inputEndereco.placeholder = placeholderOriginal;
            alert("⚠️ CEP não encontrado na base dos Correios.");
        }
    } catch (error) {
        inputEndereco.placeholder = placeholderOriginal;
        console.error("Erro ao buscar CEP", error);
    }
}
