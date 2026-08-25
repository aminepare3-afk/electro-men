import { WithdrawalRequest } from '../types';

/**
 * TODO(backend): GET/PATCH /api/withdrawals, connecté à Supabase (table `withdrawals`
 * + `wallets`). Toute validation de solde ou de statut doit être faite côté serveur.
 *
 * Contrairement aux modules Opérations/Importations, il n'existe volontairement PAS
 * de stockage local de brouillon ici : un retrait représente de l'argent réel dû à un
 * participant réel, donc sans compte participant ni wallet en base, il n'y a rien de
 * légitime à afficher — la liste reste vide jusqu'au branchement du backend.
 */
export async function getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  // TODO(backend): remplacer par un vrai appel API une fois les comptes participants créés
  return [];
}

export async function approveWithdrawal(_id: string): Promise<void> {
  throw new Error('Backend retraits non encore branché.');
}

export async function rejectWithdrawal(_id: string): Promise<void> {
  throw new Error('Backend retraits non encore branché.');
}
