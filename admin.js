import { auth, db } from './firebase-config.js';
import { signOut, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

// ==========================================
// CONFIGURAÇÃO DOS MENUS DE NAVEGAÇÃO
// ==========================================
const btnCadastro = document.getElementById('menu-cadastro');
const btnRelatorios = document.getElementById('menu-relatorios');
const btnConfig = document.getElementById('menu-config');
const btnSair = document.getElementById('btnSair');

const liCadastro = document.getElementById('li-cadastro');
const liRelatorios = document.getElementById('li-relatorios');
const liConfig = document.getElementById('li-config');

const boxCadastro = document.getElementById('sec-cadastro');
const boxRelatorios = document.getElementById('sec-relatorios');
const boxConfig = document.getElementById('sec-config');
const txtTitulo = document.getElementById('titulo-pagina');

function resetarNavegacao() {
    if (boxCadastro) boxCadastro.style.display = 'none';
    if (boxRelatorios) boxRelatorios.style.display = 'none';
    if (boxConfig) boxConfig.style.display = 'none';
    
    if (liCadastro) liCadastro.classList.remove('active');
    if (liRelatorios) liRelatorios.classList.remove('active');
    if (liConfig) liConfig.classList.remove('active');
}

if (btnCadastro) {
    btnCadastro.addEventListener('click', function(evento) {
        evento.preventDefault();
        resetarNavegacao();
        if (boxCadastro) boxCadastro.style.display = 'block';
        if (liCadastro) liCadastro.classList.add('active');
        if (txtTitulo) txtTitulo.textContent = 'Gestão de Pessoas e Acessos';
    });
}

if (btnRelatorios) {
    btnRelatorios.addEventListener('click', function(evento) {
        evento.preventDefault();
        resetarNavegacao();
        if (boxRelatorios) boxRelatorios.style.display = 'block';
        if (liRelatorios) liRelatorios.classList.add('active');
        if (txtTitulo) txtTitulo.textContent = 'Relatórios e Fechamento';
    });
}

if (btnConfig) {
    btnConfig.addEventListener('click', function(evento) {
        evento.preventDefault();
        resetarNavegacao();
        if (boxConfig) boxConfig.style.display = 'block';
        if (liConfig) liConfig.classList.add('active');
        if (txtTitulo) txtTitulo.textContent = 'Configurações do Sistema';
        carregarConfiguracoes();
    });
}

if (btnSair) {
    btnSair.addEventListener('click', async function(evento) {
        evento.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (erro) {
            console.error("Erro ao sair:", erro);
        }
    });
}

// ==========================================
// PROCESSO DE CADASTRO DE USUÁRIOS
// ==========================================
const cadastroForm = document.getElementById('cadastroForm');
const msgCadastro = document.getElementById('msgCadastro');

if (cadastroForm) {
    cadastroForm.addEventListener('submit', async function(evento) {
        evento.preventDefault();
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
            setTimeout(function() { if (msgCadastro) msgCadastro.style.display = 'none'; }, 4000);
        } catch (erro) {
            if (msgCadastro) {
                msgCadastro.style.color = '#dc2626';
                msgCadastro.textContent = 'Erro: ' + erro.message;
            }
        }
    });
}

// ==========================================
// PROCESSO DE CONFIGURAÇÃO (GEOLOCALIZAÇÃO)
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
    } catch (erro) {
        console.error("Erro ao obter dados de config:", erro);
    }
}

if (configForm) {
    configForm.addEventListener('submit', async function(evento) {
        evento.preventDefault();
        if (msgConfig) {
            msgConfig.style.display = 'block';
            msgConfig.style.color = '#3b82f6';
            msgConfig.textContent = 'Gravando...';
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
                msgConfig.textContent = 'Configurações gravadas!';
            }
            setTimeout(function() { if (msgConfig) msgConfig.style.display = 'none'; }, 4000);
        } catch (erro) {
            if (msgConfig) {
                msgConfig.style.color = '#dc2626';
                msgConfig.textContent = 'Erro ao gravar: ' + erro.message;
            }
        }
    });
}
