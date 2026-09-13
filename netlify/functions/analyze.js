exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { imageBase64 } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        const promptText = `
        Analyse cette image de tableau d'art et renvoie EXCLUSIVEMENT un objet JSON valide (sans balises markdown \`\`\`json) avec ce format exact :
        {
          "title": "Titre exact de l'œuvre",
          "artist": "Nom de l'artiste",
          "year": "Année ou période",
          "style": "Style/Mouvement artistique",
          "location": "Lieu de conservation/Musée",
          "value": "Estimation financière approximative (ex: 50M € ou Inestimable)",
          "text": "Explication synthétique et accessible du tableau en 2-3 phrases.",
          "anecdotes": [
            {"title": "Titre anecdote 1", "text": "Courte anecdote amusante ou surprenante"},
            {"title": "Titre anecdote 2", "text": "Autre fait passionnant sur l'œuvre"}
          ]
        }`;

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
        const rawText = data.candidates[0].content.parts[0].text;
        const cleanedJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: cleanedJson
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erreur lors de l'analyse visuelle de l'œuvre." })
        };
    }
};
