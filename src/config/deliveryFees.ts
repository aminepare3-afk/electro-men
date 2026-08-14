/**
 * Frais de livraison par ville — VALEURS D'EXEMPLE À MODIFIER.
 * Mets ici les vrais tarifs pratiqués par ELECTRO MEN avant de passer en production.
 * "Retrait en boutique" est toujours gratuit, quelle que soit la ville.
 */
export const DELIVERY_FEES_FCFA: Record<string, number> = {
  'Ouagadougou': 1000,
  'Bobo-Dioulasso': 1500,
  'Koudougou': 2000,
  'Banfora': 2500,
  'Ouahigouya': 2500,
  'Autre Ville (Expédition)': 3000,
};

export function getDeliveryFee(city: string, deliveryMethod: string): number {
  if (deliveryMethod === 'Retrait en boutique') return 0;
  return DELIVERY_FEES_FCFA[city] ?? 0;
}
