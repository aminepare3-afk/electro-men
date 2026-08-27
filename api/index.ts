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

const DOCUMENTS_BUCKET = "documents";
let documentsBucketEnsured = false;

async function ensureDocumentsBucket(): Promise<void> {
  if (!supabase || documentsBucketEnsured) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const existing = (buckets || []).find((b) => b.name === DOCUMENTS_BUCKET);
    if (!existing) {
      const { error: createError } = await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
        public: false, // privé : accès uniquement via URL signée générée par le backend
        fileSizeLimit: "10MB",
      });
      if (createError) {
        console.error("[Documents Bucket Create]", createError.message);
        return;
      }
    }
    documentsBucketEnsured = true;
  } catch (e) {
    console.error("[Documents Bucket Init]", e);
  }
}

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

/**
 * Accepte DEUX méthodes d'authentification admin, en parallèle, sans rien casser :
 *  1) L'ancien mot de passe partagé (x-admin-password) — toujours valide.
 *  2) Un compte admin individuel réel (Supabase Auth + table admin_roles), via un
 *     token Bearer — nouvelle méthode, à privilégier progressivement.
 */
async function requireAdmin(req: express.Request, res: express.Response): Promise<boolean> {
  const providedPassword = req.body?.adminPassword || req.headers["x-admin-password"];
  if (providedPassword === ADMIN_PASSWORD) {
    return true;
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.toString().replace(/^Bearer\s+/i, "");
  if (token && supabase) {
    const { data, error } = await supabase.auth.getUser(token);
    if (!error && data?.user) {
      const { data: roleRow } = await supabase.from("admin_roles").select("role").eq("id", data.user.id).single();
      if (roleRow) {
        (req as any).adminRole = roleRow.role;
        (req as any).adminUserId = data.user.id;
        return true;
      }
    }
  }

  res.status(401).json({ success: false, error: "Authentification administrateur invalide." });
  return false;
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

// ---- Comptes admin individuels (progressivement, en plus du mot de passe partagé) ----

app.post("/api/admin/accounts/login", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: "Email et mot de passe requis." });
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error || !data.session) return res.status(401).json({ success: false, error: "Email ou mot de passe incorrect." });
  const { data: roleRow } = await supabase!.from("admin_roles").select("role").eq("id", data.user!.id).single();
  if (!roleRow) return res.status(403).json({ success: false, error: "Ce compte n'a pas d'accès administrateur." });
  await logAudit(data.user!.id, email, "login", "admin_roles");
  return res.status(200).json({ success: true, accessToken: data.session.access_token, role: roleRow.role });
});

// Crée le tout premier compte "owner" — protégé par l'ancien mot de passe partagé,
// pour prouver qu'on a déjà un accès admin légitime avant de migrer vers des comptes réels.
// Se bloque tout seul dès qu'un owner existe déjà (bootstrap unique).
app.post("/api/admin/accounts/bootstrap-owner", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const providedPassword = req.body?.adminPassword;
  if (providedPassword !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: "Mot de passe administrateur incorrect." });
  }
  const { count } = await supabase!.from("admin_roles").select("id", { count: "exact", head: true }).eq("role", "owner");
  if (count && count > 0) {
    return res.status(400).json({ success: false, error: "Un compte owner existe déjà." });
  }
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: "Email et mot de passe requis." });
  const { data, error } = await supabase!.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return res.status(400).json({ success: false, error: error?.message || "Création impossible." });
  const { error: roleError } = await supabase!.from("admin_roles").insert({ id: data.user.id, role: "owner" });
  if (roleError) return res.status(500).json({ success: false, error: roleError.message });
  await logAudit(data.user.id, email, "create", "admin_roles/owner");
  return res.status(200).json({ success: true });
});

app.get("/api/admin/accounts", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data: roles, error } = await supabase!.from("admin_roles").select("id, role, created_at");
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  // Récupère l'email de chaque compte via l'API Auth admin (pas stocké en clair côté DB).
  const withEmails = [];
  for (const r of roles || []) {
    const { data: userData } = await supabase!.auth.admin.getUserById(r.id);
    withEmails.push({ id: r.id, role: r.role, created_at: r.created_at, email: userData?.user?.email || "—" });
  }
  return res.status(200).json({ success: true, data: withEmails });
});

