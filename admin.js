import { auth, db } from './firebase-config.js';
import { signOut, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js"; // IMPORTAÇÃO CORRIGIDA PARA EVITAR TRAVAS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

// Pegando elementos do Menu
const btnCadastro = document.getElementById('menu-cadastro');
const btnRelatorios = document.getElementById('menu-relatorios');
const btnConfig = document.getElementById('menu-config');
const btnSair = document.getElementById('btnSair');

// Pegando os itens de lista (li) para mudar a cor ativa
const liCadastro = document.getElementById('li-cadastro');
const liRelatorios = document.getElementById('li-relatorios');
const liConfig = document.getElementById('li-config');

// Pegando as Caixas de Conteúdo
const boxCadastro = document.getElementById('sec-cadastro');
const boxRelatorios = document.getElementById('sec-relatorios');
const boxConfig = document.getElementById('sec-config');
const txtTitulo = document.getElementById('titulo-pagina');

function alternarTela(telaVisivel, liAtivo, textoTitulo) {
    // Esconde todas as telas primeiro
    if (boxCadastro) boxCadastro.style.display = 'none';
    if (boxRelatorios) boxRelatorios.style.display = 'none';
    if (boxConfig) boxConfig.style.display = 'none';
    
    // Remove a marcação laranja de todos os menus
    if (liCadastro) liCadastro.classList.remove('active');
    if (liRelatorios) liRelatorios.classList.remove('active');
    if (liConfig) liConfig.classList.remove('active');

    // Mostra a tela selecionada e ativa o menu clicado
    if (telaVisivel) telaVisivel.style.display = 'block';
    if (liAtivo) liAtivo.classList.add('active');
    if (txtTitulo) txtTitulo.textContent = textoTitulo;
}

// Ouvintes de clique simplificados (Troca visual garantida)
if (btnCadastro) {
    btnCadastro.onclick = function(e) {
        e.preventDefault();
        alternarTela(boxCadastro, liCadastro, 'Gestão de Pessoas e Acessos');
    };
}

if (btnRelatorios) {
    btnRelatorios.onclick = function(e) {
        e.preventDefault();
        alternarTela(boxRelatorios, liRelatorios, 'Relatórios e Fechamento');
    };
}

if (btnConfig) {
    btnConfig.onclick = function(e) {
        e.preventDefault();
        alternarTela(boxConfig, liConfig, 'Configurações do Sistema');
    };
}

if (btnSair) {
    btnSair.onclick = async function(e) {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    };
}
