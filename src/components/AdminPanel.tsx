import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, Plus, Trash2, Edit3, Save, X, Upload, AlertCircle, CheckCircle2, ShieldAlert, Cpu, Download, FileSpreadsheet, FileUp, ClipboardList, MapPin, Phone, Send, RefreshCw, Settings, Truck } from 'lucide-react';
import { Product, StockStatus, CustomSourcingRequest, Order, OrderStatus } from '../types';
import { CATEGORIES } from '../data/initialData';
import { getMainImage } from '../utils/product';
import { compressImageWithThumbnail } from '../utils/imageCompression';
import { exportProductsToCsv, downloadCsvTemplate, parseProductsCsv, ParsedImportResult, exportOrdersToCsv } from '../utils/csvImportExport';

interface AdminPanelProps {
  products: Product[];
  onAddProduct: (product: Product, adminPassword: string) => void;
  onUpdateProduct: (product: Product, adminPassword: string) => void;
  onDeleteProduct: (productId: string, adminPassword: string) => void;
  onClearAllProducts: (adminPassword: string) => void;
  onBulkImportProducts: (
    products: Product[],
    adminPassword: string
  ) => Promise<{ success: boolean; error?: string; imported?: number }>;
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onClearAllProducts,
  onBulkImportProducts,
  onClose,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'add' | 'orders' | 'settings'>('products');

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const knownOrderIdsRef = useRef<Set<string> | null>(null);

