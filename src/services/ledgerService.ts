import { LedgerEntry } from '../types';

/**
 * TODO(backend): GET /api/ledger, table `ledger_entries` append-only.
 * Aucune écriture de correction/suppression n'est exposée ici volontairement : toute
 * correction doit passer par un mécanisme d'ajustement audité côté serveur (voir types.ts).
 */
export async function getLedgerEntries(): Promise<LedgerEntry[]> {
  // TODO(backend): remplacer par un vrai appel API une fois le ledger branché
  return [];
}
