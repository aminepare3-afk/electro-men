import { Product } from '../types';

export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1608564697071-ddf911d81370?auto=format&fit=crop&w=600&q=80';

/** Retourne la liste des images du produit, avec un repli si vide. */
export function getImages(product: Product): string[] {
  if (product.images && product.images.length > 0) return product.images;
  // Rétrocompatibilité avec d'anciens produits enregistrés au format imageUrl
  const legacyUrl = (product as any).imageUrl;
  if (typeof legacyUrl === 'string' && legacyUrl.trim()) return [legacyUrl];
  return [FALLBACK_IMAGE];
}

/** Retourne l'image principale (première photo) du produit. */
export function getMainImage(product: Product): string {
  return getImages(product)[0];
}

/** Retourne la miniature légère du produit (pour grilles/cartes), avec repli sur l'image pleine résolution. */
export function getThumbnail(product: Product): string {
  if (product.thumbnails && product.thumbnails.length > 0) return product.thumbnails[0];
  return getMainImage(product);
}

/** true si le produit a une promotion active. */
export function hasDiscount(product: Product): boolean {
  return !!product.discountPercent && product.discountPercent > 0 && product.discountPercent < 100;
}

/** Prix après réduction (arrondi), identique au prix normal si pas de promo. */
export function getFinalPrice(product: Product): number {
  if (hasDiscount(product)) {
    return Math.round(product.priceFcfa * (1 - (product.discountPercent as number) / 100));
  }
  return product.priceFcfa;
}

/** Détecte si une URL vidéo est un lien YouTube/Vimeo à intégrer en iframe, ou un fichier direct. */
export function getVideoEmbedInfo(url: string): { type: 'youtube' | 'vimeo' | 'direct'; embedUrl: string } {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  return { type: 'direct', embedUrl: url };
}
