// --- CONFIGURATION HIRAM ARCHITECH WEB ---
const SERVER_URL = 'https://bet-ia-2.onrender.com';
let sessionValide = false; 
let allMatchesData = []; 

// --- SYSTÈME DE VÉRIFICATION D'ACCÈS ---
function verifierStatutPaiement() {
    const paymentScreen = document.getElementById('payment-screen');
    if (sessionValide) {
        if (paymentScreen) paymentScreen.style.display = 'none';
        return true;
    } else {
        if (paymentScreen) paymentScreen.style.display = 'flex';
        return false;
    }
}

function validerAccesSession() {
    sessionValide = true;
    verifierStatutPaiement();
    alert("Accès HIRAM activé !");
}

function checkAdminCode() {
    const code = document.getElementById('admin-secret-code').value;
    if(code === "HIRAM242") validerAccesSession();
    else alert("Code incorrect.");
}

// --- FILTRAGE ---
function filtrerMatchs() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput || allMatchesData.length === 0) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = allMatchesData.filter(match => {
        const home = (match.homeTeam.shortName || match.homeTeam.name).toLowerCase();
        const away = (match.awayTeam.shortName || match.awayTeam.name).toLowerCase();
        return home.includes(searchTerm) || away.includes(searchTerm);
    });
    displayMatches(filtered);
}

// --- NAVIGATION ---
function showTab(tabId, element) {
    if (!verifierStatutPaiement()) return;
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    if (element) element.classList.add('active');
    if(tabId === 'stats-section') fetchVraisMatchsReels();
}

// --- RÉCUPÉRATION (VERSION PRÉSENTATION - 90S) ---
async function fetchVraisMatchsReels() {
    const container = document.getElementById('all-matches-list');
    if(!container) return;
    
    container.innerHTML = `
        <div class="loading-text">
            <div class="spinner"></div>
            Synchronisation HIRAM...<br>
            <small>Réveil du serveur (Soyez patient pour la démo...)</small>
        </div>`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 secondes pour être sûr

        const response = await fetch(`${SERVER_URL}/api/matches`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (data.matches && data.matches.length > 0) {
            allMatchesData = data.matches;
            displayMatches(allMatchesData);
        } else {
            container.innerHTML = `<div class="loading-text">Aucun match disponible pour le moment.</div>`;
        }
    } catch (error) {
        container.innerHTML = `
            <div class="loading-text" style="color:#ff4d4d">
                ⚠️ Connexion en cours...<br>
                Le serveur finit de démarrer. Cliquez en dessous :<br>
                <button onclick="fetchVraisMatchsReels()" class="action-btn" style="margin-top:15px; background:#00d4ff; color:#000;">
                    ACTUALISER LE CALENDRIER
                </button>
            </div>`;
    }
}

function displayMatches(matches) {
    const container = document.getElementById('all-matches-list');
    if (!container) return;
    container.innerHTML = `<div class="date-divider">Matchs disponibles</div>`; 

    matches.forEach(match => {
        const home = (match.homeTeam.shortName || match.homeTeam.name).replace(/'/g, " ");
        const away = (match.awayTeam.shortName || match.awayTeam.name).replace(/'/g, " ");
        container.innerHTML += `
            <div class="card mini-match-card animated-fade-in">
                <div class="mini-info-box">
                    <div class="teams-display">
                        <span class="team-name">${home}</span>
                        <span class="vs-text">VS</span>
                        <span class="team-name">${away}</span>
                    </div>
                </div>
                <button class="action-btn" onclick="preRemplir('${home}', '${away}')">Analyser</button>
            </div>`;
    });
}

// --- ANALYSE IA ---
async function lancerAnalyseIA() {
    const dom = document.getElementById('home-team').value;
    const ext = document.getElementById('away-team').value;
    if (!dom || !ext) { alert("Choisis un match d'abord !"); return; }
    
    const resultContainer = document.getElementById('analysis-output'); 
    resultContainer.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Intelligence HIRAM en cours...</p></div>`;

    try {
        const response = await fetch(`${SERVER_URL}/api/analyse-expert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ homeName: dom, awayName: ext })
        });
        const dataIA = await response.json();
        if(dataIA.status === "SUCCESS") {
            afficherResultatFinal(dom, ext, resultContainer, dataIA);
        } else { throw new Error(); }
    } catch (e) {
        resultContainer.innerHTML = `<div class="loading-text" style="color:#ff4d4d">❌ Erreur IA. Réessaie.</div>`;
    }
}

function afficherResultatFinal(dom, ext, container, dataIA) {
    container.innerHTML = `
        <div class="card analysis-card animated-bounce-in" style="margin-top:20px; border: 1px solid #00d4ff; background: rgba(0,0,0,0.95); padding:20px; border-radius:15px;">
            <h2 style="font-size:42px; color:#fff; text-align:center;">${dataIA.score}</h2>
            <div style="display:flex; justify-content:space-between; color:#00d4ff; font-weight:bold;">
                 <span>Confiance : ${dataIA.confidence}%</span>
                 <span>Buts : ${dataIA.avg_goals}</span>
            </div>
            <p style="color:#fff; font-size:13px; margin-top:15px; border-top:1px solid #333; pt:10px;">
                ${dataIA.ai_analysis}
            </p>
        </div>`;
}

function preRemplir(dom, ext) {
    document.getElementById('home-team').value = dom;
    document.getElementById('away-team').value = ext;
    showTab('home-section');
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    fetch(`${SERVER_URL}/api/ping`).catch(() => {});
    const search = document.getElementById('search-input');
    if (search) search.addEventListener('input', filtrerMatchs);
    
    setTimeout(() => {
        const loader = document.getElementById('loader-hiram');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; verifierStatutPaiement(); }, 1000);
        }
    }, 2000);
});

// Fonctions Paiement
function copierNumero() { navigator.clipboard.writeText("068424624"); alert("Numéro copié !"); }
function envoyerNotificationPaiement() {
    const num = document.getElementById('client-phone').value;
    if (num.length < 9) return alert("Numéro invalide");
    window.location.href = `mailto:hiramearchitecteweb@gmail.com?subject=PAIEMENT&body=Dépôt de 50F fait par le ${num}`;
}