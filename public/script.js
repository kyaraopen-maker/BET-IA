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

// --- FILTRAGE (CORRIGÉ POUR L'ID DU HTML) ---
function filtrerMatchs() {
    // Ton HTML utilise id="search-match", donc on adapte ici
    const searchInput = document.getElementById('search-match');
    if (!searchInput || allMatchesData.length === 0) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = allMatchesData.filter(match => {
        const home = (match.homeTeam.name).toLowerCase();
        const away = (match.awayTeam.name).toLowerCase();
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

// --- RÉCUPÉRATION RÉELLE ---
async function fetchVraisMatchsReels() {
    const container = document.getElementById('all-matches-list');
    if(!container) return;
    
    container.innerHTML = `
        <div class="loading-text">
            <div class="spinner"></div>
            Récupération des matchs en cours...
        </div>`;

    try {
        const response = await fetch(`${SERVER_URL}/api/matches`);
        const data = await response.json();
        
        if (data.matches && data.matches.length > 0) {
            allMatchesData = data.matches;
            displayMatches(allMatchesData);
        } else {
            container.innerHTML = `<div class="loading-text">Aucun match trouvé.</div>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="loading-text" style="color:#ff4d4d">⚠️ Serveur en réveil... Réessaie dans 10s.</div>`;
    }
}

function displayMatches(matches) {
    const container = document.getElementById('all-matches-list');
    if (!container) return;
    container.innerHTML = `<div class="date-divider">Vrais prochains matchs</div>`; 

    matches.forEach(match => {
        const matchDate = new Date(match.utcDate);
        const heure = matchDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const jour = matchDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

        const homeClean = match.homeTeam.name.replace(/'/g, "\\'");
        const awayClean = match.awayTeam.name.replace(/'/g, "\\'");
        
        container.innerHTML += `
            <div class="card mini-match-card animated-fade-in">
                <div class="mini-info-box">
                    <span class="match-date-badge">${jour} - ${heure}</span>
                    <div class="teams-display">
                        <span class="team-name">${match.homeTeam.name}</span>
                        <span class="vs-text">VS</span>
                        <span class="team-name">${match.awayTeam.name}</span>
                    </div>
                    <small style="color:#00d4ff; font-size:10px;">${match.competition.name}</small>
                </div>
                <button class="action-btn" onclick="preRemplir('${homeClean}', '${awayClean}')">Analyser</button>
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
        } else { 
            throw new Error(dataIA.error || "Erreur inconnue"); 
        }
    } catch (e) {
        resultContainer.innerHTML = `<div class="loading-text" style="color:#ff4d4d">❌ Erreur d'analyse. Réessaie.</div>`;
    }
}

function afficherResultatFinal(dom, ext, container, dataIA) {
    container.innerHTML = `
        <div class="card analysis-card animated-bounce-in" style="margin-top:20px; border: 1px solid #00d4ff; background: rgba(0,0,0,0.95); padding:20px; border-radius:15px;">
            <h2 style="font-size:42px; color:#fff; text-align:center;">${dataIA.score}</h2>
            <div style="display:flex; justify-content:space-between; color:#00d4ff; font-weight:bold;">
                 <span>Confiance : ${dataIA.confidence}</span>
                 <span>P(V) : ${dataIA.win_probability}</span>
            </div>
            <p style="color:#fff; font-size:13px; margin-top:15px; border-top:1px solid #333; padding-top:10px; line-height:1.4;">
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
    
    // Adaptation de l'écouteur pour l'ID "search-match"
    const search = document.getElementById('search-match');
    if (search) search.addEventListener('input', filtrerMatchs);
    
    setTimeout(() => {
        const loader = document.getElementById('loader-hiram');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => { 
                loader.style.display = 'none'; 
                verifierStatutPaiement(); 
            }, 1000);
        }
    }, 2000);
});

function copierNumero() { navigator.clipboard.writeText("068424624"); alert("Numéro copié !"); }

function envoyerNotificationPaiement() {
    const num = document.getElementById('client-phone').value;
    if (num.length < 9) return alert("Numéro invalide");
    document.getElementById('form-confirmation').style.display = 'none';
    document.getElementById('wait-message').style.display = 'block';
    
    // Ouvre le mail en arrière-plan
    window.location.href = `mailto:kyaraopenL@gmail.com?subject=PAIEMENT&body=Dépôt de 50F fait par le ${num}`;
}

function toggleGuide() {
    const modal = document.getElementById('modal-guide');
    if(modal.style.display === 'flex') modal.style.display = 'none';
    else modal.style.display = 'flex';
}