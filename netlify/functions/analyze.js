exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        console.log("--- Début du traitement de l'image ---");
        
        const { imageBase64 } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("ERREUR: Clé GEMINI_API_KEY absente !");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Clé API non trouvée dans Netlify." })
            };
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

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

        // Endpoint corrigé pour Gemini 1.5 Flash
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: promptText },
                                {
                                    inline_data: {
                                        mime_type: "image/jpeg",
                                        data: base64Data
                                    }
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            console.error("Erreur renvoyée par Gemini :", data.error);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: data.error.message })
            };
        }

        const rawText = data.candidates[0].content.parts[0].text;
        const cleanedJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: cleanedJson
        };
    } catch (error) {
        console.error("Erreur serveur :", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
