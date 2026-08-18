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

let listaEmpresas = [];
let idEmpresaExcluir = null;

document.addEventListener("DOMContentLoaded", () => {
    carregarEmpresasNuvem();
});

function mascaraCNPJ(input) {
    let v = input.value.replace(/\D/g, '');
    if (v.length > 14) v = v.substring(0, 14);
    v = v.replace(/^(\d{2})(\d)/, '$1.$2');
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
    v = v.replace(/(\d{4})(\d)/, '$1-$2');
    input.value = v;
}

function fazerLogoutSuperAdmin() {
    sessionStorage.clear();
    window.location.href = "login-admin.html";
}

async function carregarEmpresasNuvem() {
    const tbody = document.getElementById("tabelaEmpresasBody");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">⏳ Carregando empresas da nuvem...</td></tr>`;

    try {
        const snapshot = await db.collection("empresas_clientes").get();
        listaEmpresas = [];
        snapshot.forEach(doc => {
            listaEmpresas.push({ docId: doc.id, ...doc.data() });
        });

        // Ordena pela data/hora de cadastro mais recente
        listaEmpresas.sort((a, b) => {
            const timeA = a.timestamp && typeof a.timestamp.toMillis === 'function' ? a.timestamp.toMillis() : 0;
            const timeB = b.timestamp && typeof b.timestamp.toMillis === 'function' ? b.timestamp.toMillis() : 0;
            return timeB - timeA;
        });

        renderizarTabelaEmpresas();
    } catch (error) {
        console.error("Erro ao carregar empresas:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">⚠️ Falha ao buscar empresas.</td></tr>`;
    }
}

function renderizarTabelaEmpresas() {
    const tbody = document.getElementById("tabelaEmpresasBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (listaEmpresas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma empresa cadastrada.</td></tr>`;
        return;
    }

    listaEmpresas.forEach((emp, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="fw-bold text-white">${emp.nome || "-"}</td>
            <td class="font-monospace text-secondary">${emp.cnpj || "-"}</td>
            <td class="text-light small" style="max-width: 250px;">${emp.endereco || "-"}</td>
            <td class="text-info">${emp.email || "-"}</td>
            <td><code class="text-warning font-monospace fw-bold">${emp.senha || "-"}</code></td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalEditarEmpresa(${index})">✏️ Editar</button>
                <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExcluirEmpresa('${emp.docId}', '${emp.nome}')">🗑️ Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function cadastrarEmpresaMaster(event) {
    event.preventDefault();
    const btn = document.getElementById("btnSalvarEmpresa");
    btn.disabled = true;
    btn.innerHTML = "⏳ Salvando na Nuvem...";

    const novaEmpresa = {
        nome: document.getElementById("cadEmpNome").value.trim(),
        cnpj: document.getElementById("cadEmpCnpj").value.trim(),
        endereco: document.getElementById("cadEmpEndereco").value.trim() || "-",
        email: document.getElementById("cadEmpEmail").value.trim().toLowerCase(),
        senha: document.getElementById("cadEmpSenha").value.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await db.collection("empresas_clientes").add(novaEmpresa);
        listaEmpresas.unshift({ docId: docRef.id, ...novaEmpresa });
        renderizarTabelaEmpresas();

        document.getElementById("formCadEmpresa").reset();
        alert(`Empresa "${novaEmpresa.nome}" cadastrada com sucesso!`);
    } catch (error) {
        console.error("Erro ao cadastrar empresa:", error);
        alert("Erro ao salvar empresa no banco de dados.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Salvar Registro na Nuvem";
    }
}

function abrirModalEditarEmpresa(index) {
    const emp = listaEmpresas[index];
    if (!emp) return;

    document.getElementById("editDocId").value = emp.docId;
    document.getElementById("editEmpNome").value = emp.nome || "";
    document.getElementById("editEmpCnpj").value = emp.cnpj || "";
    document.getElementById("editEmpEndereco").value = emp.endereco && emp.endereco !== "-" ? emp.endereco : "";
    document.getElementById("editEmpEmail").value = emp.email || "";
    document.getElementById("editEmpSenha").value = emp.senha || "";

    new bootstrap.Modal(document.getElementById("modalEditarEmpresa")).show();
}

async function confirmarEdicaoEmpresa(event) {
    event.preventDefault();
    const docId = document.getElementById("editDocId").value;
    const btn = document.getElementById("btnConfirmarEditEmpresa");
    btn.disabled = true;
    btn.innerHTML = "⏳ Salvando...";

    const dadosAtualizados = {
        nome: document.getElementById("editEmpNome").value.trim(),
        cnpj: document.getElementById("editEmpCnpj").value.trim(),
        endereco: document.getElementById("editEmpEndereco").value.trim() || "-",
        email: document.getElementById("editEmpEmail").value.trim().toLowerCase(),
        senha: document.getElementById("editEmpSenha").value.trim()
    };

    try {
        await db.collection("empresas_clientes").doc(docId).update(dadosAtualizados);

        const item = listaEmpresas.find(e => e.docId === docId);
        if (item) Object.assign(item, dadosAtualizados);

        bootstrap.Modal.getInstance(document.getElementById("modalEditarEmpresa")).hide();
        renderizarTabelaEmpresas();
        alert("Dados da empresa atualizados com sucesso!");
    } catch (error) {
        console.error("Erro ao atualizar empresa:", error);
        alert("Falha ao salvar as alterações da empresa.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Salvar Alterações";
    }
}

function abrirModalExcluirEmpresa(docId, nome) {
    idEmpresaExcluir = docId;
    document.getElementById("txtNomeEmpresaExclusao").innerText = nome;
    new bootstrap.Modal(document.getElementById("modalExcluirEmpresa")).show();
}

async function executarExclusaoEmpresa() {
    if (!idEmpresaExcluir) return;
    const btn = document.getElementById("btnConfirmarDeleteEmpresa");
    btn.disabled = true;
    btn.innerHTML = "⏳ Excluindo...";

    try {
        await db.collection("empresas_clientes").doc(idEmpresaExcluir).delete();
        listaEmpresas = listaEmpresas.filter(e => e.docId !== idEmpresaExcluir);
        
        bootstrap.Modal.getInstance(document.getElementById("modalExcluirEmpresa")).hide();
        renderizarTabelaEmpresas();
        alert("Empresa removida com sucesso.");
    } catch (error) {
        console.error("Erro ao excluir empresa:", error);
        alert("Falha ao excluir a empresa da nuvem.");
    } finally {
        btn.disabled = false;
        btn.innerHTML = "Sim, Remover";
    }
}
