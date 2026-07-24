import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "ELECTRO-MEN/1.0",
    },
  },
});

// Endpoint for Smart Component Reference AI Lookup
app.post("/api/smart-search", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return res.status(400).json({ error: "Recherche invalide" });
    }

    const cleanQuery = query.trim().toUpperCase();

    // Query Gemini 3.6 Flash for electronic component reference identification
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
    if (!resultText) {
      throw new Error("Pas de réponse générée par Gemini");
    }

    const aiData = JSON.parse(resultText);

    return res.json({ success: true, data: aiData });
  } catch (error: any) {
    console.error("Erreur Smart Search Gemini:", error);
    return res.status(500).json({
      error: "Impossible d'identifier la référence automatiquement.",
      details: error.message,
    });
  }
});

// Health API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "ELECTRO MEN Backend" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serveur ELECTRO MEN lancé sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
