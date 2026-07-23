import React, { useState } from 'react';
import { Lock, Unlock, Plus, Trash2, Edit3, Save, X, Upload, Database, Globe, RefreshCw, AlertCircle, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { Product, StockStatus, CustomSourcingRequest } from '../types';
import { CATEGORIES } from '../data/initialData';
import { SupabaseGuide } from './SupabaseGuide';

interface AdminPanelProps {
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onClearAllProducts: () => void;
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onClearAllProducts,
  onClose,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'add' | 'supabase'>('products');

  // New Product Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMpn, setNewMpn] = useState('');
  const [newCategory, setNewCategory] = useState(CATEGORIES[1]);
  const [newPrice, setNewPrice] = useState<number>(2500);
  const [newStock, setNewStock] = useState<number>(20);
  const [newStatus, setNewStatus] = useState<StockStatus>('IN_STOCK');
  const [newDescription, setNewDescription] = useState('');
  const [newDatasheet, setNewDatasheet] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [specsList, setSpecsList] = useState<Record<string, string>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Electronok') {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
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

    const productObj: Product = {
      id: editingProductId || `prod-${Date.now()}`,
      name: newTitle.trim(),
      mpn: newMpn.trim().toUpperCase(),
      category: newCategory,
      priceFcfa: newPrice,
      stock: newStock,
      status: newStatus,
      description: newDescription,
      specifications: specsList,
      datasheetUrl: newDatasheet.trim() || undefined,
      imageUrl:
        newImageUrl.trim() ||
        'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80',
      createdAt: new Date().toISOString(),
    };

    if (editingProductId) {
      onUpdateProduct(productObj);
    } else {
      onAddProduct(productObj);
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
    setNewStock(product.stock);
    setNewStatus(product.status);
    setNewDescription(product.description);
    setNewDatasheet(product.datasheetUrl || '');
    setNewImageUrl(product.imageUrl);
    setSpecsList(product.specifications || {});
    setActiveTab('add');
  };

  const resetForm = () => {
    setEditingProductId(null);
    setNewTitle('');
    setNewMpn('');
    setNewCategory(CATEGORIES[1]);
    setNewPrice(2500);
    setNewStock(20);
    setNewStatus('IN_STOCK');
    setNewDescription('');
    setNewDatasheet('');
    setNewImageUrl('');
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
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm font-mono uppercase shadow-md transition-all"
          >
            Se Connecter à la Gestion
          </button>
        </form>

        <p className="text-[11px] font-mono text-slate-500">
          Mot de passe configuré : <code className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Electronok</code>
        </p>
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
              GESTIONNAIRE ACCÈS SÉCURISÉ (MOT DE PASSE: Electronok)
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
                onClearAllProducts();
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
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
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
          onClick={() => setActiveTab('supabase')}
          className={`px-4 py-2 rounded-xl text-xs font-mono uppercase font-bold flex items-center gap-1.5 transition-all ${
            activeTab === 'supabase'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Export Supabase & Vercel / GitHub</span>
        </button>
      </div>

      {/* Tab Content 1: Products Inventory Table */}
      {activeTab === 'products' && (
        <div className="space-y-4 font-sans">
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
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-slate-200"
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-700">{p.mpn}</td>
                      <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">{p.name}</td>
                      <td className="p-3 text-slate-600 font-mono">{p.category}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">
                        {p.priceFcfa.toLocaleString('fr-FR')} FCFA
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
                          onClick={() => onDeleteProduct(p.id)}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          {/* Image Uploader */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase text-slate-700">
              Photo du Composant (Téléverser depuis l'appareil OU Coller une URL)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <label className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl cursor-pointer text-xs font-mono text-slate-800 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Téléverser une image...</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageFileUpload} />
              </label>

              <input
                type="text"
                placeholder="Ou coller une URL d'image (https://...)"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            {newImageUrl && (
              <div className="flex items-center gap-3 pt-2">
                <img src={newImageUrl} alt="Aperçu" className="w-16 h-16 object-cover rounded-lg border border-amber-500" />
                <span className="text-xs text-emerald-700 font-mono font-medium">Image configurée avec succès !</span>
              </div>
            )}
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
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Propriété (ex: Tension)"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                className="w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
              />
              <input
                type="text"
                placeholder="Valeur (ex: 3.3V - 5V)"
                value={specValue}
                onChange={(e) => setSpecValue(e.target.value)}
                className="w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
              />
              <button
                type="button"
                onClick={handleAddSpec}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-mono rounded-lg font-bold"
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

      {/* Tab Content 3: Supabase Guide */}
      {activeTab === 'supabase' && <SupabaseGuide />}

    </div>
  );
};
