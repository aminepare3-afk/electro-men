import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  ShoppingCart,
  Send,
  MapPin,
  History,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  Sparkles,
  Navigation,
  Loader2,
  Mail,
  PartyPopper,
} from 'lucide-react';
import { Heart } from 'lucide-react';
import { CartItem, PastOrder, Product } from '../types';
import { getThumbnail, getFinalPrice } from '../utils/product';
import { MOBILE_MONEY_CONFIG, isMobileMoneyEnabled } from '../config/mobileMoney';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onAddToCart?: (product: Product, quantity?: number) => void;
  favoriteProducts?: Product[];
  onToggleFavorite?: (productId: string) => void;
  onSelectProduct?: (product: Product) => void;
  deliveryFees?: Record<string, number>;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToCart,
  favoriteProducts = [],
  onToggleFavorite,
  onSelectProduct,
  deliveryFees = {},
}) => {
  const [activeTab, setActiveTab] = useState<'cart' | 'history' | 'favorites'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Ouagadougou');
  const [neighborhood, setNeighborhood] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'Livraison à domicile' | 'Retrait en boutique'>('Livraison à domicile');
  const [orderNotes, setOrderNotes] = useState('');
  const [honeypot, setHoneypot] = useState(''); // champ piège anti-bot, invisible pour un humain
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'orange_money' | 'moov_money'>('cash');
  const [paymentReference, setPaymentReference] = useState('');

  // Geolocation
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoAddress, setGeoAddress] = useState<string | null>(null);

  // Order submission
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'confirmed' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  // Post-order contact capture ("stay in touch" email)
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactSkipped, setContactSkipped] = useState(false);

  // Past Orders loaded from LocalStorage
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [reorderToast, setReorderToast] = useState<string | null>(null);

  // Load orders from localStorage
  const loadOrderHistory = () => {
    try {
      const saved = localStorage.getItem('ELECTRO_MEN_ORDER_HISTORY');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPastOrders(parsed);
        }
      }
    } catch (e) {
      console.error('Erreur chargement historique commandes:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrderHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotalFcfa = cart.reduce((sum, item) => sum + getFinalPrice(item.product) * item.quantity, 0);
  // Frais de livraison : configurés par l'admin (Paramètres). S'il n'y a rien pour cette ville,
  // on ne facture rien automatiquement — le montant sera communiqué directement par ELECTRO MEN.
  const isPickup = deliveryMethod === 'Retrait en boutique';
  const configuredFee = deliveryFees[city];
  const deliveryFeeKnown = isPickup || typeof configuredFee === 'number';
  const deliveryFee = isPickup ? 0 : configuredFee ?? 0;
  const totalFcfa = subtotalFcfa + deliveryFee;

  // Save order to LocalStorage history (for the customer's own "mes commandes" view on this device)
  const saveOrderToHistory = (orderItems: CartItem[], orderNumber: string) => {
    try {
      const newOrder: PastOrder = {
        id: orderNumber,
        date: new Date().toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        totalFcfa,
        customerName: customerName.trim() || 'Client',
        phone: phone.trim() || undefined,
        city: city || 'Ouagadougou',
        neighborhood: neighborhood.trim() || undefined,
        items: JSON.parse(JSON.stringify(orderItems)), // Deep clone
      };

      const updatedHistory = [newOrder, ...pastOrders].slice(0, 20); // Keep 20 most recent
      setPastOrders(updatedHistory);
      localStorage.setItem('ELECTRO_MEN_ORDER_HISTORY', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Erreur sauvegarde historique commande:', e);
    }
  };

  // Ask the browser for the customer's current position, then try to resolve a readable address.
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setGeoStatus('success');
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`
          );
          const json = await res.json();
          if (json?.display_name) setGeoAddress(json.display_name as string);
        } catch (e) {
          // Repli silencieux : les coordonnées seules suffisent pour l'admin.
        }
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit the order to the server (no more WhatsApp redirect) and show a confirmation step.
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitStatus('submitting');
    setSubmitError(null);

    const order = {
      items: cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        mpn: item.product.mpn,
        quantity: item.quantity,
        unitPrice: getFinalPrice(item.product),
        discountPercent: item.product.discountPercent || undefined,
      })),
      totalFcfa,
      subtotalFcfa,
      deliveryFee,
      customerName: customerName.trim() || 'Client',
      phone: phone.trim(),
      city,
      neighborhood: neighborhood.trim(),
      deliveryMethod,
      notes: orderNotes.trim(),
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined,
      addressText: geoAddress ?? undefined,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      website: honeypot, // rempli uniquement par les bots
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      const json = await res.json();
      if (json.success) {
        saveOrderToHistory(cart, json.orderNumber);
        setLastOrderId(json.id);
        setLastOrderNumber(json.orderNumber);
        onClearCart();
        setSubmitStatus('confirmed');
      } else {
        setSubmitError(json.error || "Erreur lors de l'envoi de la commande.");
        setSubmitStatus('error');
      }
    } catch (e) {
      setSubmitError('Impossible de contacter le serveur. Vérifiez votre connexion.');
      setSubmitStatus('error');
    }
  };

  const handleSubmitContactEmail = async () => {
    if (!lastOrderId || !contactEmail.trim()) return;
    setContactSubmitting(true);
    try {
      const res = await fetch('/api/orders/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lastOrderId, email: contactEmail.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setContactDone(true);
      }
    } catch (e) {
      // Non-bloquant : la commande est déjà enregistrée sans email.
    } finally {
      setContactSubmitting(false);
    }
  };

  // Reset the whole checkout flow back to an empty cart, ready for the next visit.
  const handleFinishCheckout = () => {
    setSubmitStatus('idle');
    setLastOrderId(null);
    setLastOrderNumber(null);
    setContactEmail('');
    setContactDone(false);
    setContactSkipped(false);
    setLatitude(null);
    setLongitude(null);
    setGeoAddress(null);
    setGeoStatus('idle');
    onClose();
  };

  // Quick Reorder functionality
  const handleReorderPastOrder = (pastOrder: PastOrder) => {
    if (!onAddToCart) return;

    let itemCount = 0;
    pastOrder.items.forEach((item) => {
      onAddToCart(item.product, item.quantity);
      itemCount += item.quantity;
    });

    setReorderToast(`⚡ ${itemCount} composant(s) réajouté(s) à votre panier !`);
    setActiveTab('cart');

    setTimeout(() => {
      setReorderToast(null);
    }, 4000);
  };

  // Delete an order from history
  const handleDeletePastOrder = (orderId: string) => {
    const updated = pastOrders.filter((o) => o.id !== orderId);
    setPastOrders(updated);
    localStorage.setItem('ELECTRO_MEN_ORDER_HISTORY', JSON.stringify(updated));
  };

  // Clear all past orders history
  const handleClearHistory = () => {
    if (window.confirm('Voulez-vous supprimer tout l\'historique de vos commandes ?')) {
      setPastOrders([]);
      localStorage.removeItem('ELECTRO_MEN_ORDER_HISTORY');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden h-dvh">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 h-dvh">
        <div className="w-screen max-w-md h-dvh bg-white border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl">
          
          {/* Drawer Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                  Panier & Historique
                </h2>
                <span className="text-[11px] text-amber-400 font-mono">ELECTRO MEN Burkina Faso</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CONFIRMATION SCREEN — shown right after an order is successfully submitted */}
          {submitStatus === 'confirmed' ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <PartyPopper className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-mono">Commande envoyée !</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Référence <span className="font-mono font-bold text-amber-800">{lastOrderNumber}</span>
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">
                  Nous avons bien reçu votre commande et nous vous contacterons très vite pour confirmer la livraison.
                </p>
              </div>

              {!contactDone && !contactSkipped ? (
                <div className="w-full max-w-xs p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-mono font-bold uppercase">Restez informé</span>
                  </div>
                  <p className="text-[11px] text-amber-800 text-left leading-relaxed">
                    Laissez votre email pour garder le contact : suivi de vos commandes, vos favoris et nos offres.
                  </p>
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setContactSkipped(true)}
                      className="flex-1 py-2 rounded-lg bg-white border border-slate-300 text-slate-600 text-xs font-mono font-bold"
                    >
                      Plus tard
                    </button>
                    <button
                      onClick={handleSubmitContactEmail}
                      disabled={!contactEmail.trim() || contactSubmitting}
                      className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-mono font-bold disabled:opacity-50"
                    >
                      {contactSubmitting ? 'Envoi...' : 'Continuer'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-700 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {contactDone ? 'Merci, à bientôt !' : ''}
                </p>
              )}

              <button
                onClick={handleFinishCheckout}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-bold uppercase"
              >
                Continuer mes achats
              </button>
            </div>
          ) : (
          <>
          {/* Navigation Tab Bar */}
          <div className="p-2 bg-slate-100 border-b border-slate-200 grid grid-cols-3 gap-1.5 font-mono text-[10px] sm:text-xs shrink-0">
            <button
              onClick={() => setActiveTab('cart')}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'cart'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              <span>Panier ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'favorites'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
              <span>Favoris ({favoriteProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600" />
              <span>Historique ({pastOrders.length})</span>
            </button>
          </div>

          {/* Toast Notification Banner */}
          {reorderToast && (
            <div className="bg-emerald-600 text-white p-3 text-xs font-mono font-bold flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{reorderToast}</span>
              </div>
              <button onClick={() => setReorderToast(null)} className="text-white/80 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: CURRENT CART */}
          {activeTab === 'cart' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 space-y-3 font-mono">
                  <ShoppingCart className="w-12 h-12 text-slate-400" />
                  <p className="text-sm">Votre panier est actuellement vide.</p>
                  
                  {pastOrders.length > 0 && (
                    <button
                      onClick={() => setActiveTab('history')}
                      className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold flex items-center gap-2 hover:bg-amber-500/20 transition-all"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-700" />
                      <span>Voir vos commandes précédentes pour recommander</span>
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs uppercase font-bold mt-2"
                  >
                    Explorer les composants
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-mono text-slate-500 uppercase">Composants Sélectionnés</span>
                    <button
                      onClick={onClearCart}
                      className="text-xs font-mono text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Vider
                    </button>
                  </div>

                  <div className="space-y-3">
                    {cart.map((item) => {
                      const price = getFinalPrice(item.product);
                      const onSale = !!item.product.discountPercent;
                      return (
                      <div
                        key={item.product.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-3 items-center"
                      >
                        <img
                          src={getThumbnail(item.product)}
                          alt={item.product.name}
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 object-cover rounded-lg bg-white border border-slate-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80');
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-mono text-amber-800 font-semibold block truncate">
                            MPN: {item.product.mpn}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.product.name}</h4>
                          <div className="text-xs font-mono text-slate-600 mt-1 flex items-center gap-1.5">
                            {onSale && (
                              <span className="line-through text-slate-400">
                                {item.product.priceFcfa.toLocaleString('fr-FR')}
                              </span>
                            )}
                            <span className={onSale ? 'text-red-600 font-bold' : ''}>
                              {price.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, -1)}
                              className="px-2 py-0.5 text-xs text-slate-700 hover:text-slate-900 font-mono font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 text-xs font-mono font-bold text-amber-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.product.id, 1)}
                              className="px-2 py-0.5 text-xs text-slate-700 hover:text-slate-900 font-mono font-bold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-slate-400 hover:text-red-600 text-[10px] font-mono mt-1"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* Delivery Form */}
                  <div className="pt-3 border-t border-slate-200 space-y-2 font-sans">
                    <h3 className="text-xs font-mono font-bold uppercase text-amber-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-cyan-600" />
                      <span>Informations de Livraison Burkina Faso</span>
                    </h3>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <label className="block text-slate-600 mb-0.5">Nom & Prénom</label>
                        <input
                          type="text"
                          placeholder="Ex: Ibrahim Sanou"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-sans focus:outline-none focus:border-amber-500 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-slate-600 mb-0.5">Ville</label>
                          <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-sans focus:outline-none focus:border-amber-500 focus:bg-white"
                          >
                            <option value="Ouagadougou">Ouagadougou</option>
                            <option value="Bobo-Dioulasso">Bobo-Dioulasso</option>
                            <option value="Koudougou">Koudougou</option>
                            <option value="Banfora">Banfora</option>
                            <option value="Ouahigouya">Ouahigouya</option>
                            <option value="Autre Ville (Expédition)">Autre Ville</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-600 mb-0.5">Quartier / Repère</label>
                          <input
                            type="text"
                            placeholder="Ex: Kalgondin..."
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-sans focus:outline-none focus:border-amber-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Use my current location */}
                      <div>
                        <button
                          type="button"
                          onClick={handleUseMyLocation}
                          disabled={geoStatus === 'loading'}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                            geoStatus === 'success'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100'
                          } disabled:opacity-60`}
                        >
                          {geoStatus === 'loading' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Localisation en cours...</span>
                            </>
                          ) : geoStatus === 'success' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Position enregistrée ✓</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Utiliser ma position actuelle</span>
                            </>
                          )}
                        </button>
                        {geoStatus === 'success' && geoAddress && (
                          <p className="text-[10px] text-emerald-700 mt-1 truncate">📍 {geoAddress}</p>
                        )}
                        {geoStatus === 'error' && (
                          <p className="text-[10px] text-red-600 mt-1">
                            Impossible d'obtenir votre position. Vérifiez que la localisation est autorisée, ou remplissez le quartier manuellement.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-0.5">Numéro Téléphone</label>
                        <input
                          type="tel"
                          placeholder="Ex: +226 70 12 34 56"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-0.5">Mode de Livraison</label>
                        <select
                          value={deliveryMethod}
                          onChange={(e) => setDeliveryMethod(e.target.value as typeof deliveryMethod)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-sans focus:outline-none focus:border-amber-500 focus:bg-white"
                        >
                          <option value="Livraison à domicile">Livraison à domicile</option>
                          <option value="Retrait en boutique">Retrait en boutique</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-600 mb-0.5">Instructions spéciales (optionnel)</label>
                        <textarea
                          rows={2}
                          placeholder="Ex: livrer après 18h, appeler avant..."
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-sans focus:outline-none focus:border-amber-500 focus:bg-white resize-none"
                        />
                      </div>

                      {isMobileMoneyEnabled && (
                        <div>
                          <label className="block text-slate-600 mb-0.5">Mode de Paiement</label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-sans focus:outline-none focus:border-amber-500 focus:bg-white"
                          >
                            <option value="cash">Paiement à la livraison (Espèces)</option>
                            {MOBILE_MONEY_CONFIG.orangeMoneyNumber && (
                              <option value="orange_money">Orange Money</option>
                            )}
                            {MOBILE_MONEY_CONFIG.moovMoneyNumber && (
                              <option value="moov_money">Moov Money</option>
                            )}
                          </select>

                          {paymentMethod !== 'cash' && (
                            <div className="mt-1.5 p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
                              <p className="text-[11px] text-amber-900">
                                Envoyez <strong>{totalFcfa.toLocaleString('fr-FR')} FCFA</strong> au numéro{' '}
                                <strong>
                                  {paymentMethod === 'orange_money'
                                    ? MOBILE_MONEY_CONFIG.orangeMoneyNumber
                                    : MOBILE_MONEY_CONFIG.moovMoneyNumber}
                                </strong>{' '}
                                puis indiquez la référence de transaction ci-dessous.
                              </p>
                              <input
                                type="text"
                                placeholder="Référence de la transaction"
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Honeypot anti-bot : invisible et inaccessible pour un humain, seuls les bots le remplissent */}
                      <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
                        <label htmlFor="website">Ne pas remplir ce champ</label>
                        <input
                          type="text"
                          id="website"
                          name="website"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypot}
                          onChange={(e) => setHoneypot(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: FAVORITES */}
          {activeTab === 'favorites' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {favoriteProducts.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500 space-y-3 font-mono">
                  <Heart className="w-12 h-12 text-slate-300" />
                  <p className="text-sm">Aucun favori pour l'instant.</p>
                  <p className="text-[11px] text-slate-400 max-w-xs font-sans">
                    Cliquez sur le cœur ♡ d'un produit pour le retrouver ici facilement.
                  </p>
                </div>
              ) : (
                favoriteProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-3 items-center"
                  >
                    <img
                      src={getThumbnail(product)}
                      alt={product.name}
                      loading="lazy"
                      className="w-14 h-14 object-cover rounded-lg bg-white border border-slate-200 shrink-0 cursor-pointer"
                      onClick={() => onSelectProduct?.(product)}
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80');
                      }}
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectProduct?.(product)}>
                      <span className="text-[10px] font-mono text-amber-800 font-semibold block truncate">
                        MPN: {product.mpn}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                      <span className="text-xs font-mono text-amber-700 font-bold">
                        {product.priceFcfa.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        onClick={() => onAddToCart?.(product, 1)}
                        className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950"
                        title="Ajouter au panier"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onToggleFavorite?.(product.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Retirer des favoris"
                      >
                        <Heart className="w-4 h-4 fill-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: PAST ORDERS HISTORY & QUICK REORDER */}
          {activeTab === 'history' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs font-sans text-amber-900 space-y-1">
                <div className="font-bold font-mono uppercase text-[11px] flex items-center gap-1.5 text-amber-950">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Commandes Précédentes (LocalStorage)</span>
                </div>
                <p className="leading-relaxed text-[11px] text-amber-800">
                  Retrouvez vos achats antérieurs enregistrés sur cet appareil. Cliquez sur <span className="font-bold text-amber-950">"Recommander"</span> pour recharger instantanément les composants dans votre panier.
                </p>
              </div>

              {pastOrders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 space-y-3 font-mono">
                  <Package className="w-12 h-12 text-slate-300" />
                  <p className="text-xs">Aucune commande enregistrée dans l'historique local.</p>
                  <p className="text-[11px] text-slate-400 max-w-xs font-sans">
                    Lorsque vous passez une commande, elle est automatiquement sauvegardée ici.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="text-xs font-mono text-slate-500 uppercase">
                      {pastOrders.length} Commande(s) Enregistrée(s)
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-xs font-mono text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Vider l'historique
                    </button>
                  </div>

                  <div className="space-y-3">
                    {pastOrders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;
                      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

                      return (
                        <div
                          key={order.id}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-sm hover:border-amber-300 transition-colors"
                        >
                          {/* Order Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                                  #{order.id}
                                </span>
                                <span className="text-[11px] font-mono text-slate-500">{order.date}</span>
                              </div>
                              <div className="text-xs font-sans text-slate-700 mt-1 font-medium">
                                {order.customerName} {order.city ? `(${order.city})` : ''}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-mono text-slate-400 block">TOTAL</span>
                              <span className="text-sm font-bold font-mono text-slate-900">
                                {order.totalFcfa.toLocaleString('fr-FR')} FCFA
                              </span>
                            </div>
                          </div>

                          {/* Items Summary & Toggle */}
                          <div className="pt-2 border-t border-slate-200 text-xs">
                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="w-full text-slate-600 hover:text-slate-900 font-mono text-[11px] flex items-center justify-between py-1"
                            >
                              <span>Contenu: {itemCount} composant(s)</span>
                              <span className="flex items-center gap-1 text-amber-800 font-semibold">
                                {isExpanded ? 'Masquer détails' : 'Voir le détail'}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </span>
                            </button>

                            {/* Detailed Items List */}
                            {isExpanded && (
                              <div className="mt-2 space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-[11px]">
                                    <div className="truncate pr-2">
                                      <span className="font-mono font-bold text-slate-800">[{item.product.mpn}]</span>{' '}
                                      <span className="text-slate-700">{item.product.name}</span>
                                    </div>
                                    <div className="font-mono text-slate-600 whitespace-nowrap">
                                      x{item.quantity} ({ (getFinalPrice(item.product) * item.quantity).toLocaleString('fr-FR') } FCFA)
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Reorder Action Button */}
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleDeletePastOrder(order.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                              title="Supprimer cette commande"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleReorderPastOrder(order)}
                              className="flex-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs uppercase flex items-center justify-center gap-1.5 shadow-sm transition-all"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>⚡ Recommander cette commande</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Drawer Footer for Current Cart */}
          {activeTab === 'cart' && cart.length > 0 && (
            <div
              className="p-5 bg-slate-50 border-t border-slate-200 space-y-3 font-mono shrink-0"
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            >
              <div className="space-y-1 text-xs font-sans text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Sous-total :</span>
                  <span className="font-mono">{subtotalFcfa.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Frais de livraison ({isPickup ? 'retrait' : city}) :</span>
                  <span className="font-mono">
                    {isPickup
                      ? 'Gratuit'
                      : deliveryFeeKnown
                      ? deliveryFee === 0
                        ? 'Gratuit'
                        : `${deliveryFee.toLocaleString('fr-FR')} FCFA`
                      : 'Communiqué après'}
                  </span>
                </div>
                {!deliveryFeeKnown && (
                  <p className="text-[10px] text-slate-500 italic">
                    Les frais de livraison vers {city} vous seront communiqués directement par ELECTRO MEN.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-600 font-sans">
                  {deliveryFeeKnown ? 'Total Commande :' : 'Total (hors livraison) :'}
                </span>
                <span className="text-2xl font-black text-amber-800">
                  {totalFcfa.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {submitError && (
                <p className="text-[11px] text-red-600 font-sans">{submitError}</p>
              )}

              <button
                onClick={handleSubmitOrder}
                disabled={submitStatus === 'submitting' || !phone.trim()}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60"
              >
                {submitStatus === 'submitting' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Commander</span>
                  </>
                )}
              </button>
              {!phone.trim() && (
                <p className="text-[10px] text-slate-500 text-center">Renseignez votre numéro de téléphone pour commander.</p>
              )}
            </div>
          )}
          </>
          )}

        </div>
      </div>
    </div>
  );
};
