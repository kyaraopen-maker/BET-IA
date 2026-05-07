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
const MON_PASS_APP = "kyarabusness"; 
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
        const endOfYear = "2026-12-31"; 

        const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures`, {
            params: {
                api_token: SPORTMONKS_TOKEN,
                include: 'participants;league',
                filters: `fixtureDates:${today},${endOfYear}`,
                per_page: 150 
            }
        });

        let matches = [];

        if (response.data && response.data.data && response.data.data.length > 0) {
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
            matches = [
                { homeTeam: { name: "Liverpool" }, awayTeam: { name: "Atalanta" }, utcDate: new Date().toISOString(), competition: { name: "Europa League (Direct)" } },
                { homeTeam: { name: "Marseille" }, awayTeam: { name: "Benfica" }, utcDate: new Date().toISOString(), competition: { name: "Europa League (Direct)" } },
                { homeTeam: { name: "AS Roma" }, awayTeam: { name: "Leverkusen" }, utcDate: new Date().toISOString(), competition: { name: "Europa League (Direct)" } },
                { homeTeam: { name: "Aston Villa" }, awayTeam: { name: "Olympiakos" }, utcDate: new Date().toISOString(), competition: { name: "Conference League (Direct)" } }
            ];
        }

        res.json({ matches });

    } catch (error) {
        res.json({ matches: [
            { homeTeam: { name: "Real Madrid" }, awayTeam: { name: "Man. City" }, utcDate: new Date().toISOString(), competition: { name: "Champions League (Cache)" } }
        ]});
    }
});

// --- ANALYSE IA CORRIGÉE (VERSION ROBUSTE) ---
app.post('/api/analyse-expert', async (req, res) => {
    const { homeName, awayName } = req.body;
    console.log(`🤖 Analyse demandée pour : ${homeName} vs ${awayName}`);

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Analyse le match de foot suivant : ${homeName} vs ${awayName}. 
        Donne le score probable, la confiance, les probabilités et une analyse courte.
        Réponds UNIQUEMENT avec un JSON pur sous ce format :
        {"score": "2-1", "confidence": "80%", "win_probability": "60%", "draw_probability": "20%", "ai_analysis": "..."}`;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // On nettoie la réponse pour extraire uniquement le JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            console.error("❌ Gemini n'a pas renvoyé de JSON :", responseText);
            throw new Error("Format de réponse invalide");
        }
        
        const finalData = JSON.parse(jsonMatch[0]);
        res.json({ ...finalData, status: "SUCCESS" });

    } catch (error) {
        console.error("❌ Erreur IA :", error.message);
        res.status(500).json({ error: "Analyse indisponible", status: "ERROR" });
    }
});

// --- SYSTÈME D'ALERTE PAIEMENT ---
app.post('/api/notif-paiement', (req, res) => {
    const { numero_client, projet } = req.body;
    const mailOptions = {
        from: `HIRAM ALERT <${MON_GMAIL}>`,
        to: MON_GMAIL,
        subject: `🚨 PAIEMENT DÉCLARÉ : ${numero_client}`,
        text: `Salut Enki, paiement de 50F déclaré sur ${projet} par ${numero_client}.`
    };

    transporter.sendMail(mailOptions, (error) => {
        res.status(error ? 500 : 200).json({ status: error ? "error" : "success" });
    });
});

// --- DÉMARRAGE ---
const PORT = process.env.PORT || 10000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR HIRAM PRÊT SUR PORT ${PORT}`);
});