app.post("/api/admin/accounts", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { email, password, role } = req.body || {};
  if (!email || !password || !["owner", "admin", "manager", "employee"].includes(role)) {
    return res.status(400).json({ success: false, error: "Email, mot de passe et rôle valide requis." });
  }
  const { data, error } = await supabase!.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) return res.status(400).json({ success: false, error: error?.message || "Création impossible." });
  const { error: roleError } = await supabase!.from("admin_roles").insert({ id: data.user.id, role });
  if (roleError) return res.status(500).json({ success: false, error: roleError.message });
  await logAudit((req as any).adminUserId || null, "Admin", "create", `admin_roles/${data.user.id}`, undefined, role);
  return res.status(200).json({ success: true });
});

app.delete("/api/admin/accounts/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { error } = await supabase!.from("admin_roles").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit((req as any).adminUserId || null, "Admin", "delete", `admin_roles/${req.params.id}`);
  return res.status(200).json({ success: true });
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { status } = req.body || {};
  const { error } = await supabase!.from("operations").update({ status, updated_at: new Date().toISOString() }).eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "update", `operations/${req.params.id}`, undefined, status);
  return res.status(200).json({ success: true });
});

app.delete("/api/operations/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
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
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { error } = await supabase!.from("import_orders").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "delete", `import_orders/${req.params.id}`);
  return res.status(200).json({ success: true });
});

// ---- Espace participant : opérations ouvertes + demandes de participation ----

app.get("/api/investor/operations", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!requireDb(res)) return;
  const { data, error } = await supabase!
    .from("operations_with_stats")
    .select("*")
    .in("status", ["open", "funded", "in_progress"])
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.post("/api/investor/participate", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  const { operationId, amountFcfa, paymentMethod, paymentReference } = req.body || {};
  if (!operationId || !amountFcfa || amountFcfa <= 0 || !paymentMethod) {
    return res.status(400).json({ success: false, error: "Opération, montant et moyen de paiement requis." });
  }
  // Vérifie que l'opération existe et est bien ouverte au financement.
  const { data: op, error: opError } = await supabase!.from("operations").select("id, status").eq("id", operationId).single();
  if (opError || !op) return res.status(404).json({ success: false, error: "Opération introuvable." });
  if (!["open", "funded"].includes(op.status)) {
    return res.status(400).json({ success: false, error: "Cette opération n'accepte plus de nouvelles participations." });
  }
  const { data, error } = await supabase!
    .from("participations")
    .insert({
      operation_id: operationId,
      participant_id: userId,
      amount_fcfa: amountFcfa,
      status: "pending", // reste hors des stats collectées tant que l'admin n'a pas confirmé le paiement réel
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
    })
    .select()
    .single();
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(userId, "Participant", "create", `participations/${data.id}`);
  return res.status(200).json({ success: true, data });
});

