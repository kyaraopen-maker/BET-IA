const express = require('express');
const axios = require('axios');
const cors = require('cors');
const nodemailer = require('nodemailer'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

const app = express();

// --- CONFIGURATION MIDDLEWARES ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURATION HIRAM (Priorité aux variables d'environnement) ---
const MON_GMAIL = "kyaraopenL@gmail.com"; 
const MON_PASS_APP = process.env.GMAIL_APP_PASS || "kyarabusness"; 
const GEMINI_KEY = process.env.GEMINI_KEY || "AIzaSyBJaMLUh4BcfUns_Tr3N9oGleB49wv1Apg"; 
const SPORTMONKS_TOKEN = "bWLHVupyKRR8yhXRH7CcBlAsRr4GKqqabATNCBg9oocGZvzedVpZSDo5Ejje";

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: MON_GMAIL, pass: MON_PASS_APP }
});

// --- ROUTES ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/ping', (req, res) => {
    res.status(200).send("HIRAM_ACTIVE");
});

// --- ROUTE MATCHS (CORRIGÉE POUR SPORTMONKS V3) ---
app.get('/api/matches', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Appel Sportmonks avec filtres corrigés
        const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures`, {
            params: {
                api_token: SPORTMONKS_TOKEN,
                include: 'participants;league',
                // On récupère les matchs du jour pour éviter les erreurs de plage de dates
                filters: `fixtureDates:${today}`, 
                per_page: 50 
            },
            timeout: 10000 
        });

        let matches = [];

        if (response.data && response.data.data) {
            matches = response.data.data.map(f => {
                // Recherche sécurisée des équipes
                const home = f.participants?.find(p => p.meta?.location === 'home');
                const away = f.participants?.find(p => p.meta?.location === 'away');
                
                return {
                    homeTeam: { name: home ? home.name : "Équipe Locale" },
                    awayTeam: { name: away ? away.name : "Équipe Visiteuse" },
                    utcDate: f.starting_at,
                    competition: { name: f.league ? f.league.name : "Ligue" }
                };
            }).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        }

        // Si aucun match trouvé aujourd'hui, on envoie un message clair
        if (matches.length === 0) {
            return res.json({ matches: [{ 
                homeTeam: { name: "Aucun match" }, 
                awayTeam: { name: "aujourd'hui" }, 
                utcDate: new Date().toISOString(), 
                competition: { name: "Info" } 
            }] });
        }

        res.json({ matches });

    } catch (error) {
        console.error("Erreur API Sportmonks:", error.response?.data || error.message);
        // Fallback démo
        res.json({ matches: [{ 
            homeTeam: { name: "Vérifier" }, 
            awayTeam: { name: "Connexion API" }, 
            utcDate: new Date().toISOString(), 
            competition: { name: "Erreur" } 
        }] });
    }
});

// --- ANALYSE IA (VERSION GEMINI 1.5 FLASH) ---
app.post('/api/analyse-expert', async (req, res) => {
    const { homeName, awayName } = req.body;
    
    if (!homeName || !awayName) {
        return res.json({ status: "ERROR", error: "Noms manquants" });
    }

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { temperature: 0.3 } // Plus stable pour le JSON
        });

        const prompt = `Analyse le match de football : ${homeName} vs ${awayName}. 
        Donne un score probable et une analyse tactique courte. 
        Réponds EXCLUSIVEMENT sous ce format JSON :
        {"score": "X-X", "confidence": "X%", "win_probability": "X%", "draw_probability": "X%", "ai_analysis": "..."}`;
        
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        // Extraction du JSON au cas où l'IA ajoute du texte autour
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) throw new Error("Format JSON non détecté");
        
        const finalData = JSON.parse(jsonMatch[0]);
        res.json({ ...finalData, status: "SUCCESS" });

    } catch (error) {
        console.error("❌ IA Error:", error.message);
        res.json({ 
            status: "SUCCESS", 
            score: "Analyse indisponible", 
            confidence: "--", 
            win_probability: "--", 
            ai_analysis: "Le service d'analyse HIRAM est temporairement saturé. Veuillez réessayer dans quelques instants." 
        });
    }
});

// --- SYSTÈME D'ALERTE PAIEMENT ---
app.post('/api/notif-paiement', (req, res) => {
    const { numero_client, projet } = req.body;
    const mailOptions = {
        from: `HIRAM ALERT <${MON_GMAIL}>`,
        to: MON_GMAIL,
        subject: `🚨 PAIEMENT DÉCLARÉ : ${numero_client}`,
        text: `Nouveau paiement déclaré.\nProjet : ${projet || 'Congo Bet IA'}\nClient : ${numero_client}\nDate : ${new Date().toLocaleString()}`
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            console.error("Erreur Mail:", error.message);
            return res.status(500).json({ status: "error" });
        }
        res.json({ status: "success" });
    });
});

// --- DÉMARRAGE ---
const PORT = process.env.PORT || 10000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR HIRAM PRÊT SUR PORT ${PORT}`);
});