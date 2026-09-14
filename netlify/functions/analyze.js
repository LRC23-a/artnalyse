const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        console.log("--- Début du traitement de l'image (SDK Officiel) ---");
        
        const { imageBase64 } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("ERREUR: Clé GEMINI_API_KEY absente !");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Clé API non trouvée dans les variables Netlify." })
            };
        }

        // Nettoyage de la chaîne base64
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        // Initialisation du client officiel Google Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const promptText = `
        Analyse cette photo de tableau ou d'œuvre d'art et identifie-la.
        Renvoie EXCLUSIVEMENT un objet JSON valide (sans balises markdown \`\`\`json) avec cette structure exacte :
        {
          "title": "Titre exact de l'œuvre",
          "artist": "Nom complet de l'artiste",
          "year": "Année ou siècle",
          "style": "Style artistique",
          "location": "Musée ou lieu d'exposition",
          "value": "Valeur marchande estimée (ex: 80 Millions € ou Inestimable)",
          "text": "Explication claire et captivante de l'œuvre en 2-3 phrases.",
          "anecdotes": [
            {"title": "Titre accrocheur 1", "text": "Anecdote surprenante ou amusante"},
            {"title": "Titre accrocheur 2", "text": "Autre secret ou détail passionnant"}
          ]
        }`;

        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg"
            }
        };

        const result = await model.generateContent([promptText, imagePart]);
        const responseText = result.response.text();

        console.log("Réponse brute de Gemini :", responseText);

        const cleanedJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: cleanedJson
        };
    } catch (error) {
        console.error("Erreur serveur SDK :", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
