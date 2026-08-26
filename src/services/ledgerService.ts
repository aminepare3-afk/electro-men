import { LedgerEntry } from '../types';

/** Connecté au backend réel (table `ledger_entries`, append-only). */
export async function getLedgerEntries(adminPassword: string): Promise<LedgerEntry[]> {
  const res = await fetch('/api/admin/ledger', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement du grand livre.');
  return (json.data || []).map((row: any) => ({
    id: row.id,
    type: row.type,
    participantName: row.participant_profiles?.full_name || '—',
    operationReference: row.operation_id || undefined,
    amountFcfa: row.amount_fcfa,
    date: row.created_at,
    reference: row.reference,
  }));
}
