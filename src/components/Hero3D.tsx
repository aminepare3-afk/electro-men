import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShoppingBag, Send, ShieldCheck, Zap, Cpu, Search, Tag, Star, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { getMainImage, getFinalPrice, hasDiscount } from '../utils/product';

interface Hero3DProps {
  onOpenSourcingModal: () => void;
  onExploreClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  featuredProducts: Product[];
  featuredLoading: boolean;
  onSelectProduct: (product: Product) => void;
}

const AUTO_ADVANCE_MS = 4500;

export const Hero3D: React.FC<Hero3DProps> = ({
  onOpenSourcingModal,
  onExploreClick,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  featuredProducts,
  featuredLoading,
  onSelectProduct,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const count = featuredProducts.length;

  // Reset carousel position whenever the featured list changes (e.g. after fetch)
  useEffect(() => {
    setActiveIndex(0);
  }, [count]);

  // Auto-advance the carousel when there are 2+ featured items
  useEffect(() => {
    if (count < 2 || isPaused) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setActiveIndex((prev) => (prev + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [count, isPaused]);

  const goTo = useCallback((idx: number) => {
    setDirection(idx > activeIndex ? 1 : -1);
    setActiveIndex(idx);
  }, [activeIndex]);

  const goNext = () => {
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % count);
  };
  const goPrev = () => {
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + count) % count);
  };

  const current = featuredProducts[activeIndex];

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

        {/* Right Column: Auto-Scrolling Featured / Promo Carousel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-5 relative w-full"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-600 font-bold">
                Produits Vedette & Promotions
              </span>
            </div>
            {count > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={goPrev}
                  className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-amber-700 hover:border-amber-300 flex items-center justify-center transition-colors"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={goNext}
                  className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-amber-700 hover:border-amber-300 flex items-center justify-center transition-colors"
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {featuredLoading && count === 0 ? (
            /* Skeleton shown only during the very first load */
            <div className="h-[340px] sm:h-[400px] w-full rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden animate-pulse">
              <div className="h-56 sm:h-64 w-full bg-slate-200" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-2/3 bg-slate-200 rounded" />
                <div className="h-4 w-1/3 bg-slate-200 rounded" />
              </div>
            </div>
          ) : current ? (
            <div className="relative h-[340px] sm:h-[400px] w-full">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.button
                  key={current.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  onClick={() => onSelectProduct(current)}
                  className="group absolute inset-0 w-full text-left rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="relative h-56 sm:h-64 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={getMainImage(current)}
                      alt={current.name}
                      loading="eager"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {hasDiscount(current) ? (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-red-600 text-white font-mono font-bold text-xs shadow-md flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> -{current.discountPercent}% PROMO
                      </span>
                    ) : (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-mono font-bold text-xs shadow-md flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-slate-950" /> VEDETTE
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] backdrop-blur-md">
                      {current.category}
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{current.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {hasDiscount(current) && (
                          <span className="text-xs font-mono text-slate-400 line-through">
                            {current.priceFcfa.toLocaleString('fr-FR')}
                          </span>
                        )}
                        <span className={`text-base font-black font-mono ${hasDiscount(current) ? 'text-red-600' : 'text-amber-700'}`}>
                          {getFinalPrice(current).toLocaleString('fr-FR')} FCFA
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </motion.button>
              </AnimatePresence>
            </div>
          ) : (
            /* Empty state placeholder while no product is marked as featured/promo yet */
            <div className="relative h-[340px] sm:h-[400px] w-full rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 flex flex-col items-center justify-center text-center p-8 shadow-xl overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none"></div>
              <Star className="w-12 h-12 text-amber-400 mb-4" />
              <h3 className="text-white font-bold font-mono uppercase text-sm mb-2">Aucun Produit Vedette pour le moment</h3>
              <p className="text-slate-400 text-xs max-w-xs">
                Marquez un composant comme "Produit Vedette" ou ajoutez une promotion depuis l'administration pour le mettre en avant ici.
              </p>
            </div>
          )}

          {/* Dot indicators */}
          {count > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {featuredProducts.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => goTo(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeIndex ? 'w-6 bg-amber-500' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Voir le produit ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </section>
  );
};
