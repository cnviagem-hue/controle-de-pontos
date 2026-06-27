import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const mensagemErro = document.getElementById('mensagemErro');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "usuarios", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.tipo === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'colaborador.html';
            }
        } else {
            mensagemErro.textContent = "Usuário sem cadastro na base.";
            mensagemErro.style.display = 'block';
        }
    } catch (error) {
        mensagemErro.textContent = "Login ou senha inválidos.";
        mensagemErro.style.display = 'block';
    }
});
