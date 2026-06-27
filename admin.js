import { auth, db } from './firebase-config.js';
import { signOut, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

// Pegando os elementos da tela
const btnSair = document.getElementById('btnSair');
const cadastroForm = document.getElementById('cadastroForm');
const msgCadastro = document.getElementById('msgCadastro');

// Função 1: Sair do Sistema
btnSair.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'index.html'; // Volta pro login
    } catch (error) {
        console.error("Erro ao sair:", error);
    }
});

// Função 2: Cadastrar novo colaborador
cadastroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Mostra mensagem de carregamento
    msgCadastro.style.display = 'block';
    msgCadastro.style.color = 'blue';
    msgCadastro.textContent = 'Cadastrando...';

    const nome = document.getElementById('nome').value;
    const email = document.getElementById('emailNovo').value;
    const senha = document.getElementById('senhaNova').value;
    const horasSegSex = document.getElementById('horasSegSex').value;
    const horasSab = document.getElementById('horasSab').value;
    const horasDom = document.getElementById('horasDom').value;

    try {
        // TRUQUE: Cria uma "segunda via" do Firebase para não deslogar o Admin
        const app2 = initializeApp(auth.app.options, 'AppCadastro');
        const auth2 = getAuth(app2);

        // 1. Cria o usuário no Firebase Auth (com e-mail e senha)
        const userCredential = await createUserWithEmailAndPassword(auth2, email, senha);
        const novoUsuario = userCredential.user;

        // 2. Salva a Ficha Cadastral no Firestore usando o UID gerado
        await setDoc(doc(db, "usuarios", novoUsuario.uid), {
            nome: nome,
            email: email,
            tipo: 'colaborador', // Define como colaborador
            cargaHoraria: {
                segSex: Number(horasSegSex),
                sabado: Number(horasSab),
                domingo: Number(horasDom)
            },
            dataCadastro: new Date().toISOString()
        });

        // Desloga da segunda via
        await signOut(auth2);

        // Sucesso!
        msgCadastro.style.color = 'green';
        msgCadastro.textContent = 'Colaborador cadastrado com sucesso!';
        cadastroForm.reset(); // Limpa os campos
        
        // Esconde a mensagem depois de 3 segundos
        setTimeout(() => { msgCadastro.style.display = 'none'; }, 3000);

    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        msgCadastro.style.color = 'red';
        msgCadastro.textContent = 'Erro ao cadastrar: ' + error.message;
    }
});
