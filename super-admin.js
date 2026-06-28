let empresaSelecionadaId = null;
let empresaParaExcluir = null;
let bancoEmpresas = JSON.parse(localStorage.getItem("banco_empresas_web")) || [];

// Máscaras
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

// Verificação de Segurança
document.addEventListener("DOMContentLoaded", () => {
    if (!sessionStorage.getItem("super_admin_autenticado")) {
        window.location.href = "index.html"; 
    }
    renderTabelaEmpresas();
});

function sairSuperAdmin() {
    sessionStorage.removeItem("super_admin_autenticado");
    window.location.href = "index.html";
}

// FUNÇÕES DE POP-UP E CÓPIA
function exibirAlertaTop(titulo, message) {
    document.getElementById('modalTitulo').innerText = titulo;
    document.getElementById('modalMensagem').innerHTML = `<p class="fs-6 text-secondary mb-0">${message}</p>`;
    new bootstrap.Modal(document.getElementById('modalFeedback')).show();
}

function copiarLinkEmpresa() {
    // O link de acesso da empresa é o login-admin.html
    const linkEmpresa = window.location.origin + "/login-admin.html";
    navigator.clipboard.writeText(linkEmpresa).then(() => {
        exibirAlertaTop("🔗 Link Copiado", "O link do painel para o gestor da empresa foi copiado para a área de transferência.");
    });
}

// CRUD EMPRESAS
function cadastrarEmpresa(event) {
    event.preventDefault();
    
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

    bancoEmpresas.push(novaEmpresa);
    localStorage.setItem("banco_empresas_web", JSON.stringify(bancoEmpresas));
    
    document.getElementById("formEmpresa").reset();
    renderTabelaEmpresas();
    
    // Substituindo o alert nativo feio pelo pop-up moderno
    exibirAlertaTop("🏢 Cadastrado", `A empresa <strong>${novaEmpresa.nome}</strong> foi cadastrada com sucesso!<br>O acesso já está liberado.`);
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

function bloquearEmpresa(index) {
    const emp = bancoEmpresas[index];
    emp.status = emp.status === "ATIVO" ? "BLOQUEADO" : "ATIVO";
    localStorage.setItem("banco_empresas_web", JSON.stringify(bancoEmpresas));
    renderTabelaEmpresas();
}

function excluirEmpresa(index) {
    // Agora chama o modal moderno em vez do confirm() nativo
    empresaParaExcluir = index;
    document.getElementById('nomeEmpresaExclusao').innerText = bancoEmpresas[index].nome;
    new bootstrap.Modal(document.getElementById('modalExclusao')).show();
}

function executarExclusaoDefinitiva() {
    if (empresaParaExcluir === null) return;
    
    bancoEmpresas.splice(empresaParaExcluir, 1);
    localStorage.setItem("banco_empresas_web", JSON.stringify(bancoEmpresas));
    
    // Fecha o modal de exclusão
    const elementoModal = document.getElementById('modalExclusao');
    const modalInstance = bootstrap.Modal.getInstance(elementoModal);
    if(modalInstance) {
        modalInstance.hide();
    } else {
        elementoModal.classList.remove('show');
        elementoModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    }

    renderTabelaEmpresas();
    
    setTimeout(() => {
        exibirAlertaTop("🗑️ Removido", "A empresa foi excluída da base de dados permanentemente.");
    }, 300);
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

function confirmarEdicaoEmpresa() {
    const emp = bancoEmpresas[empresaSelecionadaId];
    
    emp.nome = document.getElementById("editNomeEmpresa").value.trim();
    emp.cnpj = document.getElementById("editCnpj").value.trim();
    emp.endereco = document.getElementById("editEndereco").value.trim();
    emp.whatsapp = document.getElementById("editWhatsapp").value.trim();
    emp.email = document.getElementById("editEmail").value.trim().toLowerCase();

    localStorage.setItem("banco_empresas_web", JSON.stringify(bancoEmpresas));
    
    bootstrap.Modal.getInstance(document.getElementById("modalEditarEmpresa")).hide();
    renderTabelaEmpresas();
    
    // Alerta de sucesso moderno na edição
    setTimeout(() => {
        exibirAlertaTop("📝 Atualizado", "Os dados da empresa foram alterados com sucesso.");
    }, 300);
}
