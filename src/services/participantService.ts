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

export async function getCurrentParticipantWallet(token: string): Promise<ParticipantWallet | null> {
  const res = await fetch('/api/investor/wallet', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement du portefeuille.');
  return {
    availableBalanceFcfa: json.data.availableBalanceFcfa,
    engagedAmountFcfa: json.data.engagedAmountFcfa,
    totalProfitFcfa: json.data.totalProfitFcfa,
    totalLossFcfa: json.data.totalLossFcfa,
  };
}

export async function getMyParticipations(token: string): Promise<Participation[]> {
  const res = await fetch('/api/investor/participations', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement de vos participations.');
  return (json.data || []).map(mapParticipation);
}

export async function getMyTransactions(token: string): Promise<LedgerEntry[]> {
  const res = await fetch('/api/investor/transactions', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des transactions.');
  return (json.data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    participantName: '',
    operationReference: row.operation_id || undefined,
    amountFcfa: row.amount_fcfa,
    date: row.created_at,
    reference: row.reference,
  }));
}

export async function getMyWithdrawals(token: string): Promise<WithdrawalRequest[]> {
  const res = await fetch('/api/investor/withdrawals', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des retraits.');
  return (json.data || []).map((row: any) => ({
    id: row.id,
    participantName: '',
    amountFcfa: row.amount_fcfa,
    method: row.method,
    requestedAt: row.requested_at,
    status: row.status,
  }));
}

export async function requestWithdrawal(token: string, amountFcfa: number, method: string): Promise<void> {
  const res = await fetch('/api/investor/withdrawals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ amountFcfa, method }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur lors de la demande de retrait.');
}
