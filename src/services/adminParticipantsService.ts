import { Participation } from '../types';

interface ParticipantProfileRow {
  id: string;
  full_name: string;
  phone?: string;
  status: string;
  created_at: string;
}

export async function getAdminParticipants(adminPassword: string): Promise<ParticipantProfileRow[]> {
  const res = await fetch('/api/admin/participants', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des participants.');
  return json.data || [];
}

export async function getAdminParticipations(adminPassword: string): Promise<(Participation & { id: string })[]> {
  const res = await fetch('/api/admin/participations', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des participations.');
  return (json.data || []).map((row: any) => ({
    id: row.id,
    operationReference: row.operations?.reference || '',
    operationTitle: row.operations?.title || '',
    amountFcfa: row.amount_fcfa,
    date: row.created_at,
    status: row.status,
    resultFcfa: row.result_fcfa ?? undefined,
    paymentMethod: row.payment_method || undefined,
    paymentReference: row.payment_reference || undefined,
    participantName: row.participant_profiles?.full_name || '—',
  }));
}

export async function reviewParticipation(adminPassword: string, id: string, decision: 'confirm' | 'reject'): Promise<void> {
  const res = await fetch(`/api/admin/participations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ decision }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur lors du traitement.');
}
