// Importy Firebase funkcí z CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile, updateEmail, updatePassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, setDoc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// --- ZOBRAZENÍ HESLA (Očička pro oba formuláře) ---
function setupPasswordToggle(btnId, inputId, iconId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    btn.addEventListener('click', () => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        if (type === 'text') {
            icon.classList.replace('ph-eye', 'ph-eye-slash');
            btn.setAttribute('title', 'Skrýt heslo');
        } else {
            icon.classList.replace('ph-eye-slash', 'ph-eye');
            btn.setAttribute('title', 'Zobrazit heslo');
        }
    });
}
setupPasswordToggle('toggle-login-password-btn', 'login-password', 'toggle-login-password-icon');
setupPasswordToggle('toggle-reg-password-btn', 'reg-password', 'toggle-reg-password-icon');
setupPasswordToggle('toggle-reg-password-confirm-btn', 'reg-password-confirm', 'toggle-reg-password-confirm-icon');
setupPasswordToggle('toggle-profile-pass-btn', 'edit-profile-pass', 'toggle-profile-pass-icon');
setupPasswordToggle('toggle-profile-pass-confirm-btn', 'edit-profile-pass-confirm', 'toggle-profile-pass-confirm-icon');
setupPasswordToggle('toggle-delete-account-pass-btn', 'delete-account-password', 'toggle-delete-account-pass-icon');

// Přepínání motivu přímo v profilu
const profileThemeToggle = document.getElementById('profile-theme-toggle');
if(profileThemeToggle) {
    profileThemeToggle.addEventListener('click', () => {
        toggleTheme();
        updateProfileThemeUI();
    });
}

function updateProfileThemeUI() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const icon = document.getElementById('profile-theme-icon');
    const text = document.getElementById('profile-theme-text');
    if(icon && text) {
        icon.className = isDark ? 'ph ph-sun' : 'ph ph-moon';
        text.innerText = isDark ? 'Světlý režim' : 'Tmavý režim';
    }
}

// --- PŘEPÍNÁNÍ PŘIHLÁŠENÍ / REGISTRACE ---
const loginCard = document.getElementById('login-card');
const registerCard = document.getElementById('register-card');

document.getElementById('show-register-link').addEventListener('click', (e) => {
    e.preventDefault();
    loginCard.classList.add('hidden');
    registerCard.classList.remove('hidden');
});

document.getElementById('show-login-link').addEventListener('click', (e) => {
    e.preventDefault();
    registerCard.classList.add('hidden');
    loginCard.classList.remove('hidden');
});

// --- AUTHENTIKACE ---
// Sledování stavu uživatele (přihlášen/odhlášen)
// Sledování stavu uživatele (přihlášen/odhlášen)
onAuthStateChanged(auth, async (user) => {
    const workerDashboard = document.getElementById('worker-dashboard');
    const adminDashboard = document.getElementById('admin-dashboard');

    if (user) {
        // 1. ZÁKLADNÍ NASTAVENÍ UI
        loginSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        
        const displayName = user.displayName || user.email.split('@')[0];
        document.getElementById('desktop-user-name').innerText = displayName;
        document.getElementById('dropdown-user-name').innerText = displayName;
        document.getElementById('mobile-user-name').innerText = displayName;

        // 2. RESET PLOCHY (Než zjistíme roli, vše schováme)
        workerDashboard?.classList.add('hidden');
        adminDashboard?.classList.add('hidden');

        try {
            // 3. ZJIŠTĚNÍ ROLE Z DATABÁZE
            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);
            let userData;

            if (userDoc.exists()) {
                userData = userDoc.data();
            } else {
                // SAMOOPRAVA: Pokud profil v DB chybí, vytvoříme ho jako brigádníka
                userData = {
                    name: displayName,
                    email: user.email,
                    role: "worker",
                    hourlyRate: 200,
                    employerId: null,
                    createdAt: serverTimestamp()
                };
                await setDoc(userRef, userData);
            }

            // Uložíme důležité proměnné globálně
            window.currentUserRole = userData.role;
            window.currentEmployerId = user.uid;

            // 4. PŘEPNUTÍ DASHBOARDU PODLE ROLE
            if (userData.role === "admin") {
                // Skryjeme brigádnické nástroje v hlavičce
                document.getElementById('open-add-modal-btn')?.classList.add('hidden');
                document.getElementById('filter-toggle-btn')?.classList.add('hidden');
                document.getElementById('sort-toggle-btn')?.classList.add('hidden');
                document.querySelector('.mobile-menu-links')?.classList.add('hidden');
                document.getElementById('admin-menu-placeholder')?.classList.remove('hidden');

                // Ukážeme admin plochu a načteme karty zaměstnanců
                adminDashboard?.classList.remove('hidden');
                renderAdminDashboard();
            } else {
                // Ukážeme brigádnické nástroje
                document.getElementById('open-add-modal-btn')?.classList.remove('hidden');
                document.getElementById('filter-toggle-btn')?.classList.remove('hidden');
                document.getElementById('sort-toggle-btn')?.classList.remove('hidden');
                document.querySelector('.mobile-menu-links')?.classList.remove('hidden');
                document.getElementById('admin-menu-placeholder')?.classList.add('hidden');

                // Ukážeme plochu brigádníka a načteme jeho výkazy
                workerDashboard?.classList.remove('hidden');
                loadRecords(); 
            }

        } catch(e) {
            console.error("Chyba při zjišťování role:", e);
            workerDashboard?.classList.remove('hidden'); // Nouzový fallback
        }

    } else {
        // 5. LOGIKA PŘI ODHLÁŠENÍ (Úklid)
        loginSection.classList.remove('hidden');
        appSection.classList.add('hidden');

        // Zastavíme sledování databáze (Real-time snapshot)
        if (unsubscribeSnapshot) unsubscribeSnapshot();

        // Vymažeme stará data z paměti
        allRecords = [];
        const recordsList = document.getElementById('records-list');
        if (recordsList) recordsList.innerHTML = '';
        
        window.currentUserRole = null;
        window.currentEmployerId = null;
        document.getElementById('stat-count').innerText = "0";
        document.getElementById('stat-hours').innerText = "0 h";
        document.getElementById('stat-money').innerText = "0 Kč";
        const yearlyList = document.getElementById('yearly-summary-list');
        if (yearlyList) yearlyList.innerHTML = '';
    }
});

