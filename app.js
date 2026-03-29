// Importy Firebase funkcí z CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// SEM VLOŽ SVŮJ CONFIG Z FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDOLQ6Owwk5lYJOqe7vrUrDhKjW5eA3loU",
  authDomain: "job-recorder-22c52.firebaseapp.com",
  projectId: "job-recorder-22c52",
  storageBucket: "job-recorder-22c52.firebasestorage.app",
  messagingSenderId: "1086725376685",
  appId: "1:1086725376685:web:8161107c9c0ae99dc91424",
  measurementId: "G-2HCMHQJZWV"
};

// Inicializace Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elementy
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const addRecordBtn = document.getElementById('add-record-btn');

// --- AUTHENTIKACE ---

// Sledování stavu uživatele (přihlášen/odhlášen)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Uživatel je přihlášen
        loginSection.style.display = 'none';
        appSection.style.display = 'block';
        console.log("Přihlášen jako:", user.email);
        // Tady pak zavoláme funkci na načtení dat
    } else {
        // Uživatel není přihlášen
        loginSection.style.display = 'block';
        appSection.style.display = 'none';
    }
});

// Přihlášení
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    signInWithEmailAndPassword(auth, email, password)
        .then(() => { errorMsg.style.display = 'none'; })
        .catch((error) => { errorMsg.style.display = 'block'; console.error(error); });
});

// Odhlášení
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- PRÁCE S DATABÁZÍ ---

// Přidání záznamu
addRecordBtn.addEventListener('click', async () => {
    const date = document.getElementById('dateInput').value;
    const hours = document.getElementById('hoursInput').value;
    const desc = document.getElementById('descInput').value;

    if (!date || !hours || !desc) {
        alert("Vyplň všechna pole!");
        return;
    }

    try {
        // Vytvoříme/přidáme do kolekce 'work_records' nový dokument
        await addDoc(collection(db, "work_records"), {
            date: date,
            hours: Number(hours),
            description: desc,
            userId: auth.currentUser.uid, // Abychom věděli, že je to tvůj záznam
            createdAt: serverTimestamp() // Kdy to bylo reálně zapsáno
        });

        alert("Záznam uložen!");
        // Vyčištění formuláře
        document.getElementById('dateInput').value = '';
        document.getElementById('hoursInput').value = '';
        document.getElementById('descInput').value = '';
        
    } catch (e) {
        console.error("Chyba při ukládání: ", e);
    }
});