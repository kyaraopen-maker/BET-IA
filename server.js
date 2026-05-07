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
    res.status(200).send("HIRAM_ACTIVE");
});

// --- ROUTE : MATCHS DE LA SEMAINE (FIXED) ---
app.get('/api/matches', async (req, res) => {
    try {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        // On utilise le format YYYY-MM-DD exigé par l'API
        const dateFrom = today.toISOString().split('T')[0];
        const dateTo = nextWeek.toISOString().split('T')[0];

        console.log(`📅 HIRAM cherche les matchs réels du ${dateFrom} au ${dateTo}`);

        const response = await axios.get(`https://api.football-data.org/v4/matches`, {
            params: {
                dateFrom: dateFrom,
                dateTo: dateTo,
                // On limite strictement aux ligues du plan GRATUIT pour éviter les erreurs 403
                competitions: 'PL,FL1,BL1,SA,PD,CL' 
            },
            headers: { 'X-Auth-Token': API_KEY_FOOT }
        });

        // Sécurité : Si l'API renvoie une liste vide, on log l'info
        if (!response.data.matches || response.data.matches.length === 0) {
            console.log("⚠️ Aucun match trouvé dans les ligues gratuites aujourd'hui.");
        }

        res.json(response.data);
    } catch (error) {
        // Si l'API Football bloque, on renvoie une structure vide propre au lieu de planter
        console.error("❌ Erreur API Football:", error.response ? error.response.data : error.message);
        res.status(500).json({ matches: [], error: "Service momentanément indisponible" });
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
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // On simplifie le prompt pour plus de rapidité pendant la démo
        const prompt = `Analyse le match : ${homeName} vs ${awayName}. 
        Donne un pronostic de score, une confiance en %, et une brève analyse tactique. 
        Réponds UNIQUEMENT en JSON avec : score, confidence, win_probability, draw_probability, ai_analysis.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        const jsonMatch = responseText.match(/\{.*\}/s);
        if (!jsonMatch) throw new Error("Format IA invalide");
        
        const parsedData = JSON.parse(jsonMatch[0]);
        res.json({ ...parsedData, status: "SUCCESS" });
    } catch (error) {
        console.error("❌ Erreur Analyse:", error.message);
        res.status(500).json({ error: "Analyse indisponible" });
    }
});

// --- DÉMARRAGE (ADAPTÉ RENDER) ---
const PORT = process.env.PORT || 10000; 
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR HIRAM PRÊT SUR PORT ${PORT}`);
});