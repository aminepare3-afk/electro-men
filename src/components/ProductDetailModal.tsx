import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Send, FileText, ShieldCheck, Cpu, Share2, Tag, PlayCircle } from 'lucide-react';
import { Product } from '../types';
import { getImages, getFinalPrice, hasDiscount, getVideoEmbedInfo } from '../utils/product';
import { shareContent } from '../utils/share';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onOrderNow: (product: Product, quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onOrderNow,
}) => {
  const [qty, setQty] = useState(1);
  const [activeMedia, setActiveMedia] = useState<{ type: 'image' | 'video'; index: number }>({ type: 'image', index: 0 });
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  // Reset gallery state whenever a different product is opened
  useEffect(() => {
    setQty(1);
    setActiveMedia({ type: 'image', index: 0 });
    setShareStatus('idle');
  }, [product?.id]);

  if (!product) return null;

  const images = getImages(product);
  const finalPrice = getFinalPrice(product);
  const onSale = hasDiscount(product);
  const videoInfo = product.videoUrl ? getVideoEmbedInfo(product.videoUrl) : null;

  const productShareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?produit=${product.id}`;

  const handleShare = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 shrink-0">
              <Cpu className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <span className="text-xs font-mono text-amber-800 font-bold block">
                MPN REFERENCE: {product.mpn}
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 line-clamp-1">
                {product.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:text-amber-700 hover:bg-slate-300 transition-colors relative"
              title="Partager ce produit"
            >
              <Share2 className="w-5 h-5" />
              {shareStatus === 'copied' && (
                <span className="absolute -bottom-7 right-0 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] whitespace-nowrap shadow-sm">
                  Lien copié !
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Gallery */}
            <div className="md:col-span-5 space-y-2">
              <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 h-64">
                {activeMedia.type === 'video' && videoInfo ? (
                  videoInfo.type === 'direct' ? (
                    <video src={videoInfo.embedUrl} controls className="w-full h-full object-contain bg-black" />
                  ) : (
                    <iframe
                      src={videoInfo.embedUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                ) : (
                  <img
                    src={images[activeMedia.index] || images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80');
                    }}
                  />
                )}
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-slate-900/80 text-white font-mono text-xs">
                  {product.category}
                </span>
                {onSale && (
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-red-600 text-white font-mono font-bold text-xs shadow-md flex items-center gap-1">
                    <Tag className="w-3 h-3" /> -{product.discountPercent}%
                  </span>
                )}
              </div>

              {/* Thumbnails strip (images + video) */}
              {(images.length > 1 || videoInfo) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveMedia({ type: 'image', index: idx })}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        activeMedia.type === 'image' && activeMedia.index === idx
                          ? 'border-amber-500'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {videoInfo && (
                    <button
                      type="button"
                      onClick={() => setActiveMedia({ type: 'video', index: 0 })}
                      className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 bg-slate-900 flex items-center justify-center transition-colors ${
                        activeMedia.type === 'video' ? 'border-amber-500' : 'border-slate-200 hover:border-slate-300'
                      }`}
                      title="Voir la vidéo"
                    >
                      <PlayCircle className="w-6 h-6 text-white" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Info & Price */}
            <div className="md:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {onSale ? (
                  <div>
                    <span className="block text-sm font-mono text-slate-400 line-through">
                      {product.priceFcfa.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="text-2xl font-black text-red-600 font-mono">
                      {finalPrice.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-600">FCFA / unité</span>
                    </span>
                  </div>
                ) : (
                  <span className="text-2xl font-black text-amber-700 font-mono">
                    {finalPrice.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-600">FCFA / unité</span>
                  </span>
                )}
                <span className="px-3 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-xs font-bold">
                  En Stock
                </span>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed">
                {product.description}
              </p>

              {/* Datasheet Link */}
              {product.datasheetUrl && (
                <a
                  href={product.datasheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-mono transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Consulter la Fiche Technique PDF (Datasheet)</span>
                </a>
              )}

              {/* Quantity selector */}
              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-3 sm:gap-4">
                <span className="text-xs font-mono text-slate-500 uppercase">QUANTITÉ :</span>
                <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50 shrink-0">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-3 py-1.5 text-slate-700 hover:text-slate-900 font-mono font-bold"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-slate-900 font-mono font-bold text-sm">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="px-3 py-1.5 text-slate-700 hover:text-slate-900 font-mono font-bold"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs font-mono text-amber-800 font-semibold">
                  Sous-total: {(finalPrice * qty).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>
          </div>

          {/* Specifications Table */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h4 className="text-sm font-mono font-bold uppercase text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Spécifications Techniques Officielles</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between gap-2">
                    <span className="text-slate-500">{key}:</span>
                    <span className="text-slate-900 font-bold text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {
              onAddToCart(product, qty);
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs font-mono uppercase flex items-center justify-center gap-2 shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ajouter au Panier ({qty})</span>
          </button>

          <button
            onClick={() => {
              onOrderNow(product, qty);
              onClose();
            }}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono uppercase flex items-center justify-center gap-2 shadow-lg"
          >
            <Send className="w-4 h-4" />
            <span>Commander Maintenant</span>
          </button>
        </div>
      </div>
    </div>
  );
};
