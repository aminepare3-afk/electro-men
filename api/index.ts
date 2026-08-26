import express from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

const app = express();
app.use(express.json({ limit: "50mb" }));

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "Electron").trim();

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || "BBBREOYEVnxerRHczIgqH_5NEj6bJ2Fr6833VuIwguQLNG1GXoP-6UX6-oDxj1vdbsSAwubFD0KnJ5ZcgvSHnvI").trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || "vGv9vS2kXVSLkM977vMZZDI0IyalsMOtI6-Kl4YIBTI").trim();
webpush.setVapidDetails("mailto:contact@electro-men.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/** Envoie une notification push à tous les admins abonnés. Ignore silencieusement les échecs. */
async function notifyAdminsOfNewOrder(order: any): Promise<void> {
  if (!supabase) return;
  try {
    const { data: subs } = await supabase.from("push_subscriptions").select("id, data");
    if (!subs || subs.length === 0) return;
    const payload = JSON.stringify({
      title: "🛒 Nouvelle commande ELECTRO MEN",
      body: `${order.customerName} — ${Number(order.totalFcfa).toLocaleString("fr-FR")} FCFA (${order.orderNumber})`,
      url: "/?admin=1",
    });
    await Promise.all(
      subs.map(async (row: any) => {
        try {
          await webpush.sendNotification(row.data, payload);
        } catch (err: any) {
          // Abonnement expiré ou invalide (410/404) -> on le supprime pour ne plus réessayer.
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await supabase!.from("push_subscriptions").delete().eq("id", row.id);
          }
        }
      })
    );
  } catch (e) {
    console.error("[Push Notify]", e);
  }
}

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
    const existing = (buckets || []).find((b) => b.name === STORAGE_BUCKET);

    if (!existing) {
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: "5MB",
      });
      if (createError) {
        console.error("[Storage Bucket Create]", createError.message);
        return; // ne marque pas comme "ensured" : on réessaiera au prochain appel
      }
    } else if (!existing.public) {
      // Le bucket existait déjà mais pas en public (ex: créé avant ce correctif) —
      // c'est ce qui rendait les nouvelles photos inaccessibles malgré un upload "réussi".
      const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: "5MB",
      });
      if (updateError) {
        console.error("[Storage Bucket Update]", updateError.message);
        return;
      }
    }

    bucketEnsured = true;
  } catch (e) {
    console.error("[Storage Bucket Init]", e);
  }
}

