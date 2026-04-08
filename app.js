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

// --- HODINOVKA ---
const HOURLY_RATE = 200;
// --------------------

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
        // Uživatel je přihlášen - SCHOVÁME login, UKÁŽEME aplikaci
        loginSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        console.log("Přihlášen jako:", user.email);
        
        // ZAVOLÁME NAČTENÍ DAT
        loadRecords();
    } else {
        // Uživatel není přihlášen - UKÁŽEME login, SCHOVÁME aplikaci
        loginSection.classList.remove('hidden');
        appSection.classList.add('hidden');
    }
});
// Přihlášení
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    signInWithEmailAndPassword(auth, email, password)
        .then(() => { errorMsg.classList.add('hidden'); }) // Schování chyby
        .catch((error) => { errorMsg.classList.remove('hidden'); console.error(error); }); // Ukázání chyby
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
// --- VYKRESLOVANÍ S FILTRY ---
function renderRecords() {
    const searchValue = document.getElementById('searchInput').value.toLowerCase();
    const sortValue = document.getElementById('sort-toggle-btn').getAttribute('data-sort'); // NOVÉ: Čteme z atributu tlačítka
    const monthValue = document.getElementById('monthFilter').value; 
    const exactDateValue = document.getElementById('exactDateFilter').value;
    const activityValue = document.getElementById('activityFilter').value.toLowerCase();

    const list = document.getElementById('records-list');
    list.innerHTML = '';

    // Zřetězené filtrování
    let filtered = allRecords.filter(record => {
        const safeDesc = record.description ? record.description.toLowerCase() : '';
        const safeAct = record.activity ? record.activity.toLowerCase() : 'ostatní';

        const matchesSearch = !searchValue || safeDesc.includes(searchValue) || safeAct.includes(searchValue);
        const matchesMonth = !monthValue || record.date.startsWith(monthValue);
        const matchesExactDate = !exactDateValue || record.date === exactDateValue;
        const matchesActivity = !activityValue || safeAct.includes(activityValue);

        return matchesSearch && matchesMonth && matchesExactDate && matchesActivity;
    });

    if (sortValue === 'asc') {
        filtered = filtered.reverse();
    }

    window.currentlyFilteredData = filtered;

    // --- OVLÁDÁNÍ BAREVNÉ TEČKY U FILTRU ---
    const filterIndicator = document.getElementById('filter-indicator');
    if (monthValue || exactDateValue || activityValue) {
        filterIndicator.classList.remove('hidden');
    } else {
        filterIndicator.classList.add('hidden');
    }

    //hlaska pokud nejsou nalezeny záznamy
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-magnifying-glass"></i>
                <p>Nenalezeny žádné záznamy.</p>
            </div>
        `;
        return;
    }

    // Seskupování
    const grouped = {};
    filtered.forEach(record => {
        const [year, month, day] = record.date.split('-'); 
        if (!grouped[year]) grouped[year] = {};
        if (!grouped[year][month]) grouped[year][month] = [];
        grouped[year][month].push(record);
    });

    const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
    const sortMultiplier = sortValue === 'asc' ? -1 : 1; 

    // Vykreslení
    Object.keys(grouped).sort((a, b) => (b - a) * sortMultiplier).forEach(year => {
        
        // Hlavička roku
        const yearHeader = document.createElement('h3');
        yearHeader.className = 'year-title';
        yearHeader.innerHTML = `<i class="ph ph-calendar-blank"></i> ${year}`;
        list.appendChild(yearHeader);

        Object.keys(grouped[year]).sort((a, b) => (b - a) * sortMultiplier).forEach(month => {
            
            // Hlavička měsíce
            const monthHeader = document.createElement('h4');
            monthHeader.className = 'month-title';
            monthHeader.innerText = monthNames[parseInt(month) - 1]; 
            list.appendChild(monthHeader);

            // Záznamy
            grouped[year][month].forEach(data => {
                const day = data.date.split('-')[2]; 
                const activityName = data.activity || 'ostatní'; 

                const item = document.createElement('div');
                item.className = "card record-item"; // Karta a specifický layout záznamu
                
                item.innerHTML = `
                    <div style="flex: 1;">
                        <div class="record-info">
                            <span class="record-date">${day}. ${month}. ${year}</span>
                            <span class="badge-display">${activityName}</span>
                            <span class="record-hours"><i class="ph ph-clock"></i> ${data.hours} hod.</span>
                        </div>
                        <p class="record-desc">${data.description}</p>
                    </div>
                    <div class="record-actions">
                        <button class="btn-icon action-edit-btn" data-id="${data.id}" title="Upravit"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon action-delete-btn" data-id="${data.id}" title="Smazat"><i class="ph ph-trash"></i></button>
                    </div>
                `;
                list.appendChild(item);
            });
        });
    });


    // --- AKTUALIZACE FILTROVANÝCH STATISTIK ---
    let totalHours = 0;
    
    // Sečteme hodiny ze všech aktuálně zobrazených (vyfiltrovaných) záznamů
    filtered.forEach(record => {
        totalHours += Number(record.hours);
    });

    // Vypočítáme peníze
    let totalMoney = totalHours * HOURLY_RATE;

    // Pošleme to do HTML pro aktuální přehled
    document.getElementById('stat-count').innerText = filtered.length;
    document.getElementById('stat-hours').innerText = totalHours + " h";
    document.getElementById('stat-money').innerText = totalMoney.toLocaleString('cs-CZ') + " Kč";

    // --- GLOBÁLNÍ ROČNÍ SOUHRNY (Vždy ze všech záznamů) ---
    const yearlyData = {};
    allRecords.forEach(record => {
        const year = record.date.split('-')[0]; // Vezme rok
        if (!yearlyData[year]) yearlyData[year] = 0;
        yearlyData[year] += Number(record.hours); // Přičte hodiny k danému roku
    });

    const yearlyList = document.getElementById('yearly-summary-list');
    if (yearlyList) { 
        yearlyList.innerHTML = ''; // Vyčistíme předchozí výpis
        
        // Seřadíme roky sestupně a vypíšeme je
        Object.keys(yearlyData).sort((a, b) => b - a).forEach(year => {
            const row = document.createElement('div');
            row.className = 'stat-row'; // Použití hotové CSS třídy!
    
            row.innerHTML = `
                <span><strong>${year}</strong></span>
                <span>${yearlyData[year]} h <small class="text-secondary">(${(yearlyData[year] * HOURLY_RATE).toLocaleString('cs-CZ')} Kč)</small></span>
            `;
            yearlyList.appendChild(row);
        });
    }
    
}
// --- LOGIKA TOOLBARU (Animace a tlačítka) ---
// 1. Rozbalování Lupy
const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchInput = document.getElementById('searchInput');
searchToggleBtn.addEventListener('click', () => {
    searchInput.classList.toggle('hidden-search');
    if (!searchInput.classList.contains('hidden-search')) {
        searchInput.focus(); 
    } else {
        searchInput.value = '';
        renderRecords();
    }
});
// 2. Tlačítko Řazení (Toggle Desc/Asc)
const sortToggleBtn = document.getElementById('sort-toggle-btn');
const sortIcon = document.getElementById('sort-icon');
sortToggleBtn.addEventListener('click', () => {
    let currentSort = sortToggleBtn.getAttribute('data-sort');
    let newSort = currentSort === 'desc' ? 'asc' : 'desc';
    
    sortToggleBtn.setAttribute('data-sort', newSort);
    if (newSort === 'desc') {
        sortIcon.classList.replace('ph-sort-ascending', 'ph-sort-descending');
    } else {
        sortIcon.classList.replace('ph-sort-descending', 'ph-sort-ascending');
    }
    renderRecords(); 
});
// 3. Rozbalovací menu Filtrů
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filterDropdown = document.getElementById('filter-dropdown');
const closeFilterCross = document.getElementById('close-filter-cross');
filterToggleBtn.addEventListener('click', () => {
    filterDropdown.classList.toggle('hidden');
});
closeFilterCross.addEventListener('click', () => {
    filterDropdown.classList.add('hidden');
});
// 4. Překreslení při změně inputů a chytré rušení filtrů
const monthFilterInput = document.getElementById('monthFilter');
const exactDateFilterInput = document.getElementById('exactDateFilter');
// Když vyberu Měsíc, smažu Přesný den
monthFilterInput.addEventListener('input', () => {
    if (monthFilterInput.value) {
        exactDateFilterInput.value = ''; 
    }
    renderRecords();
});
// Když vyberu Přesný den, smažu Měsíc
exactDateFilterInput.addEventListener('input', () => {
    if (exactDateFilterInput.value) {
        monthFilterInput.value = ''; 
    }
    renderRecords();
});
// Ostatní filtry (hledání a činnost) jen překreslují data
['searchInput', 'activityFilter'].forEach(inputId => {
    document.getElementById(inputId).addEventListener('input', renderRecords);
});
// 5. Zrušení filtrů
document.getElementById('clear-filter-btn').addEventListener('click', () => {
    document.getElementById('monthFilter').value = '';
    document.getElementById('exactDateFilter').value = '';
    document.getElementById('activityFilter').value = '';
    renderRecords(); 
    filterDropdown.classList.add('hidden'); 
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
const closeUserCross = document.getElementById('close-user-cross');
userMenuBtn.addEventListener('click', () => {
    userDropdown.classList.toggle('hidden');
});
closeUserCross.addEventListener('click', () => {
    userDropdown.classList.add('hidden');
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
document.getElementById('close-add-btn').addEventListener('click', () => {
    addModal.classList.add('hidden');
});



// Globální proměnné, ať víme, na jaký záznam jsme zrovna klikli
let editingRecordId = null;
let deletingRecordId = null;


// --- LOGIKA PRO MAZÁNÍ (Náhrada za confirm) ---
function openDeleteModal(id){
    deletingRecordId = id; // Zapamatujeme si ID
    document.getElementById('delete-modal').classList.remove('hidden'); // Ukážeme okno
};
document.getElementById('close-delete-btn').addEventListener('click', () => {
    document.getElementById('delete-modal').classList.add('hidden'); // Skryjeme okno
});
document.getElementById('close-delete-cross').addEventListener('click', () => {
    document.getElementById('delete-modal').classList.add('hidden'); 
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
function openEditModal(id){
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
document.getElementById('close-edit-cross').addEventListener('click', () => {
    document.getElementById('edit-modal').classList.add('hidden'); 
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


// --- EVENT DELEGATION PRO TLAČÍTKA U ZÁZNAMŮ ---
document.getElementById('records-list').addEventListener('click', (event) => {
    // Zjistíme, jestli bylo kliknuto na editační tlačítko (nebo jeho ikonu)
    const editBtn = event.target.closest('.action-edit-btn');
    const deleteBtn = event.target.closest('.action-delete-btn');

    if (editBtn) {
        openEditModal(editBtn.getAttribute('data-id'));
    } else if (deleteBtn) {
        openDeleteModal(deleteBtn.getAttribute('data-id'));
    }
});


// --- PŘEPÍNÁNÍ DARK/LIGHT REŽIMU ---
const themeToggleBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function applyTheme(theme) {
    const themeIcon = document.getElementById('theme-icon');
    const mobileThemeIcon = document.getElementById('mobile-theme-icon');

    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.classList.replace('ph-moon', 'ph-sun');
        if (mobileThemeIcon) mobileThemeIcon.classList.replace('ph-moon', 'ph-sun');
    } else {
        document.body.removeAttribute('data-theme');
        if (themeIcon) themeIcon.classList.replace('ph-sun', 'ph-moon');
        if (mobileThemeIcon) mobileThemeIcon.classList.replace('ph-sun', 'ph-moon');
    }
}
applyTheme(currentTheme);

// Nyní obě tlačítka (desktop i mobil) používají tuto jedinou logiku
function toggleTheme() {
    let newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

themeToggleBtn.addEventListener('click', toggleTheme);
document.getElementById('mobile-theme-toggle').addEventListener('click', toggleTheme);


// --- ZAVÍRÁNÍ OKEN PŘI KLIKNUTÍ MIMO ---
// 1. Zavírání Dropdownů (Profil a Filtry)
window.addEventListener('click', (event) => {
    // Definice elementů, které chceme hlídat
    const userDropdown = document.getElementById('user-dropdown');
    const userMenuBtn = document.getElementById('user-menu-btn');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const searchInput = document.getElementById('searchInput');
    const searchToggleBtn = document.getElementById('search-toggle-btn');

    // Zavírání profilu
    if (!userMenuBtn.contains(event.target) && !userDropdown.contains(event.target)) {
        userDropdown.classList.add('hidden');
    }

    // Zavírání filtrů
    if (!filterToggleBtn.contains(event.target) && !filterDropdown.contains(event.target)) {
        filterDropdown.classList.add('hidden');
    }

    // CHYTRÉ ZAVÍRÁNÍ LUPY
    // Pokud kliknu mimo lupu a mimo její tlačítko...
    if (!searchToggleBtn.contains(event.target) && !searchInput.contains(event.target)) {
        // ... a pokud je lupa prázdná, tak ji schovám
        if (searchInput.value.trim() === '') {
            searchInput.classList.add('hidden-search');
        }
    }
});

// 2. Zavírání Modalů kliknutím na tmavé pozadí (Overlay)
// Najdeme všechna tmavá pozadí vyskakovacích oken
const modalOverlays = document.querySelectorAll('.modal-overlay');
modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (event) => {
        // Zkontrolujeme, jestli uživatel klikl přímo na ten tmavý overlay, a NE dovnitř na to bílé/skleněné okno
        if (event.target === overlay) {
            overlay.classList.add('hidden');
        }
    });
});


// ==========================================
// --- MOBILNÍ ROZHRANÍ (Menu a Statistiky) ---
// ==========================================
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileFullscreenMenu = document.getElementById('mobile-fullscreen-menu');
const closeMobileMenuBtn = document.getElementById('close-mobile-menu-btn');

// Otevření a zavření menu (Animace vysunutí)
hamburgerBtn.addEventListener('click', () => {
    mobileFullscreenMenu.classList.add('menu-open');
});
closeMobileMenuBtn.addEventListener('click', () => {
    mobileFullscreenMenu.classList.remove('menu-open');
});

// Odhlášení z mobilního menu
document.getElementById('mobile-logout-btn').addEventListener('click', () => {
    mobileFullscreenMenu.classList.remove('menu-open');
    signOut(auth);
});

// --- Zobrazení specifických statistik z menu ---
const sidebarStats = document.getElementById('sidebar-stats');
const cardCurrentStats = document.getElementById('card-current-stats');
const cardYearlyStats = document.getElementById('card-yearly-stats');

// Kliknutí na Aktuální přehled
document.getElementById('show-stats-btn').addEventListener('click', () => {
    mobileFullscreenMenu.classList.remove('menu-open'); 
    sidebarStats.classList.add('show-mobile'); 
    
    // Ukázat přehled, schovat souhrny
    cardCurrentStats.classList.remove('mobile-hidden');
    cardYearlyStats.classList.add('mobile-hidden');
});

// Kliknutí na Roční souhrny
document.getElementById('show-yearly-btn').addEventListener('click', () => {
    mobileFullscreenMenu.classList.remove('menu-open'); 
    sidebarStats.classList.add('show-mobile'); 
    
    // Schovat přehled, ukázat souhrny
    cardCurrentStats.classList.add('mobile-hidden');
    cardYearlyStats.classList.remove('mobile-hidden');
});

// Zavření okna statistik na mobilu (křížkem nebo kliknutím mimo)
function hideMobileStats() {
    sidebarStats.classList.remove('show-mobile');
    // Vrátíme to do původního stavu pro příště (nebo pro přechod na PC)
    setTimeout(() => {
        cardCurrentStats.classList.remove('mobile-hidden');
        cardYearlyStats.classList.remove('mobile-hidden');
    }, 300); // Počkáme na dokončení animace zmizení
}

document.querySelectorAll('.close-stats-mobile-btn').forEach(btn => {
    btn.addEventListener('click', hideMobileStats);
});

sidebarStats.addEventListener('click', (event) => {
    if (event.target === sidebarStats) hideMobileStats();
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
            row.getCell(5).value = record.activity;                    // E: Činnost
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