  // Plays a short two-tone beep using the Web Audio API — no external sound file needed.
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.25);
      });
    } catch (e) {
      // Silencieux si l'audio n'est pas disponible (ex: onglet en arrière-plan sur certains navigateurs).
    }
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await fetch('/api/orders', {
        headers: { 'x-admin-password': passwordInput },
      });
      const json = await res.json();
      if (json.success) {
        const freshOrders: Order[] = json.data;

        // Detect brand-new orders since the last poll to trigger a notification.
        if (knownOrderIdsRef.current) {
          const newOnes = freshOrders.filter((o) => !knownOrderIdsRef.current!.has(o.id));
          if (newOnes.length > 0) {
            setNewOrdersCount((prev) => prev + newOnes.length);
            playNotificationSound();
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('🛒 Nouvelle commande ELECTRO MEN', {
                body: `${newOnes[0].customerName} — ${newOnes[0].totalFcfa.toLocaleString('fr-FR')} FCFA`,
              });
            }
          }
        }
        knownOrderIdsRef.current = new Set(freshOrders.map((o) => o.id));

        setOrders(freshOrders);
      } else {
        setOrdersError(json.error || 'Erreur lors du chargement des commandes.');
      }
    } catch (e) {
      setOrdersError('Impossible de contacter le serveur.');
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  };

  // Settings state (delivery fees by city)
  const DELIVERY_CITIES = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Autre Ville (Expédition)'];
  const [deliveryFeesDraft, setDeliveryFeesDraft] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const fetchSettingsForAdmin = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        const fees = json.data?.deliveryFees || {};
        const draft: Record<string, string> = {};
        DELIVERY_CITIES.forEach((c) => {
          draft[c] = typeof fees[c] === 'number' ? String(fees[c]) : '';
        });
        setDeliveryFeesDraft(draft);
      }
    } catch (e) {
      // silencieux, les champs resteront vides
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'settings') {
      fetchSettingsForAdmin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMsg(null);
    const deliveryFees: Record<string, number> = {};
    Object.entries(deliveryFeesDraft).forEach(([city, val]) => {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0) deliveryFees[city] = num;
    });
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { deliveryFees }, adminPassword: passwordInput }),
      });
      const json = await res.json();
      setSettingsMsg(json.success ? 'Paramètres enregistrés ✓' : json.error || 'Erreur lors de l\'enregistrement.');
    } catch (e) {
      setSettingsMsg('Impossible de contacter le serveur.');
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'orders') {
      fetchOrders();
      setNewOrdersCount(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab]);

  // Poll for new orders every 25s while logged in, and ask for notification permission once.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 25000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    try {
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, updates: { status }, adminPassword: passwordInput }),
      });
    } catch (e) {
      // L'affichage local reste à jour ; un rafraîchissement corrigera si la requête a échoué.
    }
  };

  // Import CSV/Excel state
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ParsedImportResult | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResultMsg, setImportResultMsg] = useState<string | null>(null);

  // New Product Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMpn, setNewMpn] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[1]);
  const [newPrice, setNewPrice] = useState<number>(2500);
  const [newDiscountPercent, setNewDiscountPercent] = useState<string>('');
  const [newStock, setNewStock] = useState<number>(20);
  const [newStatus, setNewStatus] = useState<StockStatus>('IN_STOCK');
  const [newDescription, setNewDescription] = useState('');
  const [newDatasheet, setNewDatasheet] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newThumbnails, setNewThumbnails] = useState<string[]>([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newIsPopular, setNewIsPopular] = useState(false);
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [specsList, setSpecsList] = useState<Record<string, string>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const MAX_IMAGES = 6;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAuthenticated(true);
        setPasswordError(false);
      } else {
        setPasswordError(true);
      }
    } catch (err) {
      setPasswordError(true);
    } finally {
      setLoginLoading(false);
    }
  };

  const [compressingImages, setCompressingImages] = useState(false);

  const uploadCompressedImage = async (dataUrl: string): Promise<string> => {
    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: dataUrl, adminPassword: passwordInput }),
      });
      const json = await res.json();
      if (json.success && json.url) {
        return json.url as string;
      }
    } catch (err) {
      console.error('Erreur upload image vers le stockage:', err);
    }
    // Repli : si l'upload échoue, on garde l'image compressée en local (moins optimal mais ne bloque pas l'admin)
    return dataUrl;
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = MAX_IMAGES - newImages.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    e.target.value = '';

    setCompressingImages(true);
    try {
      const pairs = await Promise.all(filesToAdd.map((file) => compressImageWithThumbnail(file)));
      const uploaded = await Promise.all(
        pairs.map(async ({ full, thumbnail }) => {
          const [fullUrl, thumbUrl] = await Promise.all([
            uploadCompressedImage(full),
            uploadCompressedImage(thumbnail),
          ]);
          return { fullUrl, thumbUrl };
        })
      );
      setNewImages((prev) => [...prev, ...uploaded.map((u) => u.fullUrl)].slice(0, MAX_IMAGES));
      setNewThumbnails((prev) => [...prev, ...uploaded.map((u) => u.thumbUrl)].slice(0, MAX_IMAGES));
    } catch (err) {
      console.error('Erreur compression image:', err);
    } finally {
      setCompressingImages(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = newImageUrlInput.trim();
    if (!url || newImages.length >= MAX_IMAGES) return;
    setNewImages((prev) => [...prev, url]);
    setNewThumbnails((prev) => [...prev, url]); // pas de recompression possible pour une URL externe
    setNewImageUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewThumbnails((prev) => prev.filter((_, i) => i !== index));
  };

  // ---- Import / Export CSV ----
  const handleExportCsv = () => {
    exportProductsToCsv(products);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportResultMsg(null);
    try {
      const text = await file.text();
      const result = parseProductsCsv(text);
      setImportPreview(result);
    } catch (err) {
      setImportResultMsg("Impossible de lire ce fichier. Vérifiez qu'il s'agit bien d'un fichier CSV (export Excel au format CSV UTF-8).");
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.validProducts.length === 0) return;
    setImportLoading(true);
    try {
      const result = await onBulkImportProducts(importPreview.validProducts, passwordInput);
      if (result.success) {
        setImportResultMsg(`${result.imported ?? importPreview.validProducts.length} produit(s) importé(s) avec succès !`);
        setImportPreview(null);
      } else {
        setImportResultMsg(result.error || "Erreur lors de l'import.");
      }
    } finally {
      setImportLoading(false);
    }
  };

  const handleAddSpec = () => {
    if (!specKey.trim() || !specValue.trim()) return;
    setSpecsList((prev) => ({ ...prev, [specKey.trim()]: specValue.trim() }));
    setSpecKey('');
    setSpecValue('');
  };

  const handleRemoveSpec = (key: string) => {
    setSpecsList((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMpn.trim()) return;

    const parsedDiscount = parseInt(newDiscountPercent, 10);

    const productObj: Product = {
      id: editingProductId || `prod-${Date.now()}`,
      name: newTitle.trim(),
      mpn: newMpn.trim().toUpperCase(),
      category: newCategory,
      priceFcfa: newPrice,
      discountPercent: !isNaN(parsedDiscount) && parsedDiscount > 0 ? Math.min(parsedDiscount, 95) : undefined,
      stock: newStock,
      status: newStatus,
      description: newDescription,
      specifications: specsList,
      datasheetUrl: newDatasheet.trim() || undefined,
      images:
        newImages.length > 0
          ? newImages
          : ['https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80'],
      thumbnails: newThumbnails.length === newImages.length ? newThumbnails : undefined,
      videoUrl: newVideoUrl.trim() || undefined,
      isPopular: newIsPopular,
      createdAt: new Date().toISOString(),
    };

    if (editingProductId) {
      onUpdateProduct(productObj, passwordInput);
    } else {
      onAddProduct(productObj, passwordInput);
    }

    // Reset Form
    resetForm();
    setActiveTab('products');
  };

  const handleStartEdit = (product: Product) => {
    setEditingProductId(product.id);
    setNewTitle(product.name);
    setNewMpn(product.mpn);
    setNewCategory(product.category);
    setNewPrice(product.priceFcfa);
    setNewDiscountPercent(product.discountPercent ? String(product.discountPercent) : '');
    setNewStock(product.stock);
    setNewStatus(product.status);
    setNewDescription(product.description);
    setNewDatasheet(product.datasheetUrl || '');
    setNewImages(
      product.images && product.images.length > 0
        ? product.images
        : (product as any).imageUrl
        ? [(product as any).imageUrl]
        : []
    );
    setNewThumbnails(product.thumbnails && product.thumbnails.length > 0 ? product.thumbnails : product.images || []);
    setNewVideoUrl(product.videoUrl || '');
    setNewIsPopular(!!product.isPopular);
    setSpecsList(product.specifications || {});
    setActiveTab('add');
  };

  const resetForm = () => {
    setEditingProductId(null);
    setNewTitle('');
    setNewMpn('');
    setNewCategory(CATEGORIES[1]);
    setNewPrice(2500);
    setNewDiscountPercent('');
    setNewStock(20);
    setNewStatus('IN_STOCK');
    setNewDescription('');
    setNewDatasheet('');
    setNewImages([]);
    setNewThumbnails([]);
    setNewImageUrlInput('');
    setNewVideoUrl('');
    setNewIsPopular(false);
    setSpecsList({});
  };

  // Render Password Gate if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="relative max-w-md mx-auto my-12 p-8 rounded-2xl bg-white border border-slate-200 shadow-xl text-slate-900 font-sans text-center space-y-6">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/30">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold font-mono uppercase tracking-wider text-slate-900">
            Espace Administration ELECTRO MEN
          </h2>
          <p className="text-slate-600 text-xs mt-1">
            Veuillez entrer le mot de passe gestionnaire pour administrer les stocks et les photos.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input
              type="password"
              required
              placeholder="Mot de passe admin"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {passwordError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Mot de passe incorrect !</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm font-mono uppercase shadow-md transition-all disabled:opacity-60"
          >
            {loginLoading ? 'Vérification...' : 'Se Connecter à la Gestion'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto my-8 p-6 rounded-2xl bg-white border border-slate-200 text-slate-900 font-sans space-y-6 shadow-xl">
      
      {/* Admin Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600">
            <Unlock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono text-emerald-700 font-bold block uppercase">
              GESTIONNAIRE ACCÈS SÉCURISÉ
            </span>
            <h2 className="text-xl font-bold font-mono text-slate-900 uppercase">
              Panneau d'Administration ELECTRO MEN
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              if (window.confirm('Voulez-vous VRAIMENT supprimer TOUS les produits du catalogue ?')) {
                onClearAllProducts(passwordInput);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-mono flex items-center gap-1.5 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Vider Tous les Produits ({products.length})</span>
          </button>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-medium border border-slate-300"
          >
            Déconnexion
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-300 transition-colors"
              title="Fermer l'administration"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            resetForm();
            setActiveTab('products');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Catalogue Produits ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'add'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{editingProductId ? 'Modifier Composant' : 'Ajouter Nouveau Composant'}</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`relative px-4 py-2 rounded-xl text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Commandes {orders.length > 0 ? `(${orders.length})` : ''}</span>
          {newOrdersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
              {newOrdersCount > 9 ? '9+' : newOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres</span>
        </button>
      </div>

      {/* Tab Content 1: Products Inventory Table */}
      {activeTab === 'products' && (
        <div className="space-y-4 font-sans">
          {/* Import / Export CSV Toolbar */}
          <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 flex flex-wrap items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-700 shrink-0" />
            <span className="text-xs font-mono text-cyan-900 font-bold mr-auto">Import / Export CSV (Excel)</span>

            <button
              onClick={handleExportCsv}
              disabled={products.length === 0}
              className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter le Catalogue</span>
            </button>

            <button
              onClick={downloadCsvTemplate}
              className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Télécharger un Modèle</span>
            </button>

            <label className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer">
              <FileUp className="w-3.5 h-3.5" />
              <span>Importer un Fichier CSV</span>
              <input ref={importFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />
            </label>
          </div>

          {importResultMsg && (
            <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              importResultMsg.includes('succès') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {importResultMsg.includes('succès') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{importResultMsg}</span>
              <button onClick={() => setImportResultMsg(null)} className="ml-auto text-current opacity-60 hover:opacity-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Import Preview / Validation Panel */}
          {importPreview && (
            <div className="p-4 rounded-xl bg-white border border-amber-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold font-mono text-slate-900">Aperçu de l'import</h4>
                <button onClick={() => setImportPreview(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  {importPreview.validProducts.length} produit(s) valide(s)
                </span>
                {importPreview.createdCount > 0 && (
                  <span className="px-2.5 py-1 rounded bg-cyan-50 border border-cyan-200 text-cyan-800">
                    {importPreview.createdCount} nouveau(x)
                  </span>
                )}
                {importPreview.updatedCount > 0 && (
                  <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800">
                    {importPreview.updatedCount} mise(s) à jour
                  </span>
                )}
                {importPreview.errors.length > 0 && (
                  <span className="px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-800">
                    {importPreview.errors.length} ligne(s) ignorée(s)
                  </span>
                )}
              </div>

              {importPreview.errors.length > 0 && (
                <div className="max-h-24 overflow-y-auto p-2 rounded-lg bg-red-50/60 border border-red-100 text-[11px] font-mono text-red-700 space-y-0.5">
                  {importPreview.errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}

              {importPreview.validProducts.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                  {importPreview.validProducts.slice(0, 20).map((p, i) => (
                    <div key={i} className="px-3 py-1.5 text-xs font-sans flex items-center justify-between gap-2">
                      <span className="truncate">
                        <span className="font-mono text-amber-700 font-bold">{p.mpn}</span> — {p.name}
                      </span>
                      <span className="font-mono text-slate-600 shrink-0">{p.priceFcfa.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  ))}
                  {importPreview.validProducts.length > 20 && (
                    <div className="px-3 py-1.5 text-[11px] font-mono text-slate-500 italic">
                      + {importPreview.validProducts.length - 20} autre(s)...
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setImportPreview(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={importPreview.validProducts.length === 0 || importLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {importLoading ? 'Import en cours...' : `Confirmer l'import (${importPreview.validProducts.length})`}
                </button>
              </div>
            </div>
          )}

          {/* Low Stock Alert Banner */}
          {(() => {
            const LOW_STOCK_THRESHOLD = 5;
            const lowStockProducts = products.filter(
              (p) => p.status !== 'OUT_OF_STOCK' && p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD
            );
            const outOfStockCount = products.filter((p) => p.status === 'OUT_OF_STOCK' || p.stock === 0).length;
            if (lowStockProducts.length === 0 && outOfStockCount === 0) return null;
            return (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-mono font-bold uppercase">
                  <AlertCircle className="w-4 h-4" />
                  <span>Alerte Stock</span>
                </div>
                {lowStockProducts.length > 0 && (
                  <p className="text-xs text-amber-800">
                    <strong>{lowStockProducts.length}</strong> produit(s) en stock faible (≤{LOW_STOCK_THRESHOLD}) :{' '}
                    {lowStockProducts.map((p) => `${p.name} (${p.stock})`).join(', ')}
                  </p>
                )}
                {outOfStockCount > 0 && (
                  <p className="text-xs text-red-700">
                    <strong>{outOfStockCount}</strong> produit(s) épuisé(s).
                  </p>
                )}
              </div>
            );
          })()}

          {products.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 font-mono space-y-3">
              <Cpu className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Le catalogue est actuellement vide.</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Vous pouvez ajouter vos propres composants électroniques avec photos ci-dessous.
              </p>
              <button
                onClick={() => setActiveTab('add')}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase inline-flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Ajouter mon 1er composant
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-slate-100 font-mono uppercase text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Photo</th>
                    <th className="p-3">Référence MPN</th>
                    <th className="p-3">Nom du Composant</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Prix FCFA</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="p-3">
                        <div className="relative w-10 h-10">
                          <img
                            src={getMainImage(p)}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-slate-200"
                          />
                          {p.images && p.images.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 px-1 rounded bg-slate-900 text-white text-[9px] font-mono">
                              {p.images.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-700">{p.mpn}</td>
                      <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">
                        {p.isPopular && <span className="mr-1" title="Produit Vedette">⭐</span>}
                        {p.name}
                      </td>
                      <td className="p-3 text-slate-600 font-mono">{p.category}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {p.priceFcfa.toLocaleString('fr-FR')} FCFA
                        {p.discountPercent ? (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold align-middle">
                            -{p.discountPercent}%
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 font-mono text-slate-700">{p.stock}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleStartEdit(p)}
                          className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-amber-700 border border-slate-200"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteProduct(p.id, passwordInput)}
                          className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4 font-sans">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold uppercase text-slate-800">Commandes Reçues</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportOrdersToCsv(orders)}
                disabled={orders.length === 0}
                className="px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter CSV</span>
              </button>
              <button
                onClick={() => fetchOrders()}
                disabled={ordersLoading}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono font-bold flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>

          {ordersError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{ordersError}</span>
            </div>
          )}

          {ordersLoading && orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-mono text-xs">Chargement des commandes...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 font-mono space-y-2">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">Aucune commande reçue pour l'instant.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                          {order.orderNumber}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {new Date(order.createdAt).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1">{order.customerName}</p>
                    </div>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                        order.status === 'new'
                          ? 'bg-cyan-50 border-cyan-300 text-cyan-800'
                          : order.status === 'confirmed'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : order.status === 'delivered'
                          ? 'bg-slate-100 border-slate-300 text-slate-600'
                          : order.status === 'cancelled'
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}
                    >
                      <option value="new">🆕 Nouvelle</option>
                      <option value="contacted">📞 Contacté</option>
                      <option value="confirmed">✅ Confirmée</option>
                      <option value="delivered">📦 Livrée</option>
                      <option value="cancelled">❌ Annulée</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <Phone className="w-3.5 h-3.5 text-slate-400 inline mr-1.5" />
                      {order.phone}
                      {order.email && <span className="block text-slate-500 mt-0.5">{order.email}</span>}
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 inline mr-1.5" />
                      {order.city}{order.neighborhood ? ` — ${order.neighborhood}` : ''}
                      {(order.latitude && order.longitude) ? (
                        <a
                          href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-cyan-700 hover:underline mt-0.5"
                        >
                          📍 Voir position GPS exacte
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {order.paymentMethod && order.paymentMethod !== 'cash' && (
                    <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-mono">
                      💳 {order.paymentMethod === 'orange_money' ? 'Orange Money' : 'Moov Money'}
                      {order.paymentReference ? ` — Réf: ${order.paymentReference}` : ' (référence non fournie)'}
                    </p>
                  )}

                  {order.notes && (
                    <p className="text-xs text-slate-600 italic bg-amber-50/60 border border-amber-100 rounded-lg p-2">
                      "{order.notes}"
                    </p>
                  )}

                  <div className="border-t border-slate-100 pt-2 space-y-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] font-mono text-slate-700">
                        <span className="truncate pr-2">[{item.mpn}] {item.name} x{item.quantity}</span>
                        <span className="shrink-0">{(item.unitPrice * item.quantity).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm font-black text-amber-800 font-mono">
                      {order.totalFcfa.toLocaleString('fr-FR')} FCFA
                    </span>
                    <a
                      href={`https://wa.me/${order.phone.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Contacter le Client</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4 font-sans max-w-2xl">
          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 flex items-start gap-2.5">
            <Truck className="w-5 h-5 text-cyan-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-mono font-bold text-cyan-900">Frais de Livraison par Ville</h3>
              <p className="text-xs text-cyan-800 mt-1">
                Laisse un champ vide pour une ville si tu préfères communiquer le tarif toi-même au client
                après la commande, plutôt que de l'afficher automatiquement sur le site.
              </p>
            </div>
          </div>

          {settingsLoading ? (
            <p className="text-xs text-slate-400 font-mono">Chargement...</p>
          ) : (
            <div className="space-y-3">
              {DELIVERY_CITIES.map((city) => (
                <div key={city} className="flex items-center gap-3">
                  <label className="flex-1 text-sm text-slate-700">{city}</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      placeholder="Non défini"
                      value={deliveryFeesDraft[city] ?? ''}
                      onChange={(e) =>
                        setDeliveryFeesDraft((prev) => ({ ...prev, [city]: e.target.value }))
                      }
                      className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm font-mono focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-mono">FCFA</span>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-mono font-bold uppercase flex items-center gap-1.5 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{settingsSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
                {settingsMsg && (
                  <span className={`text-xs font-mono ${settingsMsg.includes('✓') ? 'text-emerald-700' : 'text-red-600'}`}>
                    {settingsMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Add / Edit Product Form */}
      {activeTab === 'add' && (
        <form onSubmit={handleSaveProduct} className="space-y-4 font-sans bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <h3 className="text-base font-mono font-bold uppercase text-amber-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-600" />
            <span>{editingProductId ? 'Modifier la Fiche du Composant' : 'Ajouter un Nouveau Composant au Catalogue'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 mb-1">
                Référence Exacte Constructeur (MPN) <span className="text-amber-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: STM32F103C8T6, NE555P, IRFZ44N"
                value={newMpn}
                onChange={(e) => setNewMpn(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 mb-1">
                Catégorie <span className="text-amber-600">*</span>
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none"
              >
                {CATEGORIES.filter((c) => c !== 'Toutes les catégories').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-700 mb-1">
              Nom Explicatif Complet du Produit <span className="text-amber-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carte Microcontrôleur STM32F103C8T6 ARM Cortex-M3 (Blue Pill)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 mb-1">Prix Unitaire (FCFA)</label>
              <input
                type="number"
                required
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-red-700 mb-1">Promo / Réduction (%)</label>
              <input
                type="number"
                min="0"
                max="95"
                placeholder="Ex: 15"
                value={newDiscountPercent}
                onChange={(e) => setNewDiscountPercent(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-red-200 rounded-xl text-red-700 font-mono text-sm focus:border-red-500 focus:outline-none"
              />
              {newDiscountPercent && parseInt(newDiscountPercent, 10) > 0 && (
                <p className="text-[10px] font-mono text-red-600 mt-1">
                  Prix promo : {Math.round(newPrice * (1 - parseInt(newDiscountPercent, 10) / 100)).toLocaleString('fr-FR')} FCFA
                </p>
              )}
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer h-[42px]">
                <input
                  type="checkbox"
                  checked={newIsPopular}
                  onChange={(e) => setNewIsPopular(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-xs font-mono font-bold text-amber-900">⭐ Produit Vedette</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 mb-1">Quantité Stock</label>
              <input
                type="number"
                required
                min="0"
                value={newStock}
                onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 mb-1">Statut Stock</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as StockStatus)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="IN_STOCK">En Stock</option>
                <option value="ON_DEMAND">Sur Commande</option>
                <option value="OUT_OF_STOCK">Épuisé</option>
              </select>
            </div>
          </div>

          {/* Multi-Image Gallery Uploader (up to 6 photos) */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase text-slate-700">
              Photos du Composant — jusqu'à {MAX_IMAGES} images ({newImages.length}/{MAX_IMAGES})
            </label>

            {newImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {newImages.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-amber-400 bg-slate-100">
                    <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-mono font-bold">
                        Principale
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center opacity-90 hover:opacity-100"
                      title="Retirer cette photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {newImages.length < MAX_IMAGES && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <label className={`px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs font-mono text-slate-800 flex items-center gap-2 ${compressingImages ? 'opacity-60 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4 text-amber-600" />
                  <span>{compressingImages ? 'Traitement des images...' : 'Téléverser une/des image(s)...'}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageFileUpload} disabled={compressingImages} />
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ou coller une URL d'image (https://...)"
                    value={newImageUrlInput}
                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-mono rounded-xl font-bold shrink-0"
                  >
                    + Ajouter
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-700 mb-1">
              Vidéo de Présentation (Optionnel — lien YouTube, Vimeo, ou fichier .mp4)
            </label>
            <input
              type="url"
              placeholder="Ex: https://www.youtube.com/watch?v=..."
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-700 mb-1">Lien Fiche Technique (Datasheet PDF)</label>
            <input
              type="url"
              placeholder="Ex: https://www.st.com/resource/en/datasheet/stm32f103c8.pdf"
              value={newDatasheet}
              onChange={(e) => setNewDatasheet(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-700 mb-1">Description Technique Explicative</label>
            <textarea
              rows={3}
              placeholder="Description des fonctionnalités et caractéristiques..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Custom Specs Pair */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="block text-xs font-mono uppercase text-amber-800 font-bold">Spécifications Électriques (Key / Value)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Propriété (ex: Tension)"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
              />
              <input
                type="text"
                placeholder="Valeur (ex: 3.3V - 5V)"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                className="w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddSpec}
                className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-mono rounded-lg font-bold shrink-0"
              >
                + Ajouter
              </button>
            </div>

            {Object.keys(specsList).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {Object.entries(specsList).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 flex items-center gap-1.5"
                  >
                    <strong>{k}:</strong> {v}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(k)}
                      className="text-slate-400 hover:text-red-600 ml-1 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab('products');
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 text-xs font-mono font-medium"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs font-mono uppercase flex items-center gap-2 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer le Composant</span>
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