function requireAdmin(req: express.Request, res: express.Response): boolean {
  const provided = req.body?.adminPassword || req.headers["x-admin-password"];
  if (provided !== ADMIN_PASSWORD) {
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

// CREATE order (public — placed by customers at checkout, no admin password needed)
app.post("/api/orders", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;

  const order = req.body?.order;

  // Honeypot anti-bot: a hidden field real customers never fill. If it's filled, silently
  // pretend success (so the bot doesn't learn to adapt) without ever touching the database.
  if (order?.website) {
    return res.status(200).json({ success: true, id: "noop", orderNumber: "CMD-000000" });
  }

  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    return res.status(400).json({ success: false, error: "Commande invalide (panier vide)." });
  }
  if (!order.customerName || !order.phone) {
    return res.status(400).json({ success: false, error: "Nom et téléphone requis." });
  }

  try {
    // Basic rate limiting: block a phone number placing more than 3 orders in 10 minutes.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase!
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("data->>phone", order.phone)
      .gte("created_at", tenMinutesAgo);
    if ((recentCount || 0) >= 3) {
      return res.status(429).json({
        success: false,
        error: "Trop de commandes envoyées en peu de temps avec ce numéro. Merci de patienter quelques minutes ou de nous contacter directement.",
      });
    }

    const id = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const orderNumber = `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
    const { website, ...cleanOrder } = order;
    const record = {
      ...cleanOrder,
      id,
      orderNumber,
      status: "new",
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase!.from("orders").insert({ id, data: record });
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Best-effort stock decrement — never fails the order if a product was deleted/changed meanwhile.
    for (const item of order.items) {
      try {
        const { data: productRow } = await supabase!
          .from("products")
          .select("data")
          .eq("id", item.productId)
          .single();
        if (productRow?.data) {
          const currentStock = Number(productRow.data.stock) || 0;
          const newStock = Math.max(0, currentStock - Number(item.quantity || 0));
          const updatedProduct = {
            ...productRow.data,
            stock: newStock,
            status: newStock === 0 ? "OUT_OF_STOCK" : productRow.data.status,
          };
          await supabase!.from("products").update({ data: updatedProduct }).eq("id", item.productId);
        }
      } catch (stockErr) {
        console.error("[Stock decrement]", item.productId, stockErr);
      }
    }

    // Notify admins in the background — never block or fail the order on notification errors.
    notifyAdminsOfNewOrder(record).catch((e) => console.error("[Push Notify]", e));

    return res.status(200).json({ success: true, id, orderNumber });
  } catch (e: any) {
    console.error("[POST /api/orders]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// PUBLIC VAPID key — needed by the browser to create a push subscription
app.get("/api/push/vapid-public-key", (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Save a push subscription (admin only — only the admin's browser subscribes to order alerts)
app.post("/api/push/subscribe", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const subscription = req.body?.subscription;
  if (!subscription?.endpoint) {
    return res.status(400).json({ success: false, error: "Abonnement invalide." });
  }
  try {
    const { error } = await supabase!
      .from("push_subscriptions")
      .upsert({ id: subscription.endpoint, data: subscription }, { onConflict: "id" });
    if (error) return res.status(500).json({ success: false, error: error.message });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[POST /api/push/subscribe]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// Remove a push subscription (admin only)
app.post("/api/push/unsubscribe", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const endpoint = req.body?.endpoint;
  if (!endpoint) {
    return res.status(400).json({ success: false, error: "Endpoint requis." });
  }
  try {
    await supabase!.from("push_subscriptions").delete().eq("id", endpoint);
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[POST /api/push/unsubscribe]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// TRACK an order (public — scoped by order number + phone match, so a customer can check their
// own order status without needing admin access, but can't browse other people's orders).
app.get("/api/orders/track", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const orderNumber = String(req.query.orderNumber || "").trim();
  const phone = String(req.query.phone || "").trim();
  if (!orderNumber || !phone) {
    return res.status(400).json({ success: false, error: "Numéro de commande et téléphone requis." });
  }
  try {
    const { data, error } = await supabase!
      .from("orders")
      .select("data")
      .eq("data->>orderNumber", orderNumber)
      .maybeSingle();
    if (error || !data?.data) {
      return res.status(404).json({ success: false, error: "Commande introuvable. Vérifiez le numéro de commande." });
    }
    const normalize = (s: string) => String(s || "").replace(/[^\d]/g, "");
    if (normalize(data.data.phone) !== normalize(phone)) {
      return res.status(403).json({ success: false, error: "Le numéro de téléphone ne correspond pas à cette commande." });
    }
    return res.status(200).json({ success: true, order: data.data });
  } catch (e: any) {
    console.error("[GET /api/orders/track]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// LIST orders (admin only — private customer data)
app.get("/api/orders", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  try {
    const { data, error } = await supabase!
      .from("orders")
      .select("data")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      return res.status(500).json({ success: false, error: error.message, data: [] });
    }
    return res.status(200).json({ success: true, data: (data || []).map((row: any) => row.data) });
  } catch (e: any) {
    console.error("[GET /api/orders]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur.", data: [] });
  }
});

// UPDATE order — status change or contact info added later (admin only)
app.patch("/api/orders", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const { id, updates } = req.body || {};
  if (!id || !updates) {
    return res.status(400).json({ success: false, error: "Requête invalide." });
  }
  try {
    const { data: existing, error: fetchError } = await supabase!.from("orders").select("data").eq("id", id).single();
    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: "Commande introuvable." });
    }
    const merged = { ...existing.data, ...updates };
    const { error } = await supabase!.from("orders").update({ data: merged }).eq("id", id);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[PATCH /api/orders]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// DELETE an order (admin only)
app.delete("/api/orders", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const { id } = req.body || {};
  if (!id) {
    return res.status(400).json({ success: false, error: "ID manquant." });
  }
  try {
    const { error } = await supabase!.from("orders").delete().eq("id", id);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[DELETE /api/orders]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// Adds contact info (email) to an order after checkout — public, but scoped to one order ID the
// customer already received, so it cannot be used to browse or edit other people's orders.
app.post("/api/orders/contact", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const { id, email } = req.body || {};
  if (!id || !email) {
    return res.status(400).json({ success: false, error: "Email requis." });
  }
  try {
    const { data: existing, error: fetchError } = await supabase!.from("orders").select("data").eq("id", id).single();
    if (fetchError || !existing) {
      return res.status(404).json({ success: false, error: "Commande introuvable." });
    }
    const merged = { ...existing.data, email };
    const { error } = await supabase!.from("orders").update({ data: merged }).eq("id", id);
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[POST /api/orders/contact]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// Shareable product preview page — social apps (WhatsApp, Facebook, etc.) read the Open Graph
// tags here when a product link is shared, then real visitors are redirected to the actual site.
app.get("/share/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const siteUrl = `${req.protocol}://${req.get("host")}`;
  const redirectUrl = `${siteUrl}/?produit=${encodeURIComponent(req.params.id)}`;

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  let title = "ELECTRO MEN - Composants Électroniques & Sourcing";
  let description = "Vente de composants électroniques et service de sourcing sur-mesure au Burkina Faso.";
  let image = `${siteUrl}/icon-512.png`;

  if (supabase) {
    try {
      const { data } = await supabase.from("products").select("data").eq("id", req.params.id).single();
      if (data?.data) {
        const p = data.data;
        title = `${p.name} — ${Number(p.priceFcfa).toLocaleString("fr-FR")} FCFA | ELECTRO MEN`;
        description = (p.description || "").slice(0, 160) || description;
        if (p.images?.[0]) image = p.images[0];
        else if (p.thumbnails?.[0]) image = p.thumbnails[0];
      }
    } catch (e) {
      // Repli silencieux sur les valeurs par défaut du site si le produit est introuvable.
    }
  }

  res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="product" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(redirectUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(image)}" />
<meta http-equiv="refresh" content="0; url=${escapeHtml(redirectUrl)}" />
</head>
<body>
<p>Redirection vers <a href="${escapeHtml(redirectUrl)}">${escapeHtml(title)}</a>...</p>
<script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>`);
});

// GET store settings (public read — needed at checkout to compute delivery fees)
app.get("/api/settings", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  try {
    const { data, error } = await supabase!.from("settings").select("data").eq("id", "general").maybeSingle();
    if (error) {
      return res.status(500).json({ success: false, error: error.message, data: {} });
    }
    return res.status(200).json({ success: true, data: data?.data || {} });
  } catch (e: any) {
    console.error("[GET /api/settings]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur.", data: {} });
  }
});

// UPDATE store settings (admin only)
app.put("/api/settings", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const settings = req.body?.settings;
  if (!settings || typeof settings !== "object") {
    return res.status(400).json({ success: false, error: "Paramètres invalides." });
  }
  try {
    const { error } = await supabase!.from("settings").upsert({ id: "general", data: settings }, { onConflict: "id" });
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("[PUT /api/settings]", e);
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

// Health API
app.get("/api/health", async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  let storageStatus: string = "not_configured";
  if (supabase) {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        storageStatus = `error: ${error.message}`;
      } else {
        const bucket = (buckets || []).find((b) => b.name === STORAGE_BUCKET);
        storageStatus = !bucket ? "bucket_missing" : bucket.public ? "public_ok" : "PRIVATE_BUG";
      }
    } catch (e: any) {
      storageStatus = `error: ${e?.message || "inconnue"}`;
    }
  }
  res.json({
    status: "ok",
    app: "ELECTRO MEN Backend",
    database: supabase ? "connected" : "not_configured",
    databaseError: supabaseInitError || undefined,
    storageBucket: storageStatus,
  });
});

// =====================================================================
// FINANCEMENT PARTICIPATIF — Authentification participant + Opérations/Importations
// =====================================================================
// Convention conservée : le frontend ne parle jamais directement à Supabase,
// tout passe par ce backend (clé service_role), comme pour products/orders.

/** Vérifie le token Bearer d'un participant et attache son id à req. */
async function requireParticipant(req: express.Request, res: express.Response): Promise<string | null> {
  if (!supabase) {
    res.status(500).json({ success: false, error: "Base de données non configurée." });
    return null;
  }
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.toString().replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ success: false, error: "Non authentifié." });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ success: false, error: "Session invalide ou expirée." });
    return null;
  }
  return data.user.id;
}

async function logAudit(
  actorId: string | null,
  actorName: string,
  action: "create" | "update" | "delete" | "approve" | "reject" | "login",
  resource: string,
  previousValue?: string,
  newValue?: string
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      actor_name: actorName,
      action,
      resource,
      previous_value: previousValue,
      new_value: newValue,
    });
  } catch (e) {
    console.error("[Audit Log]", e);
  }
}

// ---- Auth participant ----

app.post("/api/investor/signup", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const { email, password, fullName, phone } = req.body || {};
  if (!email || !password || !fullName) {
    return res.status(400).json({ success: false, error: "Email, mot de passe et nom complet sont requis." });
  }
  try {
    const { data, error } = await supabase!.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return res.status(400).json({ success: false, error: error?.message || "Création du compte impossible." });
    }
    const { error: profileError } = await supabase!.from("participant_profiles").insert({
      id: data.user.id,
      full_name: fullName,
      phone: phone || null,
    });
    if (profileError) {
      return res.status(500).json({ success: false, error: profileError.message });
    }
    await logAudit(data.user.id, fullName, "create", "participant_profiles");
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

app.post("/api/investor/login", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email et mot de passe requis." });
  }
  try {
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ success: false, error: "Email ou mot de passe incorrect." });
    }
    return res.status(200).json({
      success: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

app.get("/api/investor/me", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  const { data: profile, error } = await supabase!.from("participant_profiles").select("*").eq("id", userId).single();
  if (error || !profile) {
    return res.status(404).json({ success: false, error: "Profil participant introuvable." });
  }
  return res.status(200).json({ success: true, data: profile });
});

// ---- Opérations (lecture publique, écriture admin) ----

app.get("/api/operations", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const { data, error } = await supabase!
    .from("operations_with_stats")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.post("/api/operations", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const { title, description, targetAmountFcfa, startDate, endDate } = req.body || {};
  if (!title || !targetAmountFcfa) {
    return res.status(400).json({ success: false, error: "Titre et montant cible requis." });
  }
  const reference = `OP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data, error } = await supabase!
    .from("operations")
    .insert({
      reference,
      title,
      description: description || null,
      target_amount_fcfa: targetAmountFcfa,
      start_date: startDate || new Date().toISOString().slice(0, 10),
      end_date: endDate || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "create", `operations/${data.id}`);
  return res.status(200).json({ success: true, data });
});

app.patch("/api/operations/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const { status } = req.body || {};
  const { error } = await supabase!.from("operations").update({ status, updated_at: new Date().toISOString() }).eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "update", `operations/${req.params.id}`, undefined, status);
  return res.status(200).json({ success: true });
});