app.get("/api/investor/participations", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  const { data, error } = await supabase!
    .from("participations")
    .select("*, operations(reference, title)")
    .eq("participant_id", userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

// ---- Admin : gestion des comptes participants et validation des participations ----

app.get("/api/admin/participants", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data, error } = await supabase!.from("participant_profiles").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.get("/api/admin/participations", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data, error } = await supabase!
    .from("participations")
    .select("*, operations(reference, title), participant_profiles(full_name, phone)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

// Confirme (paiement réellement reçu, vérifié manuellement par l'admin) ou rejette une participation.
app.patch("/api/admin/participations/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { decision } = req.body || {}; // 'confirm' | 'reject'
  if (!["confirm", "reject"].includes(decision)) {
    return res.status(400).json({ success: false, error: "Décision invalide." });
  }
  const { data: participation, error: fetchError } = await supabase!
    .from("participations")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (fetchError || !participation) return res.status(404).json({ success: false, error: "Participation introuvable." });
  if (participation.status !== "pending") {
    return res.status(400).json({ success: false, error: "Cette participation a déjà été traitée." });
  }

  const newStatus = decision === "confirm" ? "active" : "cancelled";
  const { error: updateError } = await supabase!
    .from("participations")
    .update({ status: newStatus, reviewed_at: new Date().toISOString() })
    .eq("id", req.params.id);
  if (updateError) return res.status(500).json({ success: false, error: updateError.message });

  // Écriture au grand livre uniquement quand le paiement est réellement confirmé.
  if (decision === "confirm") {
    const { data: op } = await supabase!.from("operations").select("reference").eq("id", participation.operation_id).single();
    await supabase!.from("ledger_entries").insert({
      participant_id: participation.participant_id,
      operation_id: participation.operation_id,
      type: "participation",
      amount_fcfa: participation.amount_fcfa,
      reference: op?.reference || participation.operation_id,
      note: "Participation confirmée par l'admin après vérification du paiement.",
    });
  }

  await logAudit(null, "Admin", decision === "confirm" ? "approve" : "reject", `participations/${req.params.id}`, "pending", newStatus);
  return res.status(200).json({ success: true });
});

// ---- Espace participant : wallet, transactions, retraits ----

/** Calcule le solde réel d'un participant à partir du grand livre + participations actives. */
async function computeParticipantWallet(participantId: string) {
  const { data: entries, error: ledgerError } = await supabase!
    .from("ledger_entries")
    .select("type, amount_fcfa")
    .eq("participant_id", participantId);
  if (ledgerError) throw new Error(ledgerError.message);

  const { data: activeParticipations, error: partError } = await supabase!
    .from("participations")
    .select("amount_fcfa")
    .eq("participant_id", participantId)
    .eq("status", "active");
  if (partError) throw new Error(partError.message);

  let availableBalanceFcfa = 0;
  let totalProfitFcfa = 0;
  let totalLossFcfa = 0;
  for (const e of entries || []) {
    if (e.type === "profit") totalProfitFcfa += e.amount_fcfa;
    if (e.type === "loss") totalLossFcfa += Math.abs(e.amount_fcfa);
    // Seuls les gains reversés, remboursements, ajustements et retraits affectent le
    // solde disponible — une participation active reste "engagée", pas disponible.
    if (["profit", "refund", "adjustment", "withdrawal"].includes(e.type)) {
      availableBalanceFcfa += e.amount_fcfa;
    }
  }
  const engagedAmountFcfa = (activeParticipations || []).reduce((sum, p) => sum + p.amount_fcfa, 0);

  return { availableBalanceFcfa, engagedAmountFcfa, totalProfitFcfa, totalLossFcfa };
}

app.get("/api/investor/wallet", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  try {
    const wallet = await computeParticipantWallet(userId);
    return res.status(200).json({ success: true, data: wallet });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

app.get("/api/investor/transactions", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  const { data, error } = await supabase!
    .from("ledger_entries")
    .select("*")
    .eq("participant_id", userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.get("/api/investor/withdrawals", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  const { data, error } = await supabase!
    .from("withdrawals")
    .select("*")
    .eq("participant_id", userId)
    .order("requested_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.post("/api/investor/withdrawals", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  const { amountFcfa, method } = req.body || {};
  if (!amountFcfa || amountFcfa <= 0 || !method) {
    return res.status(400).json({ success: false, error: "Montant et moyen de retrait requis." });
  }
  try {
    // Vérification serveur du solde disponible — jamais fait côté client.
    const wallet = await computeParticipantWallet(userId);
    const { data: pendingWithdrawals } = await supabase!
      .from("withdrawals")
      .select("amount_fcfa")
      .eq("participant_id", userId)
      .in("status", ["pending", "processing", "approved"]);
    const alreadyRequested = (pendingWithdrawals || []).reduce((s, w) => s + w.amount_fcfa, 0);
    const remaining = wallet.availableBalanceFcfa - alreadyRequested;
    if (amountFcfa > remaining) {
      return res.status(400).json({
        success: false,
        error: `Solde disponible insuffisant (${remaining.toLocaleString("fr-FR")} FCFA disponible après demandes en cours).`,
      });
    }
    const { data, error } = await supabase!
      .from("withdrawals")
      .insert({ participant_id: userId, amount_fcfa: amountFcfa, method, status: "pending" })
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    await logAudit(userId, "Participant", "create", `withdrawals/${data.id}`);
    return res.status(200).json({ success: true, data });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
});

// ---- Admin : grand livre global + gestion des retraits ----

app.get("/api/admin/ledger", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data, error } = await supabase!
    .from("ledger_entries")
    .select("*, participant_profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.get("/api/admin/withdrawals", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data, error } = await supabase!
    .from("withdrawals")
    .select("*, participant_profiles(full_name)")
    .order("requested_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.patch("/api/admin/withdrawals/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { decision } = req.body || {}; // 'confirm' | 'reject'
  if (!["confirm", "reject"].includes(decision)) {
    return res.status(400).json({ success: false, error: "Décision invalide." });
  }
  const { data: withdrawal, error: fetchError } = await supabase!
    .from("withdrawals")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (fetchError || !withdrawal) return res.status(404).json({ success: false, error: "Retrait introuvable." });
  if (withdrawal.status !== "pending") {
    return res.status(400).json({ success: false, error: "Ce retrait a déjà été traité." });
  }

  const newStatus = decision === "confirm" ? "completed" : "rejected";
  const { error: updateError } = await supabase!
    .from("withdrawals")
    .update({ status: newStatus, processed_at: new Date().toISOString() })
    .eq("id", req.params.id);
  if (updateError) return res.status(500).json({ success: false, error: updateError.message });

  // Écriture au grand livre uniquement une fois le retrait réellement effectué.
  if (decision === "confirm") {
    await supabase!.from("ledger_entries").insert({
      participant_id: withdrawal.participant_id,
      type: "withdrawal",
      amount_fcfa: -Math.abs(withdrawal.amount_fcfa),
      reference: `WD-${withdrawal.id.slice(0, 8).toUpperCase()}`,
      note: `Retrait via ${withdrawal.method}, confirmé par l'admin.`,
    });
  }

  await logAudit(null, "Admin", decision === "confirm" ? "approve" : "reject", `withdrawals/${req.params.id}`, "pending", newStatus);
  return res.status(200).json({ success: true });
});

// ---- Admin : distributions (répartition d'un résultat d'opération) ----

app.get("/api/admin/distributions", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data, error } = await supabase!
    .from("distributions")
    .select("*, operations(reference, title), distribution_lines(id)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  return res.status(200).json({ success: true, data });
});

app.get("/api/admin/distributions/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data: distribution, error } = await supabase!
    .from("distributions")
    .select("*, operations(reference, title)")
    .eq("id", req.params.id)
    .single();
  if (error || !distribution) return res.status(404).json({ success: false, error: "Distribution introuvable." });
  const { data: lines, error: linesError } = await supabase!
    .from("distribution_lines")
    .select("*, participant_profiles(full_name)")
    .eq("distribution_id", req.params.id);
  if (linesError) return res.status(500).json({ success: false, error: linesError.message });
  return res.status(200).json({ success: true, data: { ...distribution, lines } });
});

// Prépare une distribution : calcule la part de chaque participant au prorata de sa
// participation active réelle. Ne touche à rien tant que ce n'est pas confirmé.
app.post("/api/admin/distributions", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { operationId, totalResultFcfa } = req.body || {};
  if (!operationId || totalResultFcfa === undefined || totalResultFcfa === 0) {
    return res.status(400).json({ success: false, error: "Opération et résultat (non nul) requis." });
  }
  const { data: operation, error: opError } = await supabase!.from("operations").select("*").eq("id", operationId).single();
  if (opError || !operation) return res.status(404).json({ success: false, error: "Opération introuvable." });
  if (operation.status !== "closed") {
    return res.status(400).json({ success: false, error: "L'opération doit être clôturée avant de préparer une distribution." });
  }
  const { data: participations, error: partError } = await supabase!
    .from("participations")
    .select("id, participant_id, amount_fcfa")
    .eq("operation_id", operationId)
    .eq("status", "active");
  if (partError) return res.status(500).json({ success: false, error: partError.message });
  if (!participations || participations.length === 0) {
    return res.status(400).json({ success: false, error: "Aucune participation active sur cette opération." });
  }
  const totalCollected = participations.reduce((s, p) => s + p.amount_fcfa, 0);

  const { data: distribution, error: distError } = await supabase!
    .from("distributions")
    .insert({ operation_id: operationId, total_amount_fcfa: totalResultFcfa, status: "draft" })
    .select()
    .single();
  if (distError) return res.status(500).json({ success: false, error: distError.message });

  const lines = participations.map((p) => ({
    distribution_id: distribution.id,
    participant_id: p.participant_id,
    amount_fcfa: Math.round((totalResultFcfa * p.amount_fcfa) / totalCollected),
  }));
  const { error: linesError } = await supabase!.from("distribution_lines").insert(lines);
  if (linesError) return res.status(500).json({ success: false, error: linesError.message });

  await logAudit(null, "Admin", "create", `distributions/${distribution.id}`);
  return res.status(200).json({ success: true, data: distribution });
});

app.patch("/api/admin/distributions/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { action } = req.body || {}; // 'validate' | 'confirm' | 'cancel'
  if (!["validate", "confirm", "cancel"].includes(action)) {
    return res.status(400).json({ success: false, error: "Action invalide." });
  }
  const { data: distribution, error: fetchError } = await supabase!
    .from("distributions")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (fetchError || !distribution) return res.status(404).json({ success: false, error: "Distribution introuvable." });

  if (action === "validate") {
    if (distribution.status !== "draft") return res.status(400).json({ success: false, error: "Déjà traitée." });
    await supabase!.from("distributions").update({ status: "validated" }).eq("id", req.params.id);
    await logAudit(null, "Admin", "update", `distributions/${req.params.id}`, "draft", "validated");
    return res.status(200).json({ success: true });
  }

  if (action === "cancel") {
    if (distribution.status === "confirmed") return res.status(400).json({ success: false, error: "Une distribution confirmée ne peut plus être annulée." });
    await supabase!.from("distribution_lines").delete().eq("distribution_id", req.params.id);
    await supabase!.from("distributions").delete().eq("id", req.params.id);
    await logAudit(null, "Admin", "delete", `distributions/${req.params.id}`);
    return res.status(200).json({ success: true });
  }

  // action === 'confirm' — opération irréversible : écrit le grand livre pour de vrai.
  if (distribution.status !== "validated") {
    return res.status(400).json({ success: false, error: "La distribution doit être validée avant confirmation." });
  }
  const { data: lines, error: linesError } = await supabase!
    .from("distribution_lines")
    .select("*")
    .eq("distribution_id", req.params.id);
  if (linesError) return res.status(500).json({ success: false, error: linesError.message });

  const { data: operation } = await supabase!.from("operations").select("reference").eq("id", distribution.operation_id).single();

  for (const line of lines || []) {
    await supabase!.from("ledger_entries").insert({
      participant_id: line.participant_id,
      operation_id: distribution.operation_id,
      type: line.amount_fcfa >= 0 ? "profit" : "loss",
      amount_fcfa: line.amount_fcfa,
      reference: operation?.reference || distribution.operation_id,
      note: "Distribution confirmée par l'admin.",
    });
    await supabase!
      .from("participations")
      .update({ status: "closed", result_fcfa: line.amount_fcfa })
      .eq("participant_id", line.participant_id)
      .eq("operation_id", distribution.operation_id);
  }

  await supabase!.from("distributions").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", req.params.id);
  await logAudit(null, "Admin", "approve", `distributions/${req.params.id}`, "validated", "confirmed");
  return res.status(200).json({ success: true });
});

// ---- Documents (factures, justificatifs) — stockage privé, URLs signées à la demande ----

app.post("/api/admin/documents", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { label, fileBase64, fileName, operationId, importOrderId, participantId } = req.body || {};
  if (!label || !fileBase64 || !fileName) {
    return res.status(400).json({ success: false, error: "Libellé et fichier requis." });
  }
  try {
    await ensureDocumentsBucket();
    const matches = fileBase64.match(/^data:([\w/+-]+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ success: false, error: "Fichier invalide." });
    const buffer = Buffer.from(matches[2], "base64");
    const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${fileName}`;

    const { error: uploadError } = await supabase!.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, buffer, { contentType: matches[1], upsert: false });
    if (uploadError) return res.status(500).json({ success: false, error: uploadError.message });

    const { data, error } = await supabase!
      .from("documents")
      .insert({
        label,
        storage_path: storagePath,
        operation_id: operationId || null,
        import_order_id: importOrderId || null,
        participant_id: participantId || null,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, error: error.message });
    await logAudit(null, "Admin", "create", `documents/${data.id}`);
    return res.status(200).json({ success: true, data });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "Erreur serveur." });
  }
});

async function signDocumentUrls(rows: any[]): Promise<any[]> {
  const withUrls = [];
  for (const row of rows) {
    const { data } = await supabase!.storage.from(DOCUMENTS_BUCKET).createSignedUrl(row.storage_path, 3600);
    withUrls.push({ ...row, signed_url: data?.signedUrl || null });
  }
  return withUrls;
}

app.get("/api/admin/documents", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data, error } = await supabase!
    .from("documents")
    .select("*, operations(reference, title), participant_profiles(full_name)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  const withUrls = await signDocumentUrls(data || []);
  return res.status(200).json({ success: true, data: withUrls });
});

app.delete("/api/admin/documents/:id", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  if (!(await requireAdmin(req, res))) return;
  if (!requireDb(res)) return;
  const { data: doc } = await supabase!.from("documents").select("storage_path").eq("id", req.params.id).single();
  if (doc) await supabase!.storage.from(DOCUMENTS_BUCKET).remove([doc.storage_path]);
  const { error } = await supabase!.from("documents").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, error: error.message });
  await logAudit(null, "Admin", "delete", `documents/${req.params.id}`);
  return res.status(200).json({ success: true });
});

app.get("/api/investor/documents", async (req: express.Request, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  const userId = await requireParticipant(req, res);
  if (!userId) return;
  const { data, error } = await supabase!
    .from("documents")
    .select("*, operations(reference, title)")
    .eq("participant_id", userId)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, error: error.message, data: [] });
  const withUrls = await signDocumentUrls(data || []);
  return res.status(200).json({ success: true, data: withUrls });
});

// Global safety net: never let an unexpected crash return an opaque 500 with no info
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Unhandled API Error]", err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({ success: false, error: err?.message || "Erreur serveur inattendue." });
});

export default app;
