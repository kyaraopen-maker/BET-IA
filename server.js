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
const API_KEY_FOOT = process.env.API_KEY_FOOT || '1280eb84a2b04228b4b3ba402532d615';
const GEMINI_KEY = process.env.GEMINI_KEY || "AIzaSyBJaMLUh4BcfUns_Tr3N9oGleB49wv1Apg"; 
const MON_GMAIL = "kyaraopenL@gmail.com"; 
const MON_PASS_APP = "kyarabusness"; 

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
    res.status(200).send("Réveillé");
});

// --- ROUTE : MATCHS DE LA SEMAINE (CORRIGÉE) ---
app.get('/api/matches', async (req, res) => {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const dateFrom = today.toISOString().split('T')[0];
        const dateTo = nextWeek.toISOString().split('T')[0];

        // Modification : Utilisation des query params corrects pour axios
        const response = await axios.get(`https://api.football-data.org/v4/matches`, {
            params: {
                dateFrom: dateFrom,
                dateTo: dateTo,
                competitions: 'PL,FL1,CL,BL1,SA,PD,DED,PPL'
            },
            headers: { 'X-Auth-Token': API_KEY_FOOT }
        });
        res.json(response.data);
    } catch (error) {
        console.error("❌ Erreur API Football:", error.message);
        res.status(500).json({ error: "Impossible de charger les matchs" });
    }
});

app.post('/api/notif-paiement', (req, res) => {
    const { numero_client, projet } = req.body;
    const mailOptions = {
        from: `HIRAM ALERT <${MON_GMAIL}>`,
        to: MON_GMAIL,
        subject: `🚨 PAIEMENT DÉCLARÉ : ${numero_client}`,
        text: `Salut Enki, le client avec le numéro ${numero_client} a déclaré son paiement de 50F sur le site ${projet}.\n\nVérifie ton compte MoMo (068424624) avant de lui donner le code d'accès : HIRAM242.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Erreur Mail :", error);
            return res.status(500).json({ status: "error" });
        }
        res.status(200).json({ status: "success" });
    });
});

app.post('/api/analyse-expert', async (req, res) => {
    const { homeName, awayName } = req.body;
    try {
        let contexteSportif = "Données H2H non disponibles.";
        try {
            const footData = await axios.get(`https://api.football-data.org/v4/matches`, {
                headers: { 'X-Auth-Token': API_KEY_FOOT },
                timeout: 4000
            });
            if (footData.data.matches) {
                contexteSportif = footData.data.matches.slice(0, 15).map(m => 
                    `${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name}`
                ).join(', ');
            }
        } catch (e) {}

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Analyse ce match : ${homeName} vs ${awayName}. Historique : ${contexteSportif}. Réponds EXCLUSIVEMENT en JSON sans texte autour avec : score, confidence, win_probability, draw_probability, home_form, away_form, avg_goals, key_players, ai_analysis.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Modification : Extraction robuste pour éviter les erreurs de parsing si Gemini ajoute du texte
        const jsonMatch = responseText.match(/\{.*\}/s);
        const parsedData = JSON.parse(jsonMatch[0]);
        
        res.json({ ...parsedData, status: "SUCCESS" });
    } catch (error) {
        console.error("❌ Erreur Analyse:", error.message);
        res.status(500).json({ error: "Erreur d'analyse" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR HIRAM ACTIF sur le port ${PORT}`);
});