app.delete("/api/operations/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const { error } = await supabase!.from("operations").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "delete", `operations/${req.params.id}`);
  return res.status(200).json({ success: true });
});

// ---- Commandes d'importation ----

app.get("/api/import-orders", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const { data, error } = await supabase!.from("import_orders").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.post("/api/import-orders", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const b = req.body || {};
  if (!b.supplierName || !b.productDescription || !b.quantity || !b.purchasePriceFcfa) {
    return res.status(400).json({ success: false, error: "Champs obligatoires manquants." });
  }
  const reference = `IMP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data, error } = await supabase!
    .from("import_orders")
    .insert({
      reference,
      operation_id: b.operationId || null,
      supplier_name: b.supplierName,
      product_description: b.productDescription,
      quantity: b.quantity,
      purchase_price_fcfa: b.purchasePriceFcfa,
      transport_fee_fcfa: b.transportFeeFcfa || 0,
      customs_fee_fcfa: b.customsFeeFcfa || 0,
      tax_fee_fcfa: b.taxFeeFcfa || 0,
      other_fees_fcfa: b.otherFeesFcfa || 0,
      order_date: b.orderDate || new Date().toISOString().slice(0, 10),
      expected_reception_date: b.expectedReceptionDate || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "create", `import_orders/${data.id}`);
  return res.status(200).json({ success: true, data });
});

app.patch("/api/import-orders/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const { status } = req.body || {};
  const patch: any = { status };
  if (status === "received") patch.received_date = new Date().toISOString();
  const { error } = await supabase!.from("import_orders").update(patch).eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "update", `import_orders/${req.params.id}`, undefined, status);
  return res.status(200).json({ success: true });
});

app.delete("/api/import-orders/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireAdmin(req, res)) return;
  if (!requireDb(res)) return;
  const { error } = await supabase!.from("import_orders").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "delete", `import_orders/${req.params.id}`);
  return res.status(200).json({ success: true });
});

// Global safety net: never let an unexpected crash return an opaque 500 with no info
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Unhandled API Error]", err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({ success: false, error: err?.message || "Erreur serveur inattendue." });
});

export default app;
