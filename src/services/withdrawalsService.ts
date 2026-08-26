import { WithdrawalRequest } from '../types';

/**
 * Connecté au backend réel (table `withdrawals`). Toute décision (confirmer/rejeter)
 * passe par le backend, qui écrit l'entrée du grand livre uniquement à la confirmation.
 */

function mapFromApi(row: any): WithdrawalRequest {
  return {
    id: row.id,
    participantName: row.participant_profiles?.full_name || '—',
    amountFcfa: row.amount_fcfa,
    method: row.method,
    requestedAt: row.requested_at,
    status: row.status,
  };
}

export async function getWithdrawalRequests(adminPassword: string): Promise<WithdrawalRequest[]> {
  const res = await fetch('/api/admin/withdrawals', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des retraits.');
  return (json.data || []).map(mapFromApi);
}

export async function reviewWithdrawal(adminPassword: string, id: string, decision: 'confirm' | 'reject'): Promise<void> {
  const res = await fetch(`/api/admin/withdrawals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ decision }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur lors du traitement.');
}
