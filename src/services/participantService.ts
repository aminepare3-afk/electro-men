import { Participation, ParticipantWallet, WithdrawalRequest, LedgerEntry, Operation } from '../types';

/**
 * Connecté au backend réel (Supabase Auth + tables operations/participations).
 * Le solde/wallet reste TODO tant qu'il n'y a pas encore d'écriture de dépôt/retrait
 * suffisante pour le calculer de façon fiable — voir plan d'étapes.
 */

function mapOperation(row: any): Operation {
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    description: row.description || undefined,
    targetAmountFcfa: row.target_amount_fcfa,
    collectedAmountFcfa: Number(row.collected_amount_fcfa) || 0,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    participantsCount: Number(row.participants_count) || 0,
    createdAt: row.created_at,
  };
}

function mapParticipation(row: any): Participation {
  return {
    id: row.id,
    operationReference: row.operations?.reference || '',
    operationTitle: row.operations?.title || '',
    amountFcfa: row.amount_fcfa,
    date: row.created_at,
    status: row.status,
    resultFcfa: row.result_fcfa ?? undefined,
    paymentMethod: row.payment_method || undefined,
    paymentReference: row.payment_reference || undefined,
  };
}

export async function getOpenOperations(): Promise<Operation[]> {
  const res = await fetch('/api/investor/operations');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des opérations.');
  return (json.data || []).map(mapOperation);
}

export async function participateInOperation(
  token: string,
  input: { operationId: string; amountFcfa: number; paymentMethod: string; paymentReference?: string }
): Promise<void> {
  const res = await fetch('/api/investor/participate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur lors de la demande de participation.');
}

export async function getCurrentParticipantWallet(): Promise<ParticipantWallet | null> {
  // TODO(backend): calcul fiable du solde une fois les dépôts/retraits réels en place
  return null;
}

export async function getMyParticipations(token: string): Promise<Participation[]> {
  const res = await fetch('/api/investor/participations', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement de vos participations.');
  return (json.data || []).map(mapParticipation);
}

export async function getMyTransactions(): Promise<LedgerEntry[]> {
  // TODO(backend): GET /api/investor/transactions
  return [];
}

export async function getMyWithdrawals(): Promise<WithdrawalRequest[]> {
  // TODO(backend): GET /api/investor/withdrawals
  return [];
}

export async function requestWithdrawal(_amountFcfa: number, _method: string): Promise<void> {
  // TODO(backend): POST /api/investor/withdrawals — le frontend ne valide jamais lui-même
  // qu'un solde est suffisant ; c'est une vérification strictement serveur.
  throw new Error('Retraits pas encore disponibles : le calcul du solde réel n\'est pas encore branché.');
}
