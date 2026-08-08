import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeftRight, ShoppingCart, Send, FileText, CheckCircle2, Clock, AlertTriangle, Trash2, Plus, Sparkles, Scale } from 'lucide-react';
import { Product } from '../types';
import { getMainImage, getFinalPrice } from '../utils/product';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  compareProducts: Product[];
  allProducts: Product[];
  onRemoveFromCompare: (productId: string) => void;
  onSelectCompareProduct: (slotIndex: number, product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  compareProducts,
  allProducts,
  onRemoveFromCompare,
  onSelectCompareProduct,
  onAddToCart,
}) => {
  if (!isOpen) return null;

  const prod1 = compareProducts[0] || null;
  const prod2 = compareProducts[1] || null;

  // Gather all unique specification keys from both products
  const specKeysSet = new Set<string>();
  if (prod1?.specifications) {
    Object.keys(prod1.specifications).forEach((k) => specKeysSet.add(k));
  }
  if (prod2?.specifications) {
    Object.keys(prod2.specifications).forEach((k) => specKeysSet.add(k));
  }
  const allSpecKeys = Array.from(specKeysSet);

  const getStatusBadge = (product: Product) => {
    switch (product.status) {
      case 'IN_STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> En Stock ({product.stock})
          </span>
        );
      case 'ON_DEMAND':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Sur Commande
          </span>
        );
      case 'OUT_OF_STOCK':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" /> Épuisé
          </span>
        );
    }
  };

  const getWhatsAppUrl = (product: Product) => {
    const msg = encodeURIComponent(
      `Bonjour ELECTRO MEN (+226 65 48 47 38), je souhaite commander ce composant suite à une comparaison :\n\n- Produit : ${product.name}\n- Référence MPN : ${product.mpn}\n- Prix : ${getFinalPrice(product).toLocaleString('fr-FR')} FCFA`
    );
    return `https://wa.me/22665484738?text=${msg}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-sans flex items-center gap-2">
                  <span>Comparateur de Composants</span>
                  <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    Côte à Côte
                  </span>
                </h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Analyse comparative rapide des données techniques & tarifs
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Slot Selectors Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Slot 1 Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase font-bold text-slate-500 flex items-center justify-between">
                <span>Composant A (Gauche)</span>
                {prod1 && (
                  <button
                    onClick={() => onRemoveFromCompare(prod1.id)}
                    className="text-red-600 hover:text-red-700 font-normal flex items-center gap-1 normal-case text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" /> Retirer
                  </button>
                )}
              </label>
              <select
                value={prod1?.id || ''}
                onChange={(e) => {
                  const found = allProducts.find((p) => p.id === e.target.value);
                  if (found) onSelectCompareProduct(0, found);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Sélectionner Composant A --</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === prod2?.id}>
                    [{p.mpn}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Slot 2 Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase font-bold text-slate-500 flex items-center justify-between">
                <span>Composant B (Droite)</span>
                {prod2 && (
                  <button
                    onClick={() => onRemoveFromCompare(prod2.id)}
                    className="text-red-600 hover:text-red-700 font-normal flex items-center gap-1 normal-case text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" /> Retirer
                  </button>
                )}
              </label>
              <select
                value={prod2?.id || ''}
                onChange={(e) => {
                  const found = allProducts.find((p) => p.id === e.target.value);
                  if (found) onSelectCompareProduct(1, found);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Sélectionner Composant B --</option>
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.id === prod1?.id}>
                    [{p.mpn}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Comparison Body */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
            {!prod1 && !prod2 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  Aucun composant sélectionné
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Choisissez deux composants électroniques dans les menus ci-dessus ou cliquez sur le bouton <span className="font-mono font-bold text-amber-700">"Comparer"</span> sur n'importe quel produit pour afficher leurs caractéristiques côte à côte.
                </p>
              </div>
            ) : (
              <>
                {/* Visual Cards Grid Side-by-Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Product 1 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3 relative">
                    {prod1 ? (
                      <>
                        <div className="flex gap-3 items-start">
                          <img
                            src={getMainImage(prod1)}
                            alt={prod1.name}
                            loading="lazy"
                            decoding="async"
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 bg-white flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80');
                            }}
                          />
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold text-xs">
                              MPN: {prod1.mpn}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mt-1">
                              {prod1.name}
                            </h4>
                            <div className="text-[11px] font-mono text-slate-500">{prod1.category}</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block">PRIX UNITAIRE</span>
                            <span className="text-lg font-bold font-mono text-amber-800">
                              {getFinalPrice(prod1).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                          <div>{getStatusBadge(prod1)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => onAddToCart(prod1)}
                            className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1 shadow-sm"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Panier</span>
                          </button>
                          <a
                            href={getWhatsAppUrl(prod1)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono text-xs flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs font-mono text-center p-4 border-2 border-dashed border-slate-200 rounded-xl">
                        <Plus className="w-6 h-6 mb-1 text-slate-300" />
                        <span>Sélectionnez le composant A dans le menu ci-dessus</span>
                      </div>
                    )}
                  </div>

                  {/* Card Product 2 */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3 relative">
                    {prod2 ? (
                      <>
                        <div className="flex gap-3 items-start">
                          <img
                            src={getMainImage(prod2)}
                            alt={prod2.name}
                            loading="lazy"
                            decoding="async"
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 bg-white flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80');
                            }}
                          />
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300 font-mono font-bold text-xs">
                              MPN: {prod2.mpn}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-2 mt-1">
                              {prod2.name}
                            </h4>
                            <div className="text-[11px] font-mono text-slate-500">{prod2.category}</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 block">PRIX UNITAIRE</span>
                            <span className="text-lg font-bold font-mono text-cyan-800">
                              {getFinalPrice(prod2).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                          <div>{getStatusBadge(prod2)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => onAddToCart(prod2)}
                            className="py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-1 shadow-sm"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Panier</span>
                          </button>
                          <a
                            href={getWhatsAppUrl(prod2)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-mono text-xs flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs font-mono text-center p-4 border-2 border-dashed border-slate-200 rounded-xl">
                        <Plus className="w-6 h-6 mb-1 text-slate-300" />
                        <span>Sélectionnez le composant B dans le menu ci-dessus</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Comparison Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="p-3 bg-slate-900 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Tableau Comparatif des Spécifications Techniques</span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-mono text-slate-600 uppercase text-[11px]">
                        <th className="p-3 w-1/3 border-r border-slate-200">Paramètre / Caractéristique</th>
                        <th className="p-3 w-1/3 border-r border-slate-200 font-bold text-amber-900 bg-amber-50/50">
                          {prod1 ? prod1.mpn : 'Composant A'}
                        </th>
                        <th className="p-3 w-1/3 font-bold text-cyan-900 bg-cyan-50/50">
                          {prod2 ? prod2.mpn : 'Composant B'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-sans">
                      {/* Price Row */}
                      <tr className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">
                          Prix Estimé (FCFA)
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-800 border-r border-slate-200 bg-amber-50/20">
                          {prod1 ? `${getFinalPrice(prod1).toLocaleString('fr-FR')} FCFA` : '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-cyan-800 bg-cyan-50/20">
                          {prod2 ? `${getFinalPrice(prod2).toLocaleString('fr-FR')} FCFA` : '-'}
                        </td>
                      </tr>

                      {/* Stock Row */}
                      <tr className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">
                          Statut Disponibilité
                        </td>
                        <td className="p-3 border-r border-slate-200 bg-amber-50/20">
                          {prod1 ? getStatusBadge(prod1) : '-'}
                        </td>
                        <td className="p-3 bg-cyan-50/20">
                          {prod2 ? getStatusBadge(prod2) : '-'}
                        </td>
                      </tr>

                      {/* Datasheet Row */}
                      <tr className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">
                          Fiche Technique Datasheet
                        </td>
                        <td className="p-3 border-r border-slate-200 bg-amber-50/20">
                          {prod1?.datasheetUrl ? (
                            <a
                              href={prod1.datasheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-cyan-700 hover:underline font-bold"
                            >
                              <FileText className="w-3.5 h-3.5" /> Telecharger PDF
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono">Non disponible</span>
                          )}
                        </td>
                        <td className="p-3 bg-cyan-50/20">
                          {prod2?.datasheetUrl ? (
                            <a
                              href={prod2.datasheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-cyan-700 hover:underline font-bold"
                            >
                              <FileText className="w-3.5 h-3.5" /> Télécharger PDF
                            </a>
                          ) : (
                            <span className="text-slate-400 font-mono">Non disponible</span>
                          )}
                        </td>
                      </tr>

                      {/* Specification Keys Rows */}
                      {allSpecKeys.length > 0 ? (
                        allSpecKeys.map((key) => {
                          const val1 = prod1?.specifications?.[key];
                          const val2 = prod2?.specifications?.[key];
                          const isDifferent = val1 && val2 && val1 !== val2;

                          return (
                            <tr key={key} className={isDifferent ? 'bg-amber-50/40' : 'hover:bg-slate-50'}>
                              <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200 flex items-center justify-between">
                                <span>{key}</span>
                                {isDifferent && (
                                  <span className="text-[9px] font-mono uppercase bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                                    Différent
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-slate-800 border-r border-slate-200 bg-amber-50/10">
                                {val1 || <span className="text-slate-400 italic">N/A</span>}
                              </td>
                              <td className="p-3 font-mono text-slate-800 bg-cyan-50/10">
                                {val2 || <span className="text-slate-400 italic">N/A</span>}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-500 font-mono italic">
                            Aucune donnée de spécification spécifique à comparer pour l'instant.
                          </td>
                        </tr>
                      )}

                      {/* Description Row */}
                      <tr className="hover:bg-slate-50/80">
                        <td className="p-3 font-mono font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">
                          Description
                        </td>
                        <td className="p-3 text-slate-700 leading-relaxed border-r border-slate-200 bg-amber-50/10">
                          {prod1?.description || '-'}
                        </td>
                        <td className="p-3 text-slate-700 leading-relaxed bg-cyan-50/10">
                          {prod2?.description || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer Close */}
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs font-mono text-slate-600">
              ELECTRO MEN Burkina Faso — Service d'assistance & sourcing sur-mesure (+226 65 48 47 38)
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold uppercase transition-colors"
            >
              Fermer la comparaison
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
