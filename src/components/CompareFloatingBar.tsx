import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scale, X, ArrowRight, Trash2 } from 'lucide-react';
import { Product } from '../types';
import { getThumbnail } from '../utils/product';

interface CompareFloatingBarProps {
  compareProducts: Product[];
  onOpenCompareModal: () => void;
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
}

export const CompareFloatingBar: React.FC<CompareFloatingBarProps> = ({
  compareProducts,
  onOpenCompareModal,
  onRemoveFromCompare,
  onClearCompare,
}) => {
  if (compareProducts.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto"
      >
        <div className="bg-slate-900/95 backdrop-blur-xl text-white p-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left Title & Items */}
          <div className="flex items-center gap-3 overflow-x-auto py-1 no-scrollbar">
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold hidden sm:flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5" />
            </div>

            <div className="flex items-center gap-2">
              {compareProducts.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-mono"
                >
                  <img
                    src={getThumbnail(p)}
                    alt={p.mpn}
                    className="w-6 h-6 object-cover rounded bg-white flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80');
                    }}
                  />
                  <span className="font-bold text-amber-400 truncate max-w-[90px] sm:max-w-[120px]">
                    {p.mpn}
                  </span>
                  <button
                    onClick={() => onRemoveFromCompare(p.id)}
                    className="text-slate-400 hover:text-red-400 transition-colors p-0.5"
                    title="Supprimer de la comparaison"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {compareProducts.length === 1 && (
                <div className="text-[11px] font-mono text-slate-400 italic hidden md:inline px-1">
                  + Ajoutez un 2ème composant
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onOpenCompareModal}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs uppercase flex items-center gap-1.5 shadow-md transition-all whitespace-nowrap"
            >
              <span>Comparer ({compareProducts.length}/2)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClearCompare}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Vider la sélection"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
