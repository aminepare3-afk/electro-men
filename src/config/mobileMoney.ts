/**
 * Paiement Mobile Money — DÉSACTIVÉ par défaut (aucun numéro configuré).
 * Renseigne au moins un numéro ci-dessous pour activer l'option de paiement
 * Orange Money / Moov Money au moment de la commande. Tant que les deux
 * champs sont vides, l'option ne s'affiche jamais côté client (pour ne
 * jamais montrer un moyen de paiement qui ne fonctionne pas vraiment).
 */
export const MOBILE_MONEY_CONFIG = {
  orangeMoneyNumber: '', // Ex: '+226 70 00 00 00'
  moovMoneyNumber: '', // Ex: '+226 60 00 00 00'
};

export const isMobileMoneyEnabled =
  !!MOBILE_MONEY_CONFIG.orangeMoneyNumber || !!MOBILE_MONEY_CONFIG.moovMoneyNumber;
