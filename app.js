// Importy Firebase funkcí z CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
        
        // ZAVOLÁME NAČTENÍ DAT
        loadRecords();
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
        showToast("Vyplň všechna pole!", "warning");
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

        showToast("Záznam uložen!", "success");
        // Vyčištění formuláře
        document.getElementById('dateInput').value = '';
        document.getElementById('hoursInput').value = '';
        document.getElementById('descInput').value = '';
        
    } catch (e) {
        console.error("Chyba při ukládání: ", e);
    }
});


// --- NAČÍTÁNÍ A ZOBRAZENÍ DAT ---
let allRecords = []; // Tady budeme držet aktuální data z DB

function loadRecords() {
    // Vytvoříme dotaz na databázi (chceme jen tvoje data, seřazená podle data)
    const q = query(
        collection(db, "work_records"),
        where("userId", "==", auth.currentUser.uid),
        orderBy("date", "desc")
    );

    // onSnapshot je kouzlo - poslouchá změny v reálném čase
    onSnapshot(q, (snapshot) => {
    allRecords = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));

    renderRecords();
    }, (error) => {
        console.error("Chyba při načítání: ", error);
    });
}

// Funkce, která se stará čistě o vykreslení (používá ji i filtr)
function renderRecords() {
    const monthValue = document.getElementById('monthFilter').value; // Formát "YYYY-MM"
    const list = document.getElementById('records-list');
    list.innerHTML = '';

    const filtered = allRecords.filter(record => {
        if (!monthValue) return true;
        return record.date.startsWith(monthValue);
    });

    //tlacitka na upravu zaznamu
    filtered.forEach(data => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${data.date}</strong> | ${data.hours} hod. | ${data.description}
            <div style="margin-top: 5px;">
                <button onclick="openEditModal('${data.id}')" style="background-color: #ffc107; color: black; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Upravit</button>
                <button onclick="openDeleteModal('${data.id}')" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px; margin-left: 5px;">Smazat</button>
            </div>
        `;
        list.appendChild(li);
    });

    // Přidáme posluchače na všechna tlačítka Smazat
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const idToDelete = e.target.getAttribute('data-id');
            if (confirm("Opravdu smazat tento záznam?")) {
                await deleteDoc(doc(db, "work_records", idToDelete));
            }
        });
    });

    // Uložíme profiltrovaná data pro případný export
    window.currentlyFilteredData = filtered;
}

// Event listenery pro filtry
document.getElementById('monthFilter').addEventListener('input', renderRecords);
document.getElementById('clear-filter-btn').addEventListener('click', () => {
    document.getElementById('monthFilter').value = '';
    renderRecords();
});

//Funkce pro zobrazení Toastu (upozorneni)
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerText = message;

    // Nejprve vyčistíme všechny předchozí barvy a odkryjeme bublinu
    toast.classList.remove('hidden', 'toast-success', 'toast-error', 'toast-warning');

    // Přidáme správnou barvu podle typu
    if (type === 'success') {
        toast.classList.add('toast-success');
    } else if (type === 'error') {
        toast.classList.add('toast-error');
    } else if (type === 'warning') {
        toast.classList.add('toast-warning');
    }

    // Za 3 vteřiny bublina zase zmizí
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}


// Globální proměnné, ať víme, na jaký záznam jsme zrovna klikli
let editingRecordId = null;
let deletingRecordId = null;

// --- LOGIKA PRO MAZÁNÍ (Náhrada za confirm) ---
window.openDeleteModal = (id) => {
    deletingRecordId = id; // Zapamatujeme si ID
    document.getElementById('delete-modal').classList.remove('hidden'); // Ukážeme okno
};
document.getElementById('close-delete-btn').addEventListener('click', () => {
    document.getElementById('delete-modal').classList.add('hidden'); // Skryjeme okno
});
document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
    if (deletingRecordId) {
        await deleteDoc(doc(db, "work_records", deletingRecordId));
        showToast("Záznam byl smazán.", "success");
        document.getElementById('delete-modal').classList.add('hidden');
        deletingRecordId = null;
    }
});

// --- LOGIKA PRO ÚPRAVU ZÁZNAMŮ ---
window.openEditModal = (id) => {
    const record = window.currentlyFilteredData.find(r => r.id === id);
    if (!record) return;

    editingRecordId = id; // Zapamatujeme si ID

    // Předvyplníme okno aktuálními daty
    document.getElementById('editDateInput').value = record.date;
    document.getElementById('editHoursInput').value = record.hours;
    document.getElementById('editDescInput').value = record.description;

    document.getElementById('edit-modal').classList.remove('hidden'); // Ukážeme okno
};

document.getElementById('close-edit-btn').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.add('hidden'); // Skryjeme okno
});

document.getElementById('save-edit-btn').addEventListener('click', async () => {
    const date = document.getElementById('editDateInput').value;
    const hours = document.getElementById('editHoursInput').value;
    const desc = document.getElementById('editDescInput').value;

    if (!date || !hours || !desc) {
        showToast("Vyplň všechna pole!", "warning");
        return;
    }

    try {
        const docRef = doc(db, "work_records", editingRecordId);
        await updateDoc(docRef, {
            date: date,
            hours: Number(hours),
            description: desc
        });

        showToast("Záznam úspěšně upraven!", "success");
        document.getElementById('edit-modal').classList.add('hidden'); // Zavřeme okno
        editingRecordId = null; // Vyčistíme ID

    } catch (e) {
        console.error("Chyba při úpravě: ", e);
        showToast("Něco se pokazilo.", "warning");
    }
});


// --- EXPORT POMOCÍ ŠABLONY ---
document.getElementById('export-btn').addEventListener('click', async () => {
    if (!window.currentlyFilteredData || window.currentlyFilteredData.length === 0) {
        showToast("Žádná data k exportu!", "error");
        return;
    }

    try {
        // 1. Načteme tvůj soubor se šablonou
        const response = await fetch('sablona.xlsx'); // Musí být ve stejné složce
        const arrayBuffer = await response.arrayBuffer();

        // 2. Otevřeme ho pomocí ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1); // Vybereme první list

        // 3. Zapisujeme data (předpokládáme, že hlavička končí na řádku 3)
        // Takže začneme zapisovat od řádku 4. 
        // Pokud máš v šabloně pod tím hned součty, použijeme "insertRow", 
        // aby se součty posunuly dolů a nepřepsali jsme je.
        let currentRowIndex = 4;

        window.currentlyFilteredData.forEach(record => {
            // Vložíme nový prázdný řádek na danou pozici (ostatní řádky se posunou dolů)
            // worksheet.insertRow(currentRowIndex, []); //přidává novyrádek a ty pod ním posouvá dolů
            const row = worksheet.getRow(currentRowIndex);

            // --- PŘEVOD FORMÁTU DATA ---
            // record.date je ve formátu "YYYY-MM-DD" (např. "2026-03-30")
            const dateParts = record.date.split('-'); // Rozsekáme to podle pomlčky na pole ["2026", "03", "30"]
            // Poskládáme to zpět s tečkami: 3. část + 2. část + 1. část
            const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;

            // Vyplníme jen ty buňky, které chceme (A=1, B=2, ... E=5, J=10, K=11)
            row.getCell(1).value = formattedDate;                  // A: Datum
            row.getCell(5).value = 'ostatní';                    // E: Činnost
            row.getCell(10).value = record.description;          // J: Poznámka
            row.getCell(11).value = Number(record.hours);        // K: Hodiny

            row.commit(); // Potvrdíme zápis do řádku
            currentRowIndex++; // Posuneme se na další řádek pro další záznam
        });

        // 4. Uložíme a stáhneme
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        
        // Získáme název měsíce z filtru (pokud je) pro hezčí název souboru
        const monthValue = document.getElementById('monthFilter').value || "Vsechno";
        saveAs(blob, `${monthValue} - vykaz zahradnika.xlsx`);

    } catch (error) {
        console.error("Chyba při exportu:", error);
        showToast("Nepodařilo se načíst šablonu. Ujisti se, že máš soubor 'sablona.xlsx' ve složce s projektem.", "error");
    }
});

