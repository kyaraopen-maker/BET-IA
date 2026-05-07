// --- CONFIGURATION HIRAM ARCHITECH WEB ---
const API_KEY = '1280eb84a2b04228b4b3ba402532d615'; 
const PROXY = 'https://cors-anywhere.herokuapp.com/';
const SERVER_URL = 'https://bet-ia-2.onrender.com/api/analyse-expert'; 

let sessionValide = false; // L'accès est perdu si on actualise la page

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
    const paymentScreen = document.getElementById('payment-screen');
    if (paymentScreen) paymentScreen.style.display = 'none';
    alert("Accès HIRAM activé pour cette session.");
}

function checkAdminCode() {
    const code = document.getElementById('admin-secret-code').value;
    if(code === "HIRAM242") { 
        validerAccesSession();
    } else {
        alert("Code incorrect.");
    }
}

// --- NOUVELLE FONCTION : NOTIFICATION PAR GMAIL (DIRECT) ---

function envoyerNotificationPaiement() {
    const numero = document.getElementById('client-phone').value;
    
    if (numero.length < 9) {
        alert("Veuillez entrer un numéro valide.");
        return;
    }

    // Préparation du mail pour Enki
    const destinataire = "hiramearchitecteweb@gmail.com";
    const sujet = encodeURIComponent("💰 PAIEMENT CONGO BET IA - " + numero);
    const corps = encodeURIComponent("Bonjour Enki,\n\nJe viens d'effectuer le dépôt de 50F pour le service BET IA.\nMon numéro de dépôt : " + numero + "\n\nMerci de me transmettre le code d'accès.");
    
    // Ouvre Gmail/Mail sur le téléphone
    window.location.href = `mailto:${destinataire}?subject=${sujet}&body=${corps}`;

    // Mise à jour de l'interface
    const formConf = document.getElementById('form-confirmation');
    const waitMsg = document.getElementById('wait-message');
    if(formConf) formConf.style.display = 'none';
    if(waitMsg) waitMsg.style.display = 'block';

    setTimeout(() => {
        alert("Envoie le mail qui vient de s'ouvrir. Enki te donnera le code après vérification sur son MoMo !");
    }, 1000);
}

function copierNumero() {
    navigator.clipboard.writeText("068424624");
    alert("Numéro copié : 068424624");
}

// --- LOGIQUE D'ANIMATION (LOADER) ---

document.addEventListener('DOMContentLoaded', () => {
    const textElement = document.getElementById('typing-text');
    const loader = document.getElementById('loader-hiram');
    const phrase = "BET IA ";
    let index = 0;

    function typeWriter() {
        if (textElement && index < phrase.length) {
            textElement.innerHTML += phrase.charAt(index);
            index++;
            setTimeout(typeWriter, 70);
        } else {
            setTimeout(() => {
                if(loader) {
                    loader.style.opacity = '0';
                    setTimeout(() => {
                        loader.style.display = 'none';
                        verifierStatutPaiement();
                    }, 1000);
                }
            }, 1000);
        }
    }
    typeWriter();
});

// --- NAVIGATION ET ANALYSE ---

function showTab(tabId, element) {
    if (!verifierStatutPaiement()) return;

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    if (element) element.classList.add('active');

    if(tabId === 'stats-section') fetchVraisMatchsReels();
}

async function fetchVraisMatchsReels() {
    const container = document.getElementById('all-matches-list');
    if(!container) return;
    container.innerHTML = '<div class="loading-text">Synchronisation du calendrier...</div>';

    try {
        const urlAPI = `https://api.football-data.org/v4/matches?competitions=PL,FL1,CL,BL1,SA,PD,DED,PPL`;
        const response = await fetch(PROXY + urlAPI, {
            headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        container.innerHTML = `<div class="date-divider">Matchs à venir</div>`; 

        data.matches.forEach(match => {
            const dateObj = new Date(match.utcDate);
            const dateMatch = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            const heureMatch = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const home = match.homeTeam.name.replace(/'/g, "\\'");
            const away = match.awayTeam.name.replace(/'/g, "\\'");

            container.innerHTML += `
                <div class="card mini-match-card">
                    <div class="mini-info-box">
                        <span class="match-date-badge">${dateMatch}</span>
                        <div class="teams-display">
                            <span class="team-name">${match.homeTeam.shortName || match.homeTeam.name}</span>
                            <span class="vs-text">VS</span>
                            <span class="team-name">${match.awayTeam.shortName || match.awayTeam.name}</span>
                        </div>
                        <span class="league-tag">${heureMatch}</span>
                    </div>
                    <button class="action-btn" onclick="preRemplir('${home}', '${away}')">Analyser</button>
                </div>`;
        });
    } catch (error) {
        container.innerHTML = `<div class="loading-text" style="color:#ff4d4d">Erreur de calendrier.</div>`;
    }
}

async function lancerAnalyseIA(dom, ext) {
    if (!verifierStatutPaiement()) return;
    const resultContainer = document.getElementById('analysis-output'); 
    resultContainer.innerHTML = `<div class="loading-box"><div class="spinner"></div><p>Analyse HIRAM en cours...</p></div>`;

    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ homeName: dom, awayName: ext })
        });
        const dataIA = await response.json();
        afficherResultatFinal(dom, ext, resultContainer, dataIA);
    } catch (error) {
        resultContainer.innerHTML = `<div class="loading-text" style="color:#ff4d4d">❌ Erreur : Serveur IA déconnecté.</div>`;
    }
}

function afficherResultatFinal(dom, ext, container, dataIA) {
    container.innerHTML = `
        <div class="card analysis-card animated-bounce-in" style="margin-top:20px; border: 1px solid #00d4ff; background: rgba(0,0,0,0.95); padding:20px; border-radius:15px;">
            <h3 style="color:#00d4ff; font-size:12px;"><i class="fas fa-microchip"></i> HIRAM EXPERT ANALYTICS</h3>
            <h2 style="font-size:52px; color:#fff; text-align:center;">${dataIA.score}</h2>
            <p style="text-align:center; color:#00d4ff;">Confiance : ${dataIA.confidence}%</p>
            <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:10px; color:#fff; font-size:12px;">
                ${dataIA.ai_analysis}
            </div>
        </div>
    `;
}

function preRemplir(dom, ext) {
    document.getElementById('home-team').value = dom;
    document.getElementById('away-team').value = ext;
    showTab('home-section', document.querySelector('.tab-link:first-child'));
}

function toggleGuide() {
    const modal = document.getElementById('modal-guide');
    if(modal) modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
}