import { Distribution } from '../types';

/**
 * TODO(backend): GET/POST /api/distributions, connecté à Supabase.
 * Une distribution doit être calculée côté serveur à partir du résultat réel d'une
 * opération close (ventes - coûts d'importation) et de la répartition réelle des
 * participations. Volontairement aucun stockage local ici — voir withdrawalsService.ts
 * pour la même logique appliquée aux retraits.
 */
export async function getDistributions(): Promise<Distribution[]> {
  // TODO(backend): remplacer par un vrai appel API une fois le ledger et les
  // participations réelles branchés
  return [];
}

export async function prepareDistribution(_operationId: string): Promise<Distribution> {
  throw new Error('Backend distributions non encore branché.');
}

export async function confirmDistribution(_id: string): Promise<void> {
  throw new Error('Backend distributions non encore branché.');
}
