import React, { useState } from 'react';
import { Logo } from './Logo';
import { ShoppingCart, Globe, Phone, Search, ArrowRightLeft, Share2, Landmark } from 'lucide-react';
import { CartItem } from '../types';
import { shareContent } from '../utils/share';

interface NavbarProps {
  cart: CartItem[];
  compareCount?: number;
  onOpenCart: () => void;
  onOpenCompare?: () => void;
  onOpenSourcingModal: () => void;
  onScrollToSearch: () => void;
  onOpenInvestorSpace: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cart,
  compareCount = 0,
  onOpenCart,
  onOpenCompare,
  onOpenSourcingModal,
  onScrollToSearch,
  onOpenInvestorSpace,
}) => {
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const [siteShareStatus, setSiteShareStatus] = useState<'idle' | 'copied'>('idle');

  const handleShareSite = async () => {
    const result = await shareContent(
      'ELECTRO MEN — Composants Électroniques & Sourcing',
      'Découvrez ELECTRO MEN, votre boutique de composants électroniques et service de sourcing sur-mesure au Burkina Faso !',
      typeof window !== 'undefined' ? window.location.origin : ''
    );
    if (result === 'copied') {
      setSiteShareStatus('copied');
      setTimeout(() => setSiteShareStatus('idle'), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="cursor-pointer">
          <Logo size="md" />
        </div>

        {/* Center Quick Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onScrollToSearch}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-mono flex items-center gap-2 transition-colors font-medium"
          >
            <Search className="w-4 h-4 text-amber-600" />
            <span>Rechercher par Référence MPN</span>
          </button>

          <button
            onClick={onOpenSourcingModal}
            className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-mono flex items-center gap-2 transition-colors font-medium"
          >
            <Globe className="w-4 h-4 text-cyan-600" />
            <span>Commande Sur-Mesure</span>
          </button>

          <button
            onClick={onOpenInvestorSpace}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 text-xs font-mono flex items-center gap-2 transition-colors font-medium"
          >
            <Landmark className="w-4 h-4 text-amber-600" />
            <span>Espace Investisseur</span>
          </button>
        </div>

        {/* Right Action Group */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Investor Space — visible aussi sur mobile */}
          <button
            onClick={onOpenInvestorSpace}
            className="md:hidden p-2.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/30"
            title="Espace Investisseur"
          >
            <Landmark className="w-4 h-4" />
          </button>

          {/* Share Site Button */}
          <div className="relative">
            <button
              onClick={handleShareSite}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              title="Partager le site ELECTRO MEN"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {siteShareStatus === 'copied' && (
              <span className="absolute top-full mt-1 right-0 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] whitespace-nowrap shadow-sm z-10">
                Lien copié !
              </span>
            )}
          </div>

          {/* Compare Trigger Button */}
          {compareCount > 0 && onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 hover:bg-amber-500/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-all animate-in fade-in"
              title="Ouvrir le comparateur"
            >
              <ArrowRightLeft className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Comparateur</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {compareCount}
              </span>
            </button>
          )}

          {/* WhatsApp Direct */}
          <a
            href="https://wa.me/22665484738?text=Bonjour%20ELECTRO%20MEN%2C%20je%20souhaite%20une%20information."
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-mono transition-colors font-medium"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>+226 65 48 47 38</span>
          </a>

          {/* Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs font-mono uppercase flex items-center gap-2 shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Panier</span>
            {totalCartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-slate-900 text-amber-300 text-[11px] font-bold flex items-center justify-center border border-amber-400">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
