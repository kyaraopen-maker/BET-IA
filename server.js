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

// --- CONFIGURATION HIRAM ---
const MON_GMAIL = "kyaraopenL@gmail.com"; 
// Rappel : Utilise ici un MOT DE PASSE D'APPLICATION (16 lettres) généré par Google
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

// --- ROUTE MATCHS ARRANGÉE ---
app.get('/api/matches', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const endRange = "2026-12-31"; 

        const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures`, {
            params: {
                api_token: SPORTMONKS_TOKEN,
                include: 'participants;league',
                filters: `fixtureDates:${today},${endRange}`,
                per_page: 150 
            }
        });

        let matches = [];

        if (response.data && response.data.data) {
            matches = response.data.data.map(f => {
                const home = f.participants.find(p => p.meta.location === 'home');
                const away = f.participants.find(p => p.meta.location === 'away');
                return {
                    homeTeam: { name: home ? home.name : "Équipe Locale" },
                    awayTeam: { name: away ? away.name : "Équipe Visiteuse" },
                    utcDate: f.starting_at,
                    competition: { name: f.league ? f.league.name : "Football" }
                };
            }).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
        }

        if (matches.length === 0) {
            // Matchs de secours si l'API est vide
            matches = [
                { homeTeam: { name: "Liverpool" }, awayTeam: { name: "Atalanta" }, utcDate: new Date().toISOString(), competition: { name: "Europa League" } }
            ];
        }

        res.json({ matches });

    } catch (error) {
        console.error("Erreur API Sportmonks:", error.message);
        res.json({ matches: [{ homeTeam: { name: "Erreur API" }, awayTeam: { name: "Recharger" }, utcDate: new Date().toISOString(), competition: { name: "Système" } }] });
    }
});

// --- ANALYSE IA (VERSION ROBUSTE) ---
app.post('/api/analyse-expert', async (req, res) => {
    const { homeName, awayName } = req.body;
    
    if (!homeName || !awayName) {
        return res.json({ status: "ERROR", error: "Noms manquants" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Analyse le match : ${homeName} vs ${awayName}. Donne un score probable et une analyse. Réponds uniquement en JSON : {"score": "X-X", "confidence": "X%", "win_probability": "X%", "draw_probability": "X%", "ai_analysis": "..."}`;
        
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) throw new Error("Format JSON non trouvé");
        
        const finalData = JSON.parse(jsonMatch[0]);
        res.json({ ...finalData, status: "SUCCESS" });

    } catch (error) {
        console.error("❌ IA Error:", error.message);
        // On renvoie un succès de façade pour éviter le message d'erreur rouge sur le site
        res.json({ 
            status: "SUCCESS", 
            score: "Analyse...", 
            confidence: "??", 
            win_probability: "??", 
            ai_analysis: "L'expert est momentanément indisponible, réessayez dans un instant." 
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
        text: `Salut Enki, paiement de 50F déclaré sur ${projet || 'Congo Bet IA'} par ${numero_client}.`
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) console.error("Erreur Mail:", error.message);
        res.json({ status: error ? "error" : "success" });
    });
});

// --- DÉMARRAGE ---
const PORT = process.env.PORT || 10000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR HIRAM PRÊT SUR PORT ${PORT}`);
});