// Přihlášení
loginBtn.addEventListener('click', () => {
    // Upravená IDčka na nová
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => { 
        }) 
        .catch((error) => { 
            console.error(error); 
            showToast("Špatné jméno nebo heslo.", "error"); 
        });
});

// Odhlášení
logoutBtn.addEventListener('click', () => {
    if (unsubscribeSnapshot) unsubscribeSnapshot(); // Zastaví stahování dat
    signOut(auth);
});

// Registrace Nového Uživatele
document.getElementById('register-btn').addEventListener('click', async () => {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-password-confirm').value;

    // Kontrola, zda je vše vyplněné
    if (!name || !email || !password || !confirmPassword) {
        showToast("Vyplň všechna pole!", "warning");
        return;
    }

    if (password !== confirmPassword) {
        showToast("Hesla se neshodují!", "error");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
            displayName: name
        });
        
        // NOVÉ: Uložení uživatele do databáze s výchozí rolí "worker"
        await setDoc(doc(db, "users", userCredential.user.uid), {
            name: name,
            email: email,
            role: "worker",
            hourlyRate: null,
            employerId: null,
            createdAt: serverTimestamp()
        });

        // Vyčištění formuláře pro příště
        document.getElementById('reg-name').value = '';
        document.getElementById('reg-email').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-password-confirm').value = '';

        // Ruční přepsání jména v UI hned po registraci
        document.getElementById('desktop-user-name').innerText = name;
        document.getElementById('dropdown-user-name').innerText = name;
        document.getElementById('mobile-user-name').innerText = name;

        // Zobrazíme Onboarding ihned po registraci a upozornění na úspěch
        showToast("Úspěšně zaregistrováno! Vítej.", "success");
        document.getElementById('onboarding-modal').classList.remove('hidden');

        showToast("Úspěšně zaregistrováno! Vítej.", "success");
    } catch (error) {
        // Překlad nejčastějších Firebase chyb a volání Toastu
        if (error.code === 'auth/email-already-in-use') {
            showToast("Tento e-mail už má vytvořený účet.", "error");
        } else if (error.code === 'auth/weak-password') {
            showToast("Heslo musí mít alespoň 6 znaků.", "warning");
        } else if (error.code === 'auth/invalid-email') {
            showToast("Zadej platný e-mailový formát.", "error");
        } else {
            showToast("Chyba při registraci: " + error.message, "error");
        }
    }
});

// --- LOGIKA PRO ONBOARDING (Prvotní nastavení mzdy) ---
document.getElementById('save-onboarding-btn').addEventListener('click', async () => {
    const rate = Number(document.getElementById('onboarding-rate').value);
    
    if (!rate || rate <= 0) {
        showToast("Zadej platnou mzdu.", "warning");
        return;
    }

    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { 
            hourlyRate: rate 
        });
        showToast("Registrace proběhla úspěšně, vše je připraveno!", "success");
        document.getElementById('onboarding-modal').classList.add('hidden');
    } catch (e) { 
        showToast("Chyba při ukládání: " + e.message, "error"); 
    }
});


