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
    if (verifierStatutPaiement()) {
        alert("Accès HIRAM activé !");
    }
}

function checkAdminCode() {
    const code = document.getElementById('admin-secret-code').value;
    if(code === "HIRAM242") {
        validerAccesSession();
    } else {
        alert("Code incorrect.");
    }
}

// --- FILTRAGE ---
function filtrerMatchs() {
    const searchInput = document.getElementById('search-match');
    if (!searchInput || allMatchesData.length === 0) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = allMatchesData.filter(match => {
        const home = (match.homeTeam.name || "").toLowerCase();
        const away = (match.awayTeam.name || "").toLowerCase();
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
    
    // Si on va sur l'onglet des matchs, on lance la récupération
    if(tabId === 'stats-section') fetchVraisMatchsReels();
}

// --- RÉCUPÉRATION DES MATCHS ---
async function fetchVraisMatchsReels() {
    const container = document.getElementById('all-matches-list');
    if(!container) return;
    
    container.innerHTML = `
        <div class="loading-text">
            <div class="spinner"></div>
            Récupération des matchs réels...
        </div>`;

    try {
        const response = await fetch(`${SERVER_URL}/api/matches`);
        if (!response.ok) throw new Error("Erreur serveur");
        
        const data = await response.json();
        
        if (data.matches && data.matches.length > 0) {
            allMatchesData = data.matches;
            displayMatches(allMatchesData);
        } else {
            container.innerHTML = `<div class="loading-text">Aucun match disponible pour le moment.</div>`;
        }
    } catch (error) {
        console.error("Fetch error:", error);
        container.innerHTML = `<div class="loading-text" style="color:#ff4d4d">⚠️ Serveur en réveil... Réessaie dans 15s.</div>`;
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

        // Nettoyage pour éviter les erreurs JS dans le onclick
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
    
    if (!dom || !ext) { 
        alert("Choisis un match d'abord !"); 
        return; 
    }
    
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
        console.error("AI Error:", e);
        resultContainer.innerHTML = `<div class="loading-text" style="color:#ff4d4d">❌ Échec de l'analyse. Vérifie ta connexion et réessaie.</div>`;
    }
}

function afficherResultatFinal(dom, ext, container, dataIA) {
    container.innerHTML = `
        <div class="card analysis-card animated-bounce-in" style="margin-top:20px; border: 1px solid #00d4ff; background: rgba(0,0,0,0.95); padding:20px; border-radius:15px;">
            <h2 style="font-size:42px; color:#fff; text-align:center; margin-bottom:10px;">${dataIA.score}</h2>
            <div style="display:flex; justify-content:space-between; color:#00d4ff; font-weight:bold; margin-bottom:15px;">
                 <span>Confiance : ${dataIA.confidence}</span>
                 <span>P(V) : ${dataIA.win_probability}</span>
            </div>
            <div style="color:#fff; font-size:14px; border-top:1px solid #333; padding-top:10px; line-height:1.6;">
                <strong style="color:#00d4ff;">Analyse Expert :</strong><br>
                ${dataIA.ai_analysis}
            </div>
        </div>`;
}

function preRemplir(dom, ext) {
    document.getElementById('home-team').value = dom;
    document.getElementById('away-team').value = ext;
    // On redirige vers l'onglet Analyse
    showTab('home-section');
    // On scroll vers le haut pour voir les champs remplis
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Ping pour réveiller Render
    fetch(`${SERVER_URL}/api/ping`).catch(() => {});
    
    // Ecouteur de recherche
    const search = document.getElementById('search-match');
    if (search) search.addEventListener('input', filtrerMatchs);
    
    // Gestion du Loader au démarrage
    setTimeout(() => {
        const loader = document.getElementById('loader-hiram');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => { 
                loader.style.display = 'none'; 
                verifierStatutPaiement(); 
            }, 600);
        }
    }, 2000);
});

// --- FONCTIONS UTILITAIRES ---
function copierNumero() { 
    navigator.clipboard.writeText("068424624"); 
    alert("Numéro copié ! Faites votre dépôt de 50F."); 
}

function envoyerNotificationPaiement() {
    const num = document.getElementById('client-phone').value;
    if (num.length < 9) return alert("Veuillez entrer un numéro valide (ex: 06...)");
    
    document.getElementById('form-confirmation').style.display = 'none';
    document.getElementById('wait-message').style.display = 'block';
    
    // Notification via backend
    fetch(`${SERVER_URL}/api/notif-paiement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero_client: num, projet: 'Congo Bet IA' })
    }).catch(err => console.log("Erreur notif:", err));

    // Fallback mailto
    setTimeout(() => {
        window.location.href = `mailto:kyaraopenL@gmail.com?subject=PAIEMENT&body=Dépôt de 50F fait par le ${num}`;
    }, 1500);
}

function toggleGuide() {
    const modal = document.getElementById('modal-guide');
    if(modal) {
        modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    }
}