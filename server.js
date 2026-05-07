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
// Servir les fichiers du dossier public (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// --- CONFIGURATION HIRAM ARCHITECH WEB ---
// Note : Sur Render, utilise process.env.API_KEY_FOOT etc. pour plus de sécurité
const API_KEY_FOOT = process.env.API_KEY_FOOT || '1280eb84a2b04228b4b3ba402532d615';
const GEMINI_KEY = process.env.GEMINI_KEY || "AIzaSyBJaMLUh4BcfUns_Tr3N9oGleB49wv1Apg"; 
const MON_GMAIL = "kyaraopenL@gmail.com"; 
const MON_PASS_APP = "kyarabusness"; 

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Configuration du transporteur de mail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: MON_GMAIL,
        pass: MON_PASS_APP
    }
});

// --- ROUTES ---

// Route principale : Charge ton fichier index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route "Pulsion" pour empêcher le mode veille
app.get('/api/ping', (req, res) => {
    res.status(200).send("Réveillé");
});

// Route : Notification de paiement
app.post('/api/notif-paiement', (req, res) => {
    const { numero_client, projet } = req.body;
    console.log(`💰 ALERTE PAIEMENT : ${numero_client} pour ${projet}`);

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

// Route : Analyse Expert Gemini
app.post('/api/analyse-expert', async (req, res) => {
    const { homeName, awayName } = req.body;
    console.log(`📡 Analyse en cours : ${homeName} vs ${awayName}`);

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
        } catch (e) {
            console.log("⚠️ API Football non jointe, passage en analyse pure IA.");
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Tu es l'analyste expert de HIRAM Architech Web à Brazzaville (Enki).
            Analyse ce match : ${homeName} vs ${awayName}.
            Historique récent : ${contexteSportif}.
            
            Instructions :
            1. Donne le score probable.
            2. Identifie les 2 joueurs clés.
            3. Calcule les probabilités (Victoire/Nul).

            Réponds EXCLUSIVEMENT sous ce format JSON strict :
            {
                "score": "X - X",
                "confidence": 85,
                "win_probability": "XX%",
                "draw_probability": "XX%",
                "home_form": "VVNDV",
                "away_form": "VNDNV",
                "avg_goals": "2.5",
                "key_players": [
                    {"name": "Joueur 1", "impact": "Raison"},
                    {"name": "Joueur 2", "impact": "Raison"}
                ],
                "ai_analysis": "Verdict technique court."
            }
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiResponse = JSON.parse(cleanJson);

        res.json({ ...aiResponse, status: "SUCCESS" });

    } catch (error) {
        console.error("❌ Erreur Moteur HIRAM:", error.message);
        res.status(500).json({ 
            error: "Erreur d'analyse", 
            ai_analysis: "Le cerveau HIRAM est en maintenance technique." 
    });
    }
});

// --- LANCEMENT DU SERVEUR ---
// Render utilise un port dynamique, process.env.PORT est donc obligatoire
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`----------------------------------------`);
    console.log(`🚀 SERVEUR HIRAM ACTIF (Analyse + Mails)`);
    console.log(`📡 URL : http://localhost:${PORT}`);
    console.log(`📡 Port Render : ${PORT}`);
    console.log(`----------------------------------------`);
});