// --- PRÁCE S DATABÁZÍ ---
// Přidání záznamu
addRecordBtn.addEventListener('click', async () => {
    const date = document.getElementById('dateInput').value;
    const hours = document.getElementById('hoursInput').value;
    const activity = document.getElementById('activityInput').value;
    const desc = document.getElementById('descInput').value;
    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const currentRate = userDoc.data().hourlyRate || 200;

    if (!date || !hours || !activity || !desc) {
        showToast("Vyplň všechna pole!", "warning");
        return;
    }
    //aby nesla zadat 0 hodin
    if (Number(hours) <= 0) {
        showToast("Počet hodin musí být větší než 0!", "warning");
        return;
    }

    try {
        // Vytvoříme/přidáme do kolekce 'work_records' nový dokument
        await addDoc(collection(db, "work_records"), {
            date: date,
            hours: Number(hours),
            activity: activity,
            description: desc,
            rate: currentRate,
            userId: auth.currentUser.uid,
            createdAt: serverTimestamp()
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
let unsubscribeSnapshot = null; // Pojistka pro odpojení databáze při odhlášení

function loadRecords() {
    // Pokud už posloucháme nějaká data, nejprve to zrušíme
    if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
    }

    // Vytvoříme dotaz na databázi (pouze WHERE, abychom se vyhnuli chybě s indexem)
    const q = query(
        collection(db, "work_records"),
        where("userId", "==", auth.currentUser.uid)
    );

    // onSnapshot je kouzlo - poslouchá změny v reálném čase
    unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        allRecords = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
        }));

        // Seřadíme data podle data (od nejnovějšího po nejstarší) bezpečně v JavaScriptu
        allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderRecords();
    }, (error) => {
        console.error("Chyba při načítání: ", error);
    });
}
// --- VYKRESLOVANÍ S FILTRY ---
function renderRecords() {
    // 1. Pomocná funkce: Zbaví text háčků a čárek
    const removeDiacritics = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // 2. Načtení vyhledávání: Převedeme na malá písmena a odstraníme diakritiku
    const rawSearchValue = document.getElementById('searchInput').value.toLowerCase().trim();
    const searchValue = removeDiacritics(rawSearchValue);

    const sortValue = document.getElementById('sort-toggle-btn').getAttribute('data-sort'); 
    const monthValue = document.getElementById('monthFilter').value; 
    const exactDateValue = document.getElementById('exactDateFilter').value;
    
    // Tady také odstraníme diakritiku (kdybys někdy chtěl, aby i výběr z činností ignoroval háčky)
    const rawActivityValue = document.getElementById('activityFilter').value.toLowerCase().trim();
    const activityValue = removeDiacritics(rawActivityValue);

    const list = document.getElementById('records-list');
    list.innerHTML = '';

    // 3. Zřetězené filtrování
    let filtered = allRecords.filter(record => {
        // Texty z databáze očešeme o háčky a čárky, abychom porovnávali jablka s jablky
        const safeDesc = record.description ? removeDiacritics(record.description.toLowerCase()) : '';
        const safeAct = record.activity ? removeDiacritics(record.activity.toLowerCase()) : 'ostatni'; // "ostatní" je teď taky bez háčku

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
    let totalMoney = 0; // Přidali jsme proměnnou pro peníze
    
    // Sečteme hodiny a peníze ze všech aktuálně zobrazených (vyfiltrovaných) záznamů
    filtered.forEach(record => {
        totalHours += Number(record.hours);
        // Počítáme peníze podle sazby uložené u záznamu (pokud chybí, dáme 200 jako záchranu)
        totalMoney += (Number(record.hours) * (record.rate || 200)); 
    });

    // Pošleme to do HTML pro aktuální přehled
    document.getElementById('stat-count').innerText = filtered.length;
    document.getElementById('stat-hours').innerText = totalHours + " h";
    document.getElementById('stat-money').innerText = totalMoney.toLocaleString('cs-CZ') + " Kč";

    // --- GLOBÁLNÍ ROČNÍ SOUHRNY (Vždy ze všech záznamů) ---
    const yearlyData = {};
    allRecords.forEach(record => {
        const year = record.date.split('-')[0]; // Vezme rok
        // Nyní neukládáme jen číslo, ale objekt {hodiny, peníze}
        if (!yearlyData[year]) yearlyData[year] = { hours: 0, money: 0 }; 
        
        yearlyData[year].hours += Number(record.hours); 
        yearlyData[year].money += (Number(record.hours) * (record.rate || 200));
    });

    const yearlyList = document.getElementById('yearly-summary-list');
    if (yearlyList) { 
        yearlyList.innerHTML = ''; 
        
        Object.keys(yearlyData).sort((a, b) => b - a).forEach(year => {
            const row = document.createElement('div');
            row.className = 'stat-row'; 
    
            row.innerHTML = `
                <span><strong>${year}</strong></span>
                <span>${yearlyData[year].hours} h <small class="text-secondary">(${yearlyData[year].money.toLocaleString('cs-CZ')} Kč)</small></span>
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
    //aby nesla zadat 0
    if (Number(hours) <= 0) {
        showToast("Počet hodin musí být větší než 0!", "warning");
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


// ==========================================
// --- ODESÍLÁNÍ POMOCÍ KLÁVESY ENTER ---
// ==========================================
function setupEnterKey(inputId, buttonId) {
    const input = document.getElementById(inputId);
    if(input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Zabrání výchozímu chování prohlížeče
                document.getElementById(buttonId).click(); // Simuluje kliknutí
            }
        });
    }
}

// Přihlášení
setupEnterKey('login-email', 'login-btn');
setupEnterKey('login-password', 'login-btn');

// Registrace
setupEnterKey('reg-name', 'register-btn');
setupEnterKey('reg-email', 'register-btn');
setupEnterKey('reg-password', 'register-btn');
setupEnterKey('reg-password-confirm', 'register-btn');

// Rychlé uložení hodin/záznamů (když zadáš mzdu, hodiny nebo poznámku a dáš enter)
setupEnterKey('onboarding-rate', 'save-onboarding-btn');
setupEnterKey('hoursInput', 'add-record-btn');
setupEnterKey('descInput', 'add-record-btn');
setupEnterKey('editHoursInput', 'save-edit-btn');
setupEnterKey('editDescInput', 'save-edit-btn');


// ==========================================
// --- BAREVNÁ SCHÉMATA A DARK/LIGHT REŽIM ---
// ==========================================

// 1. Slovník našich barev (verze pro světlý a tmavý režim)
const colorPalettes = {
    'modra': { light: '#445da4', dark: '#76a1e6' },
    'oranzova': { light: '#c3581e', dark: '#cd8551' },
    'zelena': { light: '#00c083', dark: '#00D28E' },
    'fialova': { light: '#985caf', dark: '#9d70af' },
    'cervena': { light: '#e05666', dark: '#d34758' },
    'invertovana': { light: '#242423', dark: '#ffffff' }
};

let currentAccentTheme = localStorage.getItem('app-accent-theme') || 'modra';
let colorSwatches = document.querySelectorAll('.color-swatch');

// 2. Funkce pro aplikování správné barvy
function applyAccentTheme(themeName) {
    currentAccentTheme = themeName;
    
    // Zjistíme, jestli je zrovna aktivní dark mode
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    
    // Vybereme správný HEX kód ze slovníku
    const hexColor = colorPalettes[themeName][isDark ? 'dark' : 'light'];

    // Nastavíme barvu aplikaci
    document.body.style.setProperty('--accent-color', hexColor);
    
    // Zvýrazníme správnou tečku v profilu
    colorSwatches.forEach(swatch => {
        if(swatch.getAttribute('data-theme-name') === themeName) {
            swatch.classList.add('active');
        } else {
            swatch.classList.remove('active');
        }
    });
}

// 3. Funkce pro PŘEPÍNÁNÍ DARK/LIGHT REŽIMU
const themeToggleBtn = document.getElementById('theme-toggle');
const currentThemeMode = localStorage.getItem('theme') || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

function applyTheme(mode) {
    const themeIcon = document.getElementById('theme-icon');
    const mobileThemeIcon = document.getElementById('mobile-theme-icon');
    const profileIcon = document.getElementById('profile-theme-icon');
    const profileText = document.getElementById('profile-theme-text');

    if (mode === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.classList.replace('ph-moon', 'ph-sun');
        if (mobileThemeIcon) mobileThemeIcon.classList.replace('ph-moon', 'ph-sun');
        if (profileIcon) profileIcon.className = 'ph ph-sun';
        if (profileText) profileText.innerText = 'Světlý režim';
    } else {
        document.body.removeAttribute('data-theme');
        if (themeIcon) themeIcon.classList.replace('ph-sun', 'ph-moon');
        if (mobileThemeIcon) mobileThemeIcon.classList.replace('ph-sun', 'ph-moon');
        if (profileIcon) profileIcon.className = 'ph ph-moon';
        if (profileText) profileText.innerText = 'Tmavý režim';
    }
    
    // DŮLEŽITÉ: Po přepnutí režimu musíme znovu přepočítat naši vybranou barvu!
    applyAccentTheme(currentAccentTheme);
}

// Aplikujeme při startu aplikace
applyTheme(currentThemeMode); 

// Tlačítka pro přepnutí režimu (PC i Mobil)
function toggleTheme() {
    let newMode = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(newMode);
    localStorage.setItem('theme', newMode);
}

if(themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
if(mobileThemeToggle) mobileThemeToggle.addEventListener('click', toggleTheme);

// 4. Funkce pro oživení barevných kuliček (voláme ji i při otevření profilu)
function setupColorSwatches() {
    const swatches = document.querySelectorAll('.color-swatch');
    
    swatches.forEach(swatch => {
        // Pojistka, abychom nepřidávali eventy víckrát na stejnou kuličku
        if (swatch.getAttribute('data-has-events')) return;
        
        const themeName = swatch.getAttribute('data-theme-name');

        // KLIKNUTÍ: Nastaví barvu natrvalo
        swatch.addEventListener('click', () => {
            applyAccentTheme(themeName);
            localStorage.setItem('app-accent-theme', themeName);
            showToast("Barva aplikace změněna.", "success");
        });

        // NAJETÍ MYŠÍ (Preview): Změní barvu jen vizuálně
        swatch.addEventListener('mouseenter', () => {
            applyAccentTheme(themeName);
        });

        // ODJETÍ MYŠÍ: Vrátí barvu na tu, která je uložená v paměti
        swatch.addEventListener('mouseleave', () => {
            const savedTheme = localStorage.getItem('app-accent-theme') || 'modra';
            applyAccentTheme(savedTheme);
        });
        
        // Označíme si, že kulička už eventy má
        swatch.setAttribute('data-has-events', 'true');
    });
}
// Spustíme poprvé při načtení aplikace
setupColorSwatches();


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
        document.body.style.overflow = '';
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
    if (unsubscribeSnapshot) unsubscribeSnapshot(); // Zastaví stahování dat
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


// ==========================================
// BAREVNÁ SCHÉMATA A ÚPRAVA PROFILU
// ==========================================
const profileModal = document.getElementById('profile-modal');

// Otevření hlavního profilu a předvyplnění dat z DB
async function openProfilePage() {
    //zakazeme body aby se nedalo v nem scrollovat
    document.body.style.overflow = 'hidden';
    // Zavřeme případná otevřená menu
    document.getElementById('user-dropdown').classList.add('hidden');
    const mobileMenu = document.getElementById('mobile-fullscreen-menu');
    if (mobileMenu) mobileMenu.classList.remove('menu-open');

    const user = auth.currentUser;
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data() || {};

        const userName = userData.name || user.displayName || 'Uživatel';
        document.getElementById('profile-sidebar-name').innerText = userName;
        document.getElementById('mobile-profile-name').innerText = userName;
        document.getElementById('edit-profile-name').value = userData.name || user.displayName || '';
        document.getElementById('edit-profile-email').value = user.email || '';
        document.getElementById('edit-profile-rate').value = userData.hourlyRate || 200;
    }

    // NOVÉ: Oživíme kuličky v profilu
    setupColorSwatches();
    
    updateProfileThemeUI();
    
    // Nastavíme aktivní kuličku podle aktuálního tématu
    const currentTheme = localStorage.getItem('app-accent-theme') || 'modra';
    applyAccentTheme(currentTheme);

    const profileContainer = document.querySelector('.profile-page-container');
    if (profileContainer) {
        profileContainer.classList.remove('show-detail');
    }

    profileModal.classList.remove('hidden');
}

document.getElementById('open-profile-desktop-btn')?.addEventListener('click', openProfilePage);
document.getElementById('open-profile-mobile-btn')?.addEventListener('click', openProfilePage);
// Zavírání profilu na PC (spodní tlačítko)
document.getElementById('close-profile-page-btn')?.addEventListener('click', () => {
    profileModal.classList.add('hidden');
    document.body.style.overflow = ''; 
});

// Zavírání profilu na MOBILU (nový křížek vpravo nahoře)
document.getElementById('close-profile-mobile-cross')?.addEventListener('click', () => {
    profileModal.classList.add('hidden');
    document.body.style.overflow = ''; 
});

// --- NAVIGACE V PROFILU (KATEGORIE) ---
document.querySelectorAll('.profile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const categoryId = item.getAttribute('data-category');
        const itemName = item.getAttribute('data-text'); // Text pro mobilní hlavičku

        // 1. Změna aktivního stavu v menu
        document.querySelectorAll('.profile-nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // 2. Přepnutí viditelnosti kategorií
        document.querySelectorAll('.profile-category').forEach(cat => cat.classList.add('hidden'));
        document.getElementById(`cat-${categoryId}`).classList.remove('hidden');

        // 3. Scroll nahoru v obsahu
        document.querySelector('.profile-main-content').scrollTop = 0;

        // 4. MOBILNÍ LOGIKA: Nastavení textu a otevření detailu
        const mobileTitle = document.getElementById('mobile-category-title');
        if (mobileTitle) mobileTitle.innerText = itemName;
        
        const profileContainer = document.getElementById('profile-page-container');
        if(profileContainer) {
            profileContainer.classList.add('show-detail');
        }
    });
});

// --- ZAVÍRÁNÍ PROFILU A NÁVRATY ---
// Návrat z detailu kategorie zpět do hlavního mobilního menu
document.getElementById('mobile-back-to-menu-btn')?.addEventListener('click', () => {
    const profileContainer = document.getElementById('profile-page-container');
    if(profileContainer) {
        profileContainer.classList.remove('show-detail');
    }
});

// Úplné zavření profilu (křížkem na mobilu vpravo nahoře)
document.getElementById('close-profile-mobile-cross')?.addEventListener('click', () => {
    profileModal.classList.add('hidden');
    document.body.style.overflow = ''; 
});


// --- ZABEZPEČENÍ TLAČÍTKA HESLA ---
const passInput = document.getElementById('edit-profile-pass');
const passConfirmInput = document.getElementById('edit-profile-pass-confirm');
const saveSecurityBtn = document.getElementById('save-security-btn');

function validatePasswordFields() {
    if (passInput.value.trim() !== "" && passConfirmInput.value.trim() !== "") {
        saveSecurityBtn.removeAttribute('disabled');
    } else {
        saveSecurityBtn.setAttribute('disabled', 'true');
    }
}

passInput.addEventListener('input', validatePasswordFields);
passConfirmInput.addEventListener('input', validatePasswordFields);

// Uložení Osobních údajů (Jméno a E-mail)
document.getElementById('save-personal-btn').addEventListener('click', async () => {
    const newName = document.getElementById('edit-profile-name').value.trim();
    const newEmail = document.getElementById('edit-profile-email').value.trim();
    
    if(!newName || !newEmail) return showToast("Vyplň jméno i e-mail.", "warning");

    try {
        // Update Auth
        await updateProfile(auth.currentUser, { displayName: newName });
        if(auth.currentUser.email !== newEmail) {
            await updateEmail(auth.currentUser, newEmail);
        }
        
        // Update Firestore
        await updateDoc(doc(db, "users", auth.currentUser.uid), { 
            name: newName,
            email: newEmail
        });
        
        // Update UI napříč aplikací
        document.getElementById('profile-sidebar-name').innerText = newName;
        document.getElementById('desktop-user-name').innerText = newName;
        document.getElementById('dropdown-user-name').innerText = newName;
        document.getElementById('mobile-user-name').innerText = newName;
        
        showToast("Osobní údaje uloženy.", "success");
    } catch (e) { 
        if (e.code === 'auth/requires-recent-login') showToast("Pro změnu e-mailu se odhlas a znovu přihlas.", "error");
        else showToast("Chyba: " + e.message, "error"); 
    }
});

// Změna Hesla v profilu
document.getElementById('save-security-btn').addEventListener('click', async () => {
    const pwd1 = document.getElementById('edit-profile-pass').value;
    const pwd2 = document.getElementById('edit-profile-pass-confirm').value;

    if (!pwd1) return showToast("Zadej nové heslo.", "warning");
    if (pwd1 !== pwd2) return showToast("Hesla se neshodují!", "error");
    if (pwd1.length < 6) return showToast("Heslo musí mít aspoň 6 znaků.", "warning");

    try {
        await updatePassword(auth.currentUser, pwd1);
        document.getElementById('edit-profile-pass').value = '';
        document.getElementById('edit-profile-pass-confirm').value = '';
        showToast("Heslo úspěšně změněno.", "success");
    } catch (e) {
        if (e.code === 'auth/requires-recent-login') showToast("Pro změnu hesla se odhlas a znovu přihlas.", "error");
        else showToast("Chyba: " + e.message, "error"); 
    }
});

// --- SMAZÁNÍ ÚČTU ---
const deleteAccountModal = document.getElementById('delete-account-modal');

// Otevření potvrzovacího okna
document.getElementById('open-delete-account-btn').addEventListener('click', () => {
    deleteAccountModal.classList.remove('hidden');
});

// Zavření okna
document.getElementById('close-delete-account-btn').addEventListener('click', () => deleteAccountModal.classList.add('hidden'));
document.getElementById('close-delete-account-cross').addEventListener('click', () => deleteAccountModal.classList.add('hidden'));

// Samotné smazání
document.getElementById('confirm-delete-account-btn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;

    const passwordInput = document.getElementById('delete-account-password');
    const password = passwordInput.value;

    if (!password) {
        showToast("Pro smazání účtu musíš zadat své heslo.", "warning");
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    let backupData = null;

    try {
        // 1. RE-AUTENTIZACE: Oklame Firebase bezpečnostní pojistku!
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);

        // ZÁLOHA: Načteme si data profilu, než je smažeme
        const snap = await getDoc(userDocRef);
        if (snap.exists()) backupData = snap.data();

        // 2. Smažeme profil z naší databáze Firestore
        await deleteDoc(userDocRef);
        
        // 3. Smažeme samotný účet z Firebase Authentication
        await deleteUser(user);
        
        showToast("Účet byl úspěšně smazán.", "success");
        deleteAccountModal.classList.add('hidden');
        document.getElementById('profile-modal').classList.add('hidden');
        document.body.style.overflow = ''; // Obnovíme scrollování
        passwordInput.value = ''; // Vyčistíme heslo
        
    } catch (error) {
        // OBNOVA DAT: Pokud smazání účtu selže, vrátíme profil zpět do databáze!
        if (backupData) {
            await setDoc(userDocRef, backupData);
        }

        // Zkontrolujeme, jestli se uživatel nespletl v hesle
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showToast("Zadal jsi špatné heslo.", "error");
        } else {
            showToast("Chyba při mazání: " + error.message, "error");
        }
    }
});

// Uložení Administrace (Hodinová mzda)
document.getElementById('save-admin-btn').addEventListener('click', async () => {
    const newRate = Number(document.getElementById('edit-profile-rate').value);
    if(!newRate || newRate <= 0) return showToast("Zadej platnou mzdu.", "warning");
    
    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { hourlyRate: newRate });
        showToast("Nastavení uloženo.", "success");
        // Protože se mu teď změnila mzda pro BUDOUCÍ záznamy, nemusíme překreslovat ty staré.
    } catch (e) { showToast("Chyba: " + e.message, "error"); }
});


// --- ADMIN: SPRÁVA ZAMĚSTNANCŮ ---
const manageWorkersModal = document.getElementById('manage-workers-modal');
const workersCheckboxList = document.getElementById('workers-checkbox-list');

// Funkce pro otevření okna a načtení dat
document.getElementById('open-manage-workers-btn')?.addEventListener('click', async () => {
    manageWorkersModal.classList.remove('hidden');
    workersCheckboxList.innerHTML = `<div class="empty-state"><i class="ph ph-spinner-gap"></i><p>Načítám...</p></div>`;

    try {
        // 1. Zjistíme, koho už admin sleduje (jeho aktuální seznam)
        const adminDoc = await getDoc(doc(db, "users", window.currentEmployerId));
        const monitoredWorkers = adminDoc.data().monitoredWorkers || [];

        // 2. Stáhneme VŠECHNY uživatele z databáze
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        workersCheckboxList.innerHTML = ''; // Vyčistíme načítání
        let workersFound = false;

        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Vyfiltrujeme jen brigádníky (nechceme, aby si admin přidal sám sebe nebo jiného admina)
            if (userData.role === 'worker') {
                workersFound = true;
                const isChecked = monitoredWorkers.includes(userId) ? 'checked' : '';

                const label = document.createElement('label');
                label.className = 'checkbox-item';
                label.innerHTML = `
                    <input type="checkbox" value="${userId}" ${isChecked}>
                    <div class="worker-info">
                        <span class="worker-name">${userData.name || 'Neznámé jméno'}</span>
                        <span class="worker-email">${userData.email}</span>
                    </div>
                `;
                workersCheckboxList.appendChild(label);
            }
        });

        if (!workersFound) {
            workersCheckboxList.innerHTML = `<div class="empty-state"><p>Zatím se neregistroval žádný brigádník.</p></div>`;
        }

    } catch (e) {
        console.error("Chyba při načítání brigádníků:", e);
        workersCheckboxList.innerHTML = `<div class="empty-state"><p class="text-danger">Chyba připojení.</p></div>`;
    }
});

// Zavírání okna
document.getElementById('close-manage-workers-btn').addEventListener('click', () => manageWorkersModal.classList.add('hidden'));
document.getElementById('close-manage-workers-cross').addEventListener('click', () => manageWorkersModal.classList.add('hidden'));

// Uložení výběru
document.getElementById('save-manage-workers-btn').addEventListener('click', async () => {
    // Najdeme všechny zaškrtnuté checkboxy a získáme jejich 'value' (což je UserID)
    const checkboxes = workersCheckboxList.querySelectorAll('input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);

    try {
        // Uložíme pole IDček k profilu admina v databázi
        await updateDoc(doc(db, "users", window.currentEmployerId), {
            monitoredWorkers: selectedIds
        });
        
        showToast("Výběr brigádníků byl uložen.", "success");
        manageWorkersModal.classList.add('hidden');
        
        //zavoláme funkci pro překreslení admin karet!
        renderAdminDashboard(); 
        
    } catch (e) {
        console.error("Chyba při ukládání brigádníků:", e);
        showToast("Něco se pokazilo.", "error");
    }
});
// --- ADMIN: VYKRESLOVÁNÍ NÁSTĚNKY ---
const adminWorkersList = document.getElementById('admin-workers-list');

async function renderAdminDashboard() {
    if (!window.currentEmployerId) return;

    adminWorkersList.innerHTML = `<div class="empty-state"><i class="ph ph-spinner-gap"></i><p>Načítám data...</p></div>`;

    try {
        const adminDoc = await getDoc(doc(db, "users", window.currentEmployerId));
        const monitoredIds = adminDoc.data().monitoredWorkers || [];

        if (monitoredIds.length === 0) {
            adminWorkersList.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-users"></i>
                    <p>Zatím nesleduješ žádné zaměstnance. Přidej si je přes Správu zaměstnanců nahoře.</p>
                </div>
            `;
            return;
        }

        // Zjistíme a vypíšeme aktuální měsíc (Česky)
        const monthNames = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        document.getElementById('admin-month-title').innerText = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
        adminWorkersList.innerHTML = ''; 

        for (const workerId of monitoredIds) {
            const workerDoc = await getDoc(doc(db, "users", workerId));
            const workerName = workerDoc.exists() ? (workerDoc.data().name || 'Neznámé jméno') : 'Smazaný uživatel';

            const recordsQuery = query(collection(db, "work_records"), where("userId", "==", workerId));
            const recordsSnapshot = await getDocs(recordsQuery);
            
            let currentMonthRecords = 0;
            let currentMonthHours = 0;

            recordsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.date.startsWith(currentMonthPrefix)) {
                    currentMonthRecords++;
                    currentMonthHours += Number(data.hours);
                }
            });

            // Vytvoříme kartu, která má už v sobě připravené oba "stavy" (zavřený i otevřený)
            const card = document.createElement('div');
            card.className = 'admin-worker-card';
            card.setAttribute('data-worker-id', workerId);
            
            card.innerHTML = `
                <div class="admin-card-collapsed">
                    <div class="admin-worker-name">${workerName}</div>
                    <div class="admin-worker-stats">
                        <div class="admin-stat-block">
                            <span class="admin-stat-label">Záznamů:</span>
                            <span class="admin-stat-value">${currentMonthRecords}</span>
                        </div>
                        <div class="vertical-divider"></div>
                        <div class="admin-stat-block">
                            <span class="admin-stat-label">Počet hodin:</span>
                            <span class="admin-stat-value">${currentMonthHours}</span>
                        </div>
                    </div>
                </div>
                <div class="admin-card-expanded">
                    </div>
            `;
            adminWorkersList.appendChild(card);
        }
    } catch (error) {
        console.error("Chyba při kreslení admin panelu:", error);
        adminWorkersList.innerHTML = `<div class="empty-state"><p class="text-danger">Chyba při načítání dat.</p></div>`;
    }
}

