import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ShoppingBag, Send, ShieldCheck, Zap, Cpu, Search, Tag, Star, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { getMainImage, getFinalPrice, hasDiscount } from '../utils/product';

interface Hero3DProps {
  onOpenSourcingModal: () => void;
  onExploreClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  featuredProducts: Product[];
  onSelectProduct: (product: Product) => void;
}

export const Hero3D: React.FC<Hero3DProps> = ({
  onOpenSourcingModal,
  onExploreClick,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  featuredProducts,
  onSelectProduct,
}) => {
  const mainFeatured = featuredProducts[0];
  const otherFeatured = featuredProducts.slice(1, 3);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-amber-50/60 via-slate-50 to-white text-slate-900 border-b border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Circuit Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:28px_28px] opacity-20 pointer-events-none"></div>

      {/* Floating Glow Orbs */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">

        {/* Left Column: Headline & Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-7 space-y-6 text-center lg:text-left"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs sm:text-sm font-mono tracking-wide backdrop-blur-md">
            <Zap className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>N°1 Vente de Composants & Sourcing Sur-Mesure au Burkina Faso</span>
          </div>

          {/* Main Display Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase leading-tight font-mono text-slate-900">
            Vente de <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent">Composants Électroniques</span> & Références MPN
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl font-sans leading-relaxed">
            Trouvez instantanément vos microcontrôleurs, capteurs, régulateurs et puces par <strong className="text-amber-800 font-semibold">nom ou référence exacte MPN</strong>. 
            Si un composant n'est pas en stock, <strong className="text-cyan-700 font-semibold">commandez-le directement sur-mesure</strong> via notre service dédié WhatsApp.
          </p>

          {/* Compact Search Bar (Name or MPN Reference) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchSubmit();
            }}
            id="hero-search"
            className="flex flex-col sm:flex-row gap-2 pt-1 max-w-xl mx-auto lg:mx-0"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher par nom ou référence (ex: NE555, STM32...)"
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 focus:border-amber-500 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 font-mono uppercase tracking-wide transition-all"
            >
              <Search className="w-4 h-4" />
              <span>Rechercher</span>
            </button>
          </form>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
            <button
              onClick={onExploreClick}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-base shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 font-mono uppercase tracking-wider"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>Explorer le Catalogue</span>
            </button>

            <button
              onClick={onOpenSourcingModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 hover:border-amber-500 font-bold text-base shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 font-mono"
            >
              <Send className="w-5 h-5 text-cyan-600" />
              <span>Commander Sur-Mesure</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-200 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-mono">Recherche MPN</div>
                <div className="text-sm font-bold text-slate-900">Rapide & Simple</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-mono">Qualité Mousse & IC</div>
                <div className="text-sm font-bold text-slate-900">100% Authentique</div>
              </div>
            </div>

            <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase font-mono">WhatsApp Direct</div>
                <div className="text-sm font-bold text-emerald-700">+226 65 48 47 38</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Featured / Promo Products Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-5 relative w-full"
        >
          {mainFeatured ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold">
                  Produits Vedette & Promotions
                </span>
              </div>

              {/* Main Featured Card */}
              <button
                onClick={() => onSelectProduct(mainFeatured)}
                className="group relative w-full text-left rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-56 sm:h-64 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={getMainImage(mainFeatured)}
                    alt={mainFeatured.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {hasDiscount(mainFeatured) ? (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-red-600 text-white font-mono font-bold text-xs shadow-md flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> -{mainFeatured.discountPercent}% PROMO
                    </span>
                  ) : (
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-mono font-bold text-xs shadow-md flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-slate-950" /> VEDETTE
                    </span>
                  )}
                  <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] backdrop-blur-md">
                    {mainFeatured.category}
                  </span>
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{mainFeatured.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {hasDiscount(mainFeatured) && (
                        <span className="text-xs font-mono text-slate-400 line-through">
                          {mainFeatured.priceFcfa.toLocaleString('fr-FR')}
                        </span>
                      )}
                      <span className={`text-base font-black font-mono ${hasDiscount(mainFeatured) ? 'text-red-600' : 'text-amber-700'}`}>
                        {getFinalPrice(mainFeatured).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </button>

              {/* Secondary Featured Items */}
              {otherFeatured.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {otherFeatured.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectProduct(p)}
                      className="group relative text-left rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="relative h-24 w-full bg-slate-100 overflow-hidden">
                        <img
                          src={getMainImage(p)}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {hasDiscount(p) && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px]">
                            -{p.discountPercent}%
                          </span>
                        )}
                      </div>
                      <div className="p-2">
                        <h4 className="text-[11px] font-bold text-slate-900 truncate">{p.name}</h4>
                        <span className={`text-xs font-mono font-bold ${hasDiscount(p) ? 'text-red-600' : 'text-amber-700'}`}>
                          {getFinalPrice(p).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Empty state placeholder while no product is marked as featured/promo yet */
            <div className="relative h-[380px] sm:h-[460px] w-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 flex flex-col items-center justify-center text-center p-8 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
              <Star className="w-12 h-12 text-amber-400 mb-4" />
              <h3 className="text-white font-bold font-mono uppercase text-sm mb-2">Aucun Produit Vedette pour le moment</h3>
              <p className="text-slate-400 text-xs max-w-xs">
                Marquez un composant comme "Produit Vedette" ou ajoutez une promotion depuis l'administration pour le mettre en avant ici.
              </p>
            </div>
          )}
        </motion.div>

      </div>
    </section>
  );
};
