import { auth, db } from './firebase-config.js';
import { signOut, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

// Pegando elementos do Menu
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

function alternarTela(telaVisivel, liAtivo, textoTitulo) {
    if (boxCadastro) boxCadastro.style.display = 'none';
    if (boxRelatorios) boxRelatorios.style.display = 'none';
    if (boxConfig) boxConfig.style.display = 'none';
    
    if (liCadastro) liCadastro.classList.remove('active');
    if (liRelatorios) liRelatorios.classList.remove('active');
    if (liConfig) liConfig.classList.remove('active');

    if (telaVisivel) telaVisivel.style.display = 'block';
    if (liAtivo) liAtivo.classList.add('active');
    if (txtTitulo) txtTitulo.textContent = textoTitulo;
}

if (btnCadastro) { btnCadastro.onclick = (e) => { e.preventDefault(); alternarTela(boxCadastro, liCadastro, 'Gestão de Pessoas'); }; }
if (btnRelatorios) { btnRelatorios.onclick = (e) => { e.preventDefault(); alternarTela(boxRelatorios, liRelatorios, 'Relatórios e Fechamento'); }; }
if (btnConfig) { 
    btnConfig.onclick = (e) => { 
        e.preventDefault(); 
        alternarTela(boxConfig, liConfig, 'Configurações do Sistema'); 
        carregarConfiguracoes();
    }; 
}

if (btnSair) {
    btnSair.onclick = async (e) => {
        e.preventDefault();
        try { await signOut(auth); window.location.href = 'index.html'; } catch (err) { console.error(err); }
    };
}

// ==========================================
// FUNÇÃO MÁGICA: CAPTURAR GPS ATUAL
// ==========================================
const btnCapturarGps = document.getElementById('btnCapturarGps');
if (btnCapturarGps) {
    btnCapturarGps.onclick = () => {
        if (!navigator.geolocation) {
            alert("Seu navegador não suporta geolocalização.");
            return;
        }
        btnCapturarGps.textContent = "⌛ Capturando...";
        navigator.geolocation.getCurrentPosition((posicao) => {
            document.getElementById('latEmpresa').value = posicao.coords.latitude;
            document.getElementById('lngEmpresa').value = posicao.coords.longitude;
            btnCapturarGps.textContent = "📍 Obter Localização Atual";
        }, (erro) => {
            alert("Erro ao obter localização. Permita o acesso ao GPS.");
            btnCapturarGps.textContent = "📍 Obter Localização Atual";
        });
    };
}

// ==========================================
// GRAVAR CONFIGURAÇÕES NO BANCO
// ==========================================
const configForm = document.getElementById('configForm');
const msgConfig = document.getElementById('msgConfig');

async function carregarConfiguracoes() {
    try {
        const docRef = await getDoc(doc(db, "sistema", "configGeral"));
        if (docRef.exists()) {
            const dados = docRef.data();
            document.getElementById('latEmpresa').value = dados.latitude || '';
            document.getElementById('lngEmpresa').value = dados.longitude || '';
            document.getElementById('raioPermitido').value = dados.raio || 50;
        }
    } catch (err) { console.error(err); }
}

if (configForm) {
    configForm.onsubmit = async (e) => {
        e.preventDefault();
        msgConfig.style.display = "block";
        msgConfig.style.backgroundColor = "#dbeafe";
        msgConfig.style.color = "#2563eb";
        msgConfig.textContent = "Salvando no Firebase...";

        try {
            await setDoc(doc(db, "sistema", "configGeral"), {
                latitude: Number(document.getElementById('latEmpresa').value),
                longitude: Number(document.getElementById('lngEmpresa').value),
                raio: Number(document.getElementById('raioPermitido').value)
            });
            msgConfig.style.backgroundColor = "#dcfce7";
            msgConfig.style.color = "#15803d";
            msgConfig.textContent = "Configurações salvas com sucesso!";
            setTimeout(() => msgConfig.style.display = "none", 3000);
        } catch (err) {
            msgConfig.style.backgroundColor = "#fee2e2";
            msgConfig.style.color = "#b91c1c";
            msgConfig.textContent = "Erro: " + err.message;
        }
    };
}

// ==========================================
// CADASTRO DE USUÁRIOS
// ==========================================
const cadastroForm = document.getElementById('cadastroForm');
const msgCadastro = document.getElementById('msgCadastro');

if (cadastroForm) {
    cadastroForm.onsubmit = async (e) => {
        e.preventDefault();
        msgCadastro.style.display = "block";
        msgCadastro.style.backgroundColor = "#dbeafe";
        msgCadastro.style.color = "#2563eb";
        msgCadastro.textContent = "Cadastrando usuário...";

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('emailNovo').value;
        const senha = document.getElementById('senhaNova').value;
        const tipo = document.getElementById('tipoAcesso').value;
        const segSex = document.getElementById('horasSegSex').value;
        const sab = document.getElementById('horasSab').value;

        try {
            const app2 = initializeApp(auth.app.options, 'AppCadastro');
            const auth2 = getAuth(app2);
            const cred = await createUserWithEmailAndPassword(auth2, email, senha);

            await setDoc(doc(db, "usuarios", cred.user.uid), {
                nome: nome,
                email: email,
                tipo: tipo,
                cargaHoraria: { segSex: Number(segSex), sabado: Number(sab), domingo: 0 },
                dataCadastro: new Date().toISOString()
            });

            await signOut(auth2);
            msgCadastro.style.backgroundColor = "#dcfce7";
            msgCadastro.style.color = "#15803d";
            msgCadastro.textContent = "Usuário cadastrado com sucesso!";
            cadastroForm.reset();
            setTimeout(() => msgCadastro.style.display = "none", 3000);
        } catch (err) {
            msgCadastro.style.backgroundColor = "#fee2e2";
            msgCadastro.style.color = "#b91c1c";
            msgCadastro.textContent = "Erro: " + err.message;
        }
    };
}
