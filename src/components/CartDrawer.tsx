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
  ArrowRight,
} from 'lucide-react';
import { CartItem, PastOrder, Product } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onAddToCart?: (product: Product, quantity?: number) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToCart,
}) => {
  const [activeTab, setActiveTab] = useState<'cart' | 'history'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Ouagadougou');
  const [neighborhood, setNeighborhood] = useState('');

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

  const totalFcfa = cart.reduce((sum, item) => sum + item.product.priceFcfa * item.quantity, 0);

  // Save order to LocalStorage history
  const saveOrderToHistory = (orderItems: CartItem[]) => {
    try {
      const newOrder: PastOrder = {
        id: 'CMD-' + Math.floor(100000 + Math.random() * 900000),
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

  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;

    // Save order in history before opening WhatsApp
    saveOrderToHistory(cart);

    let itemsList = cart
      .map(
        (item, idx) =>
          `${idx + 1}. *${item.product.name}* (Ref MPN: ${item.product.mpn})\n   • Qte: ${item.quantity} x ${item.product.priceFcfa.toLocaleString('fr-FR')} FCFA = ${(item.product.priceFcfa * item.quantity).toLocaleString('fr-FR')} FCFA`
      )
      .join('\n\n');

    const msg = encodeURIComponent(
      `Bonjour ELECTRO MEN (+226 65 48 47 38),\nJe souhaite passer la commande suivante :\n\n` +
        `📦 *PANIER COMMANDES COMPOSANTS* :\n${itemsList}\n\n` +
        `💵 *TOTAL COMMANDE* : *${totalFcfa.toLocaleString('fr-FR')} FCFA*\n\n` +
        `📍 *LIVRAISON BURKINA FASO* :\n` +
        `• Nom : ${customerName || 'Non précisé'}\n` +
        `• Téléphone/WhatsApp : ${phone || 'Non précisé'}\n` +
        `• Ville : ${city}\n` +
        `• Quartier / Adresse : ${neighborhood || 'Non précisé'}\n\n` +
        `Merci de me contacter pour valider le paiement (Orange Money/Moov) et lancer la livraison !`
    );

    window.open(`https://wa.me/22665484738?text=${msg}`, '_blank');
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 text-slate-900 flex flex-col shadow-2xl">
          
          {/* Drawer Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
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

          {/* Navigation Tab Bar */}
          <div className="p-2 bg-slate-100 border-b border-slate-200 grid grid-cols-2 gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveTab('cart')}
              className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'cart'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <span>Panier Actuel ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-4 h-4 text-cyan-600" />
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
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex gap-3 items-center"
                      >
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
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
                          <div className="text-xs font-mono text-slate-600 mt-1">
                            {item.product.priceFcfa.toLocaleString('fr-FR')} FCFA
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
                    ))}
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

                      <div>
                        <label className="block text-slate-600 mb-0.5">Numéro Téléphone / WhatsApp</label>
                        <input
                          type="tel"
                          placeholder="Ex: +226 70 12 34 56"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </>
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
                    Lorsque vous passez une commande via WhatsApp, elle est automatiquement sauvegardée ici.
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
                                      x{item.quantity} ({ (item.product.priceFcfa * item.quantity).toLocaleString('fr-FR') } FCFA)
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
            <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3 font-mono">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-sans">Total Commande :</span>
                <span className="text-2xl font-black text-amber-800">
                  {totalFcfa.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <button
                onClick={handleCheckoutWhatsApp}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Send className="w-5 h-5" />
                <span>Envoyer Commande par WhatsApp (+226 65 48 47 38)</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
