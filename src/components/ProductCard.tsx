import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { ShoppingCart, ExternalLink, Send, CheckCircle2, Clock, AlertTriangle, FileText, Cpu, ArrowRightLeft, Share2, Images, Tag } from 'lucide-react';
import { Product } from '../types';
import { getMainImage, getFinalPrice, hasDiscount } from '../utils/product';
import { shareContent } from '../utils/share';

interface ProductCardProps {
  product: Product;
  isCompared?: boolean;
  onToggleCompare?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenSourcingForMpn: (mpnInfo: { mpn: string; name: string; category: string; priceEst?: number }) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isCompared = false,
  onToggleCompare,
  onAddToCart,
  onSelectProduct,
  onOpenSourcingForMpn,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  const finalPrice = getFinalPrice(product);
  const onSale = hasDiscount(product);

  // Motion values for normalized mouse positions (-0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for fluid 3D motion
  const springConfig = { damping: 22, stiffness: 280, mass: 0.4 };
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), springConfig);
  const cardScale = useSpring(useTransform(x, [-0.5, 0, 0.5], [1.02, 1, 1.02]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    x.set((mouseX / width) - 0.5);
    y.set((mouseY / height) - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Format WhatsApp direct link for this specific item
  const formattedMsg = encodeURIComponent(
    `Bonjour ELECTRO MEN 👋\n\nJe souhaite commander ce composant :\n\n🔩 *${product.name}*\n📎 Référence MPN : ${product.mpn}\n💰 Prix : ${finalPrice.toLocaleString('fr-FR')} FCFA${onSale ? ` (Promo -${product.discountPercent}% !)` : ''}\n📦 Disponibilité : ${product.status === 'IN_STOCK' ? 'En Stock' : product.status === 'ON_DEMAND' ? 'Sur Commande' : 'Épuisé'}\n\nMerci de me confirmer la disponibilité et les modalités de livraison !`
  );
  const whatsappUrl = `https://wa.me/22665484738?text=${formattedMsg}`;

  const productShareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?produit=${product.id}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await shareContent(
      product.name,
      `Découvrez ${product.name} (Réf: ${product.mpn}) chez ELECTRO MEN — ${finalPrice.toLocaleString('fr-FR')} FCFA`,
      productShareUrl
    );
    if (result === 'copied') {
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  };

  const getStatusBadge = () => {
    switch (product.status) {
      case 'IN_STOCK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> En Stock ({product.stock})
          </span>
        );
      case 'ON_DEMAND':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 font-mono text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-cyan-600" /> Sur Commande
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-800 font-mono text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Épuisé
          </span>
        );
    }
  };

  return (
    <div className="w-full" style={{ perspective: '1000px' }}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          scale: cardScale,
          transformStyle: 'preserve-3d',
        }}
        className="group relative rounded-2xl bg-white border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden transition-colors duration-300"
      >
        {/* Top Image Container with 3D Depth */}
        <div
          className="relative h-48 w-full bg-slate-100 overflow-hidden cursor-pointer"
          onClick={() => onSelectProduct(product)}
          style={{ transform: 'translateZ(15px)', transformStyle: 'preserve-3d' }}
        >
          <img
            src={getMainImage(product)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80');
            }}
          />

          {/* Discount Badge */}
          {onSale && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2" style={{ transform: 'translateZ(30px) translateX(-50%)' }}>
              <span className="px-2.5 py-1 rounded-md bg-red-600 text-white font-mono font-bold text-xs shadow-md flex items-center gap-1">
                <Tag className="w-3 h-3" /> -{product.discountPercent}%
              </span>
            </div>
          )}

          {/* Photo count badge */}
          {product.images && product.images.length > 1 && (
            <div className="absolute bottom-3 left-3" style={{ transform: 'translateZ(25px)' }}>
              <span className="px-2 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[10px] flex items-center gap-1 backdrop-blur-md">
                <Images className="w-3 h-3" /> {product.images.length}
              </span>
            </div>
          )}

          {/* MPN Reference Badge elevated in 3D */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1" style={{ transform: 'translateZ(25px)' }}>
            <span className="px-2.5 py-1 rounded-md bg-white/95 border border-amber-300 text-amber-900 font-mono font-bold text-xs shadow-md backdrop-blur-md">
              MPN: {product.mpn}
            </span>
          </div>

          {/* Category Tag elevated in 3D */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5" style={{ transform: 'translateZ(25px)' }}>
            <span className="px-2 py-0.5 rounded bg-slate-900/85 text-white font-mono text-[10px] uppercase tracking-wider backdrop-blur-md shadow-sm">
              {product.category}
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="w-7 h-7 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-amber-700 flex items-center justify-center shadow-sm backdrop-blur-md transition-colors"
              title="Partager ce produit"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            {shareStatus === 'copied' && (
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9px] shadow-sm whitespace-nowrap">
                Lien copié !
              </span>
            )}
          </div>

          {/* Compare Button Toggle */}
          {onToggleCompare && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(product);
              }}
              style={{ transform: 'translateZ(25px)' }}
              className={`absolute bottom-3 right-3 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all ${
                isCompared
                  ? 'bg-amber-500 text-slate-950 border border-amber-400 ring-2 ring-amber-400/50'
                  : 'bg-slate-900/80 hover:bg-slate-900 text-slate-200 border border-slate-700'
              }`}
              title="Comparer ce composant côte à côte"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{isCompared ? 'Comparé ✓' : 'Comparer'}</span>
            </button>
          )}
        </div>

        {/* Body Content elevated in 3D */}
        <div
          className="p-5 flex-1 flex flex-col justify-between space-y-4"
          style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}
        >
          <div>
            {/* Status Badge */}
            <div className="mb-2 flex items-center justify-between">
              {getStatusBadge()}
              {product.datasheetUrl && (
                <a
                  href={product.datasheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-700 hover:text-cyan-900 hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" /> Datasheet PDF
                </a>
              )}
            </div>

            {/* Product Title */}
            <h3
              onClick={() => onSelectProduct(product)}
              className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 cursor-pointer font-sans"
            >
              {product.name}
            </h3>

            <p className="text-slate-600 text-xs mt-1.5 line-clamp-2 leading-relaxed">
              {product.description}
            </p>

            {/* Quick Specs Snippet */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-700">
                {Object.entries(product.specifications).slice(0, 2).map(([key, val]) => (
                  <div key={key} className="bg-slate-50 p-1.5 rounded border border-slate-200 truncate">
                    <span className="text-slate-400 block text-[9px] uppercase">{key}</span>
                    <span className="text-amber-900 font-semibold truncate">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price & Action Buttons */}
          <div className="pt-3 border-t border-slate-200 space-y-3" style={{ transform: 'translateZ(10px)' }}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-mono text-slate-500 font-medium">PRIX COMPOSANT</span>
              {onSale ? (
                <span className="text-right">
                  <span className="block text-[11px] font-mono text-slate-400 line-through">
                    {product.priceFcfa.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span className="text-xl font-extrabold text-red-600 font-mono tracking-tight">
                    {finalPrice.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-600">FCFA</span>
                  </span>
                </span>
              ) : (
                <span className="text-xl font-extrabold text-amber-700 font-mono tracking-tight">
                  {finalPrice.toLocaleString('fr-FR')} <span className="text-xs font-semibold text-slate-600">FCFA</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAddToCart(product)}
                disabled={product.status === 'OUT_OF_STOCK'}
                className={`w-full py-2.5 rounded-xl text-xs font-bold font-mono uppercase flex items-center justify-center gap-1.5 transition-all duration-200 ${
                  product.status === 'OUT_OF_STOCK'
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm hover:shadow-md'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>+ Panier</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold font-mono uppercase flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
