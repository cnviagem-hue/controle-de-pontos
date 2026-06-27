import { auth, db } from './firebase-config.js';
import { signOut, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

const btnSair = document.getElementById('btnSair');

if (btnSair) {
    btnSair.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    });
}

// ==========================================
// NAVEGAÇÃO DOS MENUS (SPA)
// ==========================================
const menuCadastro = document.getElementById('menu-cadastro');
const menuRelatorios = document.getElementById('menu-relatorios');
const menuConfig = document.getElementById('menu-config');

const secCadastro = document.getElementById('sec-cadastro');
const secRelatorios = document.getElementById('sec-relatorios');
const secConfig = document.getElementById('sec-config');
const tituloPagina = document.getElementById('titulo-pagina');

function ocultarTelas() {
    if (secCadastro) secCadastro.style.display = 'none';
    if (secRelatorios) secRelatorios.style.display = 'none';
    if (secConfig) secConfig.style.display = 'none';
    if (menuCadastro) menuCadastro.classList.remove('active');
    if (menuRelatorios) menuRelatorios.classList.remove('active');
    if (menuConfig) menuConfig.classList.remove('active');
}

if (menuCadastro) {
    menuCadastro.addEventListener('click', (e) => {
        e.preventDefault(); ocultarTelas();
        if (secCadastro) secCadastro.style.display = 'block';
        menuCadastro.classList.add('active');
        if (tituloPagina) tituloPagina.textContent = 'Gestão de Pessoas e Acessos';
    });
}

if (menuRelatorios) {
    menuRelatorios.addEventListener('click', (e) => {
        e.preventDefault(); ocultarTelas();
        if (secRelatorios) secRelatorios.style.display = 'block';
        menuRelatorios.classList.add('active');
        if (tituloPagina) tituloPagina.textContent = 'Relatórios e Fechamento';
    });
}

if (menuConfig) {
    menuConfig.addEventListener('click', (e) => {
        e.preventDefault(); ocultarTelas();
        if (secConfig) secConfig.style.display = 'block';
        menuConfig.classList.add('active');
        if (tituloPagina) tituloPagina.textContent = 'Configurações do Sistema';
        carregarConfiguracoes();
    });
}

// ==========================================
// LÓGICA DE CADASTRO DE USUÁRIO
// ==========================================
const cadastroForm = document.getElementById('cadastroForm');
const msgCadastro = document.getElementById('msgCadastro');

if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msgCadastro) {
            msgCadastro.style.display = 'block';
            msgCadastro.style.color = '#3b82f6';
            msgCadastro.textContent = 'Processando cadastro...';
        }

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('emailNovo').value;
        const senha = document.getElementById('senhaNova').value;
        const tipoAcesso = document.getElementById('tipoAcesso').value;
        const horasSegSex = document.getElementById('horasSegSex').value;
        const horasSab = document.getElementById('horasSab').value;
        const horasDom = document.getElementById('horasDom').value;

        try {
            const app2 = initializeApp(auth.app.options, 'AppCadastro');
            const auth2 = getAuth(app2);
            const userCredential = await createUserWithEmailAndPassword(auth2, email, senha);
            const novoUsuario = userCredential.user;

            await setDoc(doc(db, "usuarios", novoUsuario.uid), {
                nome: nome,
                email: email,
                tipo: tipoAcesso, 
                cargaHoraria: { segSex: Number(horasSegSex), sabado: Number(horasSab), domingo: Number(horasDom) },
                dataCadastro: new Date().toISOString()
            });

            await signOut(auth2);
            if (msgCadastro) {
                msgCadastro.style.color = '#16a34a';
                msgCadastro.textContent = 'Usuário cadastrado com sucesso!';
            }
            cadastroForm.reset();
            setTimeout(() => { if (msgCadastro) msgCadastro.style.display = 'none'; }, 4000);
        } catch (error) {
            if (msgCadastro) {
                msgCadastro.style.color = '#dc2626';
                msgCadastro.textContent = 'Erro: ' + error.message;
            }
        }
    });
}

// ==========================================
// LÓGICA DE CONFIGURAÇÕES (GEOLOCALIZAÇÃO)
// ==========================================
const configForm = document.getElementById('configForm');
const msgConfig = document.getElementById('msgConfig');

async function carregarConfiguracoes() {
    try {
        const configDoc = await getDoc(doc(db, "sistema", "configGeral"));
        if (configDoc.exists()) {
            const data = configDoc.data();
            if (document.getElementById('latEmpresa')) document.getElementById('latEmpresa').value = data.latitude || '';
            if (document.getElementById('lngEmpresa')) document.getElementById('lngEmpresa').value = data.longitude || '';
            if (document.getElementById('raioPermitido')) document.getElementById('raioPermitido').value = data.raio || 50;
        }
    } catch (error) {
        console.error("Erro ao carregar configurações", error);
    }
}

if (configForm) {
    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (msgConfig) {
            msgConfig.style.display = 'block';
            msgConfig.style.color = '#3b82f6';
            msgConfig.textContent = 'Salvando...';
        }

        const lat = document.getElementById('latEmpresa').value;
        const lng = document.getElementById('lngEmpresa').value;
        const raio = document.getElementById('raioPermitido').value;

        try {
            await setDoc(doc(db, "sistema", "configGeral"), {
                latitude: Number(lat),
                longitude: Number(lng),
                raio: Number(raio)
            });
            if (msgConfig) {
                msgConfig.style.color = '#16a34a';
                msgConfig.textContent = 'Configurações salvas com sucesso!';
            }
            setTimeout(() => { if (msgConfig) msgConfig.style.display = 'none'; }, 4000);
        } catch (error) {
            if (msgConfig) {
                msgConfig.style.color = '#dc2626';
                msgConfig.textContent = 'Erro ao salvar: ' + error.message;
            }
        }
    });
}
