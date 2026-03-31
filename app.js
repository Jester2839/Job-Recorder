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
    const activity = document.getElementById('activityInput').value;
    const desc = document.getElementById('descInput').value;

    if (!date || !hours || !activity || !desc) {
        showToast("Vyplň všechna pole!", "warning");
        return;
    }

    try {
        // Vytvoříme/přidáme do kolekce 'work_records' nový dokument
        await addDoc(collection(db, "work_records"), {
            date: date,
            hours: Number(hours),
            activity: activity,
            description: desc,
            userId: auth.currentUser.uid, // Abychom věděli, že je to tvůj záznam
            createdAt: serverTimestamp() // Kdy to bylo reálně zapsáno
        });

        showToast("Záznam uložen!", "success");
        // Vyčištění formuláře
        document.getElementById('dateInput').value = '';
        document.getElementById('hoursInput').value = '';
        document.getElementById('activityInput').value = '';
        document.getElementById('descInput').value = '';

        addModal.classList.add('hidden');
        
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
// Funkce, která se stará čistě o vykreslení
function renderRecords() {
    const monthValue = document.getElementById('monthFilter').value; 
    const list = document.getElementById('records-list');
    list.innerHTML = '';

    const filtered = allRecords.filter(record => {
        if (!monthValue) return true;
        return record.date.startsWith(monthValue);
    });

    // 1. SESKUPOVÁNÍ DAT
    const grouped = {};
    filtered.forEach(record => {
        const [year, month, day] = record.date.split('-'); // 2026-03-30 -> ["2026", "03", "30"]
        
        if (!grouped[year]) grouped[year] = {};
        if (!grouped[year][month]) grouped[year][month] = [];
        
        grouped[year][month].push(record);
    });

    const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

    // 2. VYKRESLENÍ
    // Projdeme roky (sestupně)
    Object.keys(grouped).sort((a, b) => b - a).forEach(year => {
        
        // Hlavička roku
        const yearHeader = document.createElement('h3');
        yearHeader.innerHTML = `<i class="ph ph-calendar-blank" style="color: var(--primary-color);"></i> ${year}`;
        yearHeader.style.marginTop = "20px";
        yearHeader.style.borderBottom = "2px solid var(--border-color)";
        yearHeader.style.paddingBottom = "5px";
        list.appendChild(yearHeader);

        // Projdeme měsíce v daném roce (sestupně)
        Object.keys(grouped[year]).sort((a, b) => b - a).forEach(month => {
            
            // Hlavička měsíce
            const monthHeader = document.createElement('h4');
            monthHeader.innerText = monthNames[parseInt(month) - 1]; // "03" -> "Březen"
            monthHeader.style.marginLeft = "15px";
            monthHeader.style.marginTop = "15px";
            monthHeader.style.color = "var(--text-secondary)";
            list.appendChild(monthHeader);

            // Záznamy v daném měsíci
            grouped[year][month].forEach(data => {
                const day = data.date.split('-')[2]; // Vytáhneme jen den
                const activityName = data.activity || 'ostatní'; // Záchrana pro staré záznamy

                const item = document.createElement('div');
                item.className = "card"; // Použijeme tvůj styl karty
                item.style.marginLeft = "30px";
                item.style.marginBottom = "10px";
                item.style.padding = "15px";
                
                // Struktura jednoho záznamu (Vlevo data, vpravo ikonky)
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <strong style="font-size: 1.1rem;">${day}. ${month}. ${year}</strong>
                                <span class="badge-display">${activityName}</span>
                                <span style="color: var(--text-secondary);"><i class="ph ph-clock"></i> ${data.hours} hod.</span>
                            </div>
                            <p style="margin: 0; color: var(--text-primary);">${data.description}</p>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button class="btn-icon" onclick="openEditModal('${data.id}')" style="color: var(--warning-color);" title="Upravit"><i class="ph ph-pencil-simple"></i></button>
                            <button class="btn-icon" onclick="openDeleteModal('${data.id}')" style="color: var(--danger-color);" title="Smazat"><i class="ph ph-trash"></i></button>
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        });
    });

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




// --- ROZBALOVACÍ MENU UŽIVATELE ---
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');

userMenuBtn.addEventListener('click', () => {
    userDropdown.classList.toggle('hidden');
});

// --- LOGIKA PRO OKNO PŘIDÁNÍ ZÁZNAMU ---
const addModal = document.getElementById('add-modal');
const openAddModalBtn = document.getElementById('open-add-modal-btn');
const closeAddCross = document.getElementById('close-add-cross');

// Otevření přes tlačítko nahoře
openAddModalBtn.addEventListener('click', () => {
    addModal.classList.remove('hidden');
});

// Zavření přes křížek
closeAddCross.addEventListener('click', () => {
    addModal.classList.add('hidden');
});



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
    // Předvyplnění činnosti (pokud u starých záznamů chybí, dáme "ostatní")
    document.getElementById('editActivityInput').value = record.activity || 'ostatní';
    document.getElementById('editDescInput').value = record.description;

    document.getElementById('edit-modal').classList.remove('hidden'); // Ukážeme okno
};
document.getElementById('close-edit-btn').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.add('hidden'); // Skryjeme okno
});
document.getElementById('save-edit-btn').addEventListener('click', async () => {
    const date = document.getElementById('editDateInput').value;
    const hours = document.getElementById('editHoursInput').value;
    const activity = document.getElementById('editActivityInput').value;
    const desc = document.getElementById('editDescInput').value;

    if (!date || !hours || !activity || !desc) {
        showToast("Vyplň všechna pole!", "warning");
        return;
    }

    try {
        const docRef = doc(db, "work_records", editingRecordId);
        await updateDoc(docRef, {
            date: date,
            hours: Number(hours),
            activity: activity,
            description: desc
        });

        showToast("Záznam úspěšně upraven!", "success");
        document.getElementById('edit-modal').classList.add('hidden'); // Zavřeme okno
        editingRecordId = null; // Vyčistíme ID

    } catch (e) {
        console.error("Chyba při úpravě: ", e);
        showToast("Něco se pokazilo.", "error");
    }
});


// --- PŘEPÍNÁNÍ DARK/LIGHT REŽIMU ---
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
// Zjistíme, jestli má uživatel už něco uloženo, jinak použijeme systémové nastavení
const currentTheme = localStorage.getItem('theme') || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeIcon.classList.replace('ph-moon', 'ph-sun');
    } else {
        document.body.removeAttribute('data-theme');
        themeIcon.classList.replace('ph-sun', 'ph-moon');
    }
}
applyTheme(currentTheme);
themeToggleBtn.addEventListener('click', () => {
    let newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
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

