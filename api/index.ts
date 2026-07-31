import express from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "50mb" }));

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "Electron").trim();

let supabase: SupabaseClient | null = null;
let supabaseInitError: string | null = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } catch (e: any) {
    supabaseInitError = e?.message || "Erreur d'initialisation Supabase inconnue.";
    console.error("[Supabase Init Error]", supabaseInitError);
    supabase = null;
  }
}

function requireAdmin(req: express.Request, res: express.Response): boolean {
  if (req.body?.adminPassword !== ADMIN_PASSWORD) {
    res.status(401).json({ success: false, error: "Mot de passe administrateur incorrect." });
    return false;
  }
  return true;
}

function requireDb(res: express.Response): boolean {
  if (!supabase) {
    res.status(500).json({
      success: false,
      error: supabaseInitError
        ? `Configuration Supabase invalide : ${supabaseInitError}`
        : "Base de données non configurée. Ajoutez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans les variables d'environnement Vercel.",
      data: [],
    });
    return false;
  }
  return true;
}

// Admin login — verifies the password server-side only (never shipped to the client bundle)
app.post("/api/admin-login", (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (req.body?.password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true });
  }
  return res.status(401).json({ success: false });
});

// GET all products (public read)
app.get("/api/products", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  try {
    const { data, error } = await supabase!
      .from("products")
      .select("data")
      .order("created_at", { ascending: false });
    if (error) {
      return res.status(500).json({ success: false, error: error.message, data: [] });
    }
    return res.status(200).json({ success: true, data: (data || []).map((row: any) => row.data) });
  } catch (e: any) {
    console.error("[GET /api/products]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur.", data: [] });
  }
});

// CREATE product (admin only)
app.post("/api/products", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const product = req.body?.product;
  if (!product?.id) {
    return res.status(400).json({ success: false, error: "Produit invalide." });
  }
  try {
    const { error } = await supabase!.from("products").insert({ id: product.id, data: product });
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[POST /api/products]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// UPDATE product (admin only)
app.put("/api/products", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const product = req.body?.product;
  if (!product?.id) {
    return res.status(400).json({ success: false, error: "Produit invalide." });
  }
  try {
    const { error } = await supabase!.from("products").update({ data: product }).eq("id", product.id);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[PUT /api/products]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// DELETE one product, or clear the whole catalogue (admin only)
app.delete("/api/products", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;

  try {
    if (req.body?.clearAll) {
      const { error } = await supabase!.from("products").delete().neq("id", "__never_matches__");
      if (error) return res.status(500).json({ success: false, error: error.message });
      return res.status(200).json({ success: true });
    }

    const id = req.body?.id;
    if (!id) {
      return res.status(400).json({ success: false, error: "ID manquant." });
    }
    const { error } = await supabase!.from("products").delete().eq("id", id);
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[DELETE /api/products]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// Health API
app.get("/api/health", (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    status: "ok",
    app: "ELECTRO MEN Backend",
    database: supabase ? "connected" : "not_configured",
    databaseError: supabaseInitError || undefined,
  });
});

// Global safety net: never let an unexpected crash return an opaque 500 with no info
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Unhandled API Error]", err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({ success: false, error: err?.message || "Erreur serveur inattendue." });
});

export default app;
