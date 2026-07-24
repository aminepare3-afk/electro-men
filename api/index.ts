import express from "express";
import Groq from "groq-sdk";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Initialize Groq Client server-side
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// Endpoint for Smart Component Reference AI Lookup
app.post("/api/smart-search", async (req: express.Request, res: express.Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: "Recherche invalide" });
    }

    const cleanQuery = query.trim().toUpperCase();

    // Demo mode if no API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.warn("[AI Search] No API key - Using demo mode");
      const demoData = {
        reference: cleanQuery,
        fullTitle: `Composant ${cleanQuery} (Mode Démo)`,
        category: "Circuits Intégrés (IC)",
        summary: `Ceci est une réponse de démonstration pour ${cleanQuery}. Configurez GROQ_API_KEY pour obtenir des informations réelles.`,
        packageType: "DIP-8",
        pinCount: "8 broches",
        keySpecs: [
          "Tension d'alimentation: 5V",
          "Courant max: 200mA",
          "Fréquence: 1MHz",
          "Température: 0°C à 70°C"
        ],
        typicalApplications: [
          "Timing et temporisation",
          "Générateur d'impulsions",
          "Oscillateur astable",
          "Circuit monostable"
        ]
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify({ success: true, data: demoData }));
    }

    const prompt = `Vous êtes l'expert système du catalogue mondial de composants électroniques pour ELECTRO MEN.
Analyse la référence ou le nom de composant électronique suivant : "${cleanQuery}".
Donne une réponse structurée en JSON contenant :
- reference: La référence exacte normalisée (ex: STM32F103C8T6, NE555P, IRFZ44N, ESP32-WROOM-32D, etc.)
- fullTitle: Le nom complet explicatif en français
- category: La catégorie principale parmi: "Microcontrôleurs & Cartes", "Capteurs & Modules", "Circuits Intégrés (IC)", "Transistors & Diodes", "Passifs (Résistances/Condensateurs)", "Alimentation & Régulateurs", "Relais & Interrupteurs", "Connecteurs & Affichage"
- summary: Description technique concise des fonctions principales
- packageType: Le boîtier/format courant (ex: TO-220, DIP-8, LQFP-48, SMD 0805, Module PCB)
- pinCount: Nombre de broches ou connecteurs (ex: 8 broches, 48 broches, 3 broches)
- keySpecs: Liste de 4 à 6 caractéristiques électriques clés (tension, courant, fréquence, etc.)
- typicalApplications: 3 à 4 exemples concrets d'utilisation
`;

    console.log(`[AI Search] Processing query: ${cleanQuery}`);
    
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en composants électroniques. Tu réponds UNIQUEMENT en JSON valide."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      });

      const resultText = response.choices[0]?.message?.content;
      console.log(`[AI Search] Groq response received:`, resultText ? 'YES' : 'NO');
      
      if (!resultText) {
        console.error("[AI Search] Empty response from Groq");
        throw new Error("Pas de réponse générée par Groq");
      }

      // Extract JSON from response (in case there's extra text)
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Format de réponse invalide");
      }

      const aiData = JSON.parse(jsonMatch[0]);
      console.log(`[AI Search] Successfully parsed result for: ${aiData.reference}`);
      
      // Ensure proper JSON response with correct content-type
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify({ success: true, data: aiData }));
    } catch (error: any) {
      console.error("[AI Search] Groq API error:", error);
      // Fallback to demo data on API error
      const fallbackData = {
        reference: cleanQuery,
        fullTitle: `${cleanQuery} (Erreur API - Mode Démo)`,
        category: "Non déterminé",
        summary: "Impossible de contacter le service IA. Vérifiez la clé API Groq.",
        packageType: "N/A",
        pinCount: "N/A",
        keySpecs: ["Erreur de connexion à l'API"],
        typicalApplications: ["Vérifiez GROQ_API_KEY"]
      };
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(JSON.stringify({ success: true, data: fallbackData }));
    }
  } catch (error: any) {
    console.error("[AI Search] Full error:", error);
    const errorResponse = {
      error: "Impossible d'identifier la référence automatiquement.",
      details: error.message,
    };
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).send(JSON.stringify(errorResponse));
  }
});

// Health API
app.get("/api/health", (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: "ok", app: "ELECTRO MEN Backend" });
});

module.exports = app;
