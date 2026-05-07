const express = require('express');
const axios = require('axios');
const cors = require('cors');
const nodemailer = require('nodemailer'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

const app = express();

// --- CONFIGURATION MIDDELWARES ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURATION HIRAM ARCHITECH WEB ---
const MON_GMAIL = "kyaraopenL@gmail.com"; 
const MON_PASS_APP = "kyarabusness"; 
const GEMINI_KEY = process.env.GEMINI_KEY || "AIzaSyBJaMLUh4BcfUns_Tr3N9oGleB49wv1Apg"; 

// TON TOKEN SPORTMONKS (Validé et actif)
const SPORTMONKS_TOKEN = "bWLHVupyKRR8yhXRH7CcBlAsRr4GKqqabATNCBg9oocGZvzedVpZSDo5Ejje";

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: MON_GMAIL,
        pass: MON_PASS_APP
    }
});

// --- ROUTES ---

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/ping', (req, res) => {
    res.status(200).send("HIRAM_ACTIVE");
});

// --- ROUTE : TOUS LES MATCHS DU MOIS (SPORTMONKS) ---
app.get('/api/matches', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const nextMonthDate = new Date();
        nextMonthDate.setDate(nextMonthDate.getDate() + 30);
        const nextMonth = nextMonthDate.toISOString().split('T')[0];

        console.log(`⚽ HIRAM récupère le calendrier du ${today} au ${nextMonth}`);

        // Appel Sportmonks avec filtres pour les noms et les ligues
        const response = await axios.get(`https://api.sportmonks.com/v3/football/fixtures`, {
            params: {
                api_token: SPORTMONKS_TOKEN,
                include: 'participants;league',
                filters: `fixtureLeagues:8,384,82,564;fixtureDates:${today},${nextMonth}` 
            }
        });

        if (!response.data || !response.data.data) {
            return res.json({ matches: [] });
        }

        // Transformation au format de ton frontend
        const matches = response.data.data.map(f => {
            const home = f.participants.find(p => p.meta.location === 'home');
            const away = f.participants.find(p => p.meta.location === 'away');
            
            return {
                homeTeam: { name: home ? home.name : "Équipe Locale" },
                awayTeam: { name: away ? away.name : "Équipe Visiteuse" },
                utcDate: f.starting_at,
                competition: { name: f.league ? f.league.name : "Championnat" }
            };
        });

        console.log(`✅ ${matches.length} matchs réels chargés pour le mois.`);
        res.json({ matches });

    } catch (error) {
        console.error("❌ Erreur Sportmonks:", error.message);
        res.status(500).json({ matches: [], error: "L'IA synchronise les données..." });
    }
});

// --- ROUTE : ANALYSE EXPERT GEMINI ---
app.post('/api/analyse-expert', async (req, res) => {
    const { homeName, awayName } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Analyse foot : ${homeName} vs ${awayName}. Réponds UNIQUEMENT en JSON : score, confidence, win_probability, draw_probability, ai_analysis.`;
        
        const result = await model.generateContent(prompt);
        const jsonMatch = result.response.text().match(/\{.*\}/s);
        
        if (!jsonMatch) throw new Error("IA Format Error");
        res.json({ ...JSON.parse(jsonMatch[0]), status: "SUCCESS" });
    } catch (error) {
        console.error("❌ Erreur Analyse:", error.message);
        res.status(500).json({ error: "Analyse indisponible" });
    }
});

// --- NOTIFICATION PAIEMENT ---
app.post('/api/notif-paiement', (req, res) => {
    const { numero_client, projet } = req.body;
    const mailOptions = {
        from: `HIRAM ALERT <${MON_GMAIL}>`,
        to: MON_GMAIL,
        subject: `🚨 PAIEMENT DÉCLARÉ : ${numero_client}`,
        text: `Salut Enki, paiement de 50F déclaré sur ${projet} par le ${numero_client}. Vérifie MoMo.`
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