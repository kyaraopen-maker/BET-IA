const express = require('express');
const axios = require('axios');
const cors = require('cors');
const nodemailer = require('nodemailer'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION HIRAM ARCHITECH WEB ---
const API_KEY_FOOT = '1280eb84a2b04228b4b3ba402532d615';
const GEMINI_KEY = "AIzaSyBJaMLUh4BcfUns_Tr3N9oGleB49wv1Apg"; 
const MON_GMAIL = "kyaraopenL@gmail.com"; 
const MON_PASS_APP = "kyarabusness"; // Utilise bien un code d'application Google ici

const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Configuration du transporteur de mail (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: MON_GMAIL,
        pass: MON_PASS_APP
    }
});

app.get('/', (req, res) => {
    res.send("<h1>Cerveau HIRAM Sportif v4.0</h1><p>Statut : Connecté & Prêt pour les paiements (Sans stockage).</p>");
});

// --- ROUTE : NOTIFICATION DE PAIEMENT (WIZA STYLE) ---
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

// --- ROUTE : ANALYSE EXPERT GEMINI ---
// Route "Pulsion" pour empêcher le mode veille
app.get('/api/ping', (req, res) => {
    res.status(200).send("Réveillé");
});
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
        
        // Nettoyage du JSON au cas où Gemini ajoute des balises ```
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`----------------------------------------`);
    console.log(`🚀 SERVEUR HIRAM ACTIF (Analyse + Mails)`);
    console.log(`📡 Port : ${PORT}`);
    console.log(`----------------------------------------`);
});