// --- ADMIN: ROZBALOVÁNÍ KARET (Lazy Loading + Grid Layout) ---
adminWorkersList.addEventListener('click', async (e) => {
    const card = e.target.closest('.admin-worker-card');
    if (!card) return;

    const isExpanded = card.classList.contains('expanded');

    // Chytre zavírání: Pokud je karta otevřená, zavře se POUZE když klikneme na jméno/statistiky vlevo.
    // Tím dovolíme adminovi normálně skrolovat v záznamech napravo, aniž by se mu to pod rukama zavíralo.
    if (isExpanded) {
        if (e.target.closest('.expanded-left')) {
            card.classList.remove('expanded');
        }
        return; 
    }

    // --- LOGIKA PRO OTEVŘENÍ ---
    // Zavřeme všechny ostatní karty
    document.querySelectorAll('.admin-worker-card.expanded').forEach(c => c.classList.remove('expanded'));
    card.classList.add('expanded');

    const workerId = card.getAttribute('data-worker-id');
    const workerName = card.querySelector('.admin-worker-name').innerText;
    let expandedDiv = card.querySelector('.admin-card-expanded');
    
    // Pokud je otevřená poprvé, vygenerujeme obsah
    if (expandedDiv.innerHTML.trim() === '') {
        expandedDiv.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><i class="ph ph-spinner-gap"></i><p>Načítám výkazy...</p></div>`;

        try {
            const now = new Date();
            const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            const q = query(collection(db, "work_records"), where("userId", "==", workerId));
            const snapshot = await getDocs(q);
            
            let records = [];
            let totalHours = 0;
            let totalMoney = 0;
            
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.date.startsWith(currentMonthPrefix)) {
                    records.push({ id: docSnap.id, ...data });
                    totalHours += Number(data.hours);
                    totalMoney += (Number(data.hours) * (data.rate || 200));
                }
            });

            records.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Vygenerování pravého sloupce (Seznam výkazů)
            let recordsHTML = '';
            if (records.length === 0) {
                recordsHTML = `<p class="text-secondary text-center mt-40">Žádné záznamy v tomto měsíci.</p>`;
            } else {
                records.forEach(rec => {
                    const [y, m, d] = rec.date.split('-');
                    recordsHTML += `
                        <div class="admin-mini-record">
                            <div class="admin-mini-record-header">
                                <span class="record-date">${d}. ${m}. ${y}</span>
                                <span class="badge-display">${rec.activity || 'ostatní'}</span>
                                <span class="record-hours text-accent"><i class="ph ph-clock"></i> ${rec.hours} h</span>
                            </div>
                            ${rec.description ? `<p class="text-secondary mt-10 text-sm">${rec.description}</p>` : ''}
                        </div>
                    `;
                });
            }

            // Vygenerování levého sloupce a spojení (Přesně podle tvého nákresu)
            expandedDiv.innerHTML = `
                <div class="expanded-left" title="Kliknutím sem kartu opět zavřeš">
                    <h2 class="expanded-name">${workerName}</h2>
                    <div class="expanded-stats-box">
                        <span class="dropdown-header text-sm" style="margin-bottom: 5px;">Měsíční statistiky</span>
                        <div class="stat-row">
                            <span class="text-secondary">Záznamů</span>
                            <strong class="text-accent">${records.length}</strong>
                        </div>
                        <div class="stat-row">
                            <span class="text-secondary">Odpracováno</span>
                            <strong class="text-accent">${totalHours} h</strong>
                        </div>
                        <div class="stat-row">
                            <span class="text-secondary">Výdělek</span>
                            <strong class="text-accent">${totalMoney.toLocaleString('cs-CZ')} Kč</strong>
                        </div>
                    </div>
                </div>
                <div class="expanded-right">
                    ${recordsHTML}
                </div>
            `;

        } catch(err) {
            console.error(err);
            expandedDiv.innerHTML = `<p class="text-danger" style="grid-column: 1 / -1;">Chyba stahování dat.</p>`;
        }
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
        const response = await fetch('tamplates/sablona.xlsx'); // Musí být ve stejné složce
        const arrayBuffer = await response.arrayBuffer();

        // 2. Otevřeme ho pomocí ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1); // Vybereme první list

        // Zjištění jména aktuálně přihlášeného uživatele
        const user = auth.currentUser;
        const userName = (user && user.displayName) ? user.displayName : "Brigádník";

        // Přepsání buňky A1 v excelové šabloně
        worksheet.getCell('A1').value = `Výkaz prací ${userName}`;

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
