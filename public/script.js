// --- CONFIGURATION HIRAM ARCHITECH WEB ---
const SERVER_URL = 'https://bet-ia-2.onrender.com';
let sessionValide = false; 

// --- SYSTÈME D'ACCÈS ---
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
    const paymentScreen = document.getElementById('payment-screen');
    if (paymentScreen) paymentScreen.style.display = 'none';
    alert("Accès HIRAM activé !");
}

function checkAdminCode() {
    const code = document.getElementById('admin-secret-code').value;
    if(code === "HIRAM242") { 
        validerAccesSession();
    } else {
        alert("Code incorrect.");
    }
}

// --- NOTIFICATIONS ---
function copierNumero() {
    navigator.clipboard.writeText("068424624");
    alert("Numéro copié : 068424624");
}

function envoyerNotificationPaiement() {
    const numero = document.getElementById('client-phone').value;
    if (numero.length < 9) { alert("Numéro invalide."); return; }

    const destinataire = "hiramearchitecteweb@gmail.com";
    const sujet = encodeURIComponent("💰 PAIEMENT BET IA - " + numero);
    const corps = encodeURIComponent("Bonjour Enki, j'ai fait le dépôt de 50F. Mon numéro : " + numero);
    
    window.location.href = `mailto:${destinataire}?subject=${sujet}&body=${corps}`;
    alert("Envoie le mail et attends le code de validation !");
}

// --- CHARGEMENT INITIAL ---
document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader-hiram');
    
    // Réveil forcé du serveur
    fetch(`${SERVER_URL}/api/ping`).catch(() => {});

    setTimeout(() => {
        if(loader) {
            loader.style.display = 'none';
            verifierStatutPaiement();
        }
    }, 2000);
});

// --- NAVIGATION ---
function showTab(tabId, element) {
    if (!verifierStatutPaiement()) return;

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (element) element.classList.add('active');

    if(tabId === 'stats-section') fetchVraisMatchsReels();
}

// --- RÉCUPÉRATION DES MATCHS (LA VERSION QUI NE FAILLE PAS) ---
async function fetchVraisMatchsReels() {
    const container = document.getElementById('all-matches-list');
    if(!container) return;
    
    container.innerHTML = '<div class="loading-text">Connexion au cerveau HIRAM...</div>';

    try {
        const response = await fetch(`${SERVER_URL}/api/matches`);
        const data = await response.json();
        
        container.innerHTML = `<div class="date-divider">Matchs de la semaine</div>`; 

        if (!data.matches || data.matches.length === 0) {
            container.innerHTML += `<div class="loading-text">Aucun match trouvé. Réessaie dans 1 min le temps que Render se réveille.</div>`;
            return;
        }

        data.matches.forEach(match => {
            const dateObj = new Date(match.utcDate);
            const dateMatch = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            const heureMatch = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            const home = (match.homeTeam.shortName || match.homeTeam.name).replace(/'/g, " ");
            const away = (match.awayTeam.shortName || match.awayTeam.name).replace(/'/g, " ");

            container.innerHTML += `
                <div class="card mini-match-card">
                    <div class="mini-info-box">
                        <span class="match-date-badge">${dateMatch}</span>
                        <div class="teams-display">
                            <span class="team-name">${home}</span>
                            <span class="vs-text">VS</span>
                            <span class="team-name">${away}</span>
                        </div>
                        <span class="league-tag">${heureMatch}</span>
                    </div>
                    <button class="action-btn" onclick="preRemplir('${home}', '${away}')">Analyser</button>
                </div>`;
        });
    } catch (error) {
        container.innerHTML = `<div class="loading-text" style="color:#ff4d4d">Le serveur est en cours de réveil. Patiente 30s et reclique sur Calendrier.</div>`;
    }
}

// --- ANALYSE IA ---
async function lancerAnalyseIA() {
    const dom = document.getElementById('home-team').value;
    const ext = document.getElementById('away-team').value;

    if (!dom || !ext) { alert("Choisis un match !"); return; }
    
    const resultContainer = document.getElementById('analysis-output'); 
    resultContainer.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Intelligence HIRAM en cours...</p></div>`;

    try {
        const response = await fetch(`${SERVER_URL}/api/analyse-expert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ homeName: dom, awayName: ext })
        });
        const dataIA = await response.json();
        
        resultContainer.innerHTML = `
            <div class="card analysis-card" style="margin-top:20px; border: 1px solid #00d4ff; background: rgba(0,0,0,0.9); padding:20px; border-radius:15px;">
                <h2 style="font-size:45px; color:#fff; text-align:center;">${dataIA.score}</h2>
                <p style="text-align:center; color:#00d4ff;">Confiance : ${dataIA.confidence}%</p>
                <div style="display:flex; justify-content:space-around; margin:15px 0; color:#fff;">
                    <span>V: ${dataIA.win_probability}</span>
                    <span>N: ${dataIA.draw_probability}</span>
                </div>
                <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; color:#eee; font-size:13px;">
                    ${dataIA.ai_analysis}
                </div>
            </div>`;
    } catch (error) {
        resultContainer.innerHTML = `<div class="loading-text" style="color:#ff4d4d">Erreur d'analyse. Réessaie.</div>`;
    }
}

function preRemplir(dom, ext) {
    document.getElementById('home-team').value = dom;
    document.getElementById('away-team').value = ext;
    showTab('home-section', document.querySelectorAll('.tab-link')[0]);
}

function toggleGuide() {
    const modal = document.getElementById('modal-guide');
    if(modal) modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
}