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

const STORAGE_BUCKET = "product-images";
let bucketEnsured = false;

async function ensureStorageBucket(): Promise<void> {
  if (!supabase || bucketEnsured) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = (buckets || []).some((b) => b.name === STORAGE_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: "5MB",
      });
    }
    bucketEnsured = true;
  } catch (e) {
    console.error("[Storage Bucket Init]", e);
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

// GET all products (public read) — cached at the CDN edge for fast repeat loads
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
    // Edge/browser cache: fast for someone in a hurry, still refreshes quickly after a change
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30, stale-while-revalidate=300");
    return res.status(200).json({ success: true, data: (data || []).map((row: any) => row.data) });
  } catch (e: any) {
    console.error("[GET /api/products]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur.", data: [] });
  }
});

// Upload a compressed image to Supabase Storage (admin only) — returns a lightweight public URL
// instead of storing the full base64 blob inline in the products table (which slows every catalogue load).
app.post("/api/upload-image", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;

  const imageBase64: string | undefined = req.body?.imageBase64;
  if (!imageBase64 || !imageBase64.startsWith("data:image/")) {
    return res.status(400).json({ success: false, error: "Image invalide." });
  }

  try {
    await ensureStorageBucket();

    const matches = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, error: "Format d'image invalide." });
    }
    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const { error: uploadError } = await supabase!.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, { contentType: `image/${matches[1]}`, upsert: false });

    if (uploadError) {
      return res.status(500).json({ success: false, error: uploadError.message });
    }

    const { data: publicUrlData } = supabase!.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return res.status(200).json({ success: true, url: publicUrlData.publicUrl });
  } catch (e: any) {
    console.error("[POST /api/upload-image]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// BULK IMPORT products (admin only) — upsert en une seule requête (CSV/Excel import)
app.post("/api/products/bulk-import", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;

  const products = req.body?.products;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ success: false, error: "Aucun produit à importer." });
  }
  if (products.length > 500) {
    return res.status(400).json({ success: false, error: "Trop de produits en une seule fois (500 maximum)." });
  }

  try {
    const rows = products
      .filter((p: any) => p && p.id && p.name && p.mpn)
      .map((p: any) => ({ id: p.id, data: p }));

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: "Aucun produit valide à importer." });
    }

    const { error } = await supabase!.from("products").upsert(rows, { onConflict: "id" });
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true, imported: rows.length });
  } catch (e: any) {
    console.error("[POST /api/products/bulk-import]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
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
