import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "ELECTRO-MEN/1.0",
    },
  },
});

// Endpoint for Smart Component Reference AI Lookup
app.post("/api/smart-search", async (req: express.Request, res: express.Response) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: "Recherche invalide" });
    }

    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ 
        error: "Service IA temporairement indisponible. Veuillez réessayer plus tard." 
      });
    }

    const cleanQuery = query.trim().toUpperCase();

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
    
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reference: { type: Type.STRING },
            fullTitle: { type: Type.STRING },
            category: { type: Type.STRING },
            summary: { type: Type.STRING },
            packageType: { type: Type.STRING },
            pinCount: { type: Type.STRING },
            keySpecs: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            typicalApplications: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "reference",
            "fullTitle",
            "category",
            "summary",
            "packageType",
            "pinCount",
            "keySpecs",
            "typicalApplications",
          ],
        },
      },
    });

    const resultText = response.text;
    console.log(`[AI Search] Gemini response received:`, resultText ? 'YES' : 'NO');
    
    if (!resultText) {
      console.error("[AI Search] Empty response from Gemini");
      throw new Error("Pas de réponse générée par Gemini");
    }

    const aiData = JSON.parse(resultText);
    console.log(`[AI Search] Successfully parsed result for: ${aiData.reference}`);
    
    // Ensure proper JSON response with correct content-type
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ success: true, data: aiData }));
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

export default app;
