import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "50mb" }));

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Electron";

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

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
      error: "Base de données non configurée. Ajoutez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans les variables d'environnement Vercel.",
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
  const { data, error } = await supabase!
    .from("products")
    .select("data")
    .order("created_at", { ascending: false });
  if (error) {
    return res.status(500).json({ success: false, error: error.message, data: [] });
  }
  return res.status(200).json({ success: true, data: (data || []).map((row: any) => row.data) });
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
  const { error } = await supabase!.from("products").insert({ id: product.id, data: product });
  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true });
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
  const { error } = await supabase!.from("products").update({ data: product }).eq("id", product.id);
  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
  return res.status(200).json({ success: true });
});

// DELETE one product, or clear the whole catalogue (admin only)
app.delete("/api/products", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;

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
});

// Health API
app.get("/api/health", (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ status: "ok", app: "ELECTRO MEN Backend", database: supabase ? "connected" : "not_configured" });
});

module.exports = app;
