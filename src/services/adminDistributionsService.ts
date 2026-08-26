export interface DistributionRow {
  id: string;
  operationReference: string;
  operationTitle: string;
  totalAmountFcfa: number;
  status: 'draft' | 'validated' | 'confirmed';
  linesCount: number;
  createdAt: string;
}

export interface DistributionLine {
  id: string;
  participantName: string;
  amountFcfa: number;
}

export interface DistributionDetail extends DistributionRow {
  lines: DistributionLine[];
}

export async function getDistributions(adminPassword: string): Promise<DistributionRow[]> {
  const res = await fetch('/api/admin/distributions', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des distributions.');
  return (json.data || []).map((row: any) => ({
    id: row.id,
    operationReference: row.operations?.reference || '',
    operationTitle: row.operations?.title || '',
    totalAmountFcfa: row.total_amount_fcfa,
    status: row.status,
    linesCount: (row.distribution_lines || []).length,
    createdAt: row.created_at,
  }));
}

export async function getDistributionDetail(adminPassword: string, id: string): Promise<DistributionDetail> {
  const res = await fetch(`/api/admin/distributions/${id}`, { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement.');
  const row = json.data;
  return {
    id: row.id,
    operationReference: row.operations?.reference || '',
    operationTitle: row.operations?.title || '',
    totalAmountFcfa: row.total_amount_fcfa,
    status: row.status,
    linesCount: (row.lines || []).length,
    createdAt: row.created_at,
    lines: (row.lines || []).map((l: any) => ({
      id: l.id,
      participantName: l.participant_profiles?.full_name || '—',
      amountFcfa: l.amount_fcfa,
    })),
  };
}

export async function createDistribution(adminPassword: string, operationId: string, totalResultFcfa: number): Promise<void> {
  const res = await fetch('/api/admin/distributions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ operationId, totalResultFcfa }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de préparation de la distribution.');
}

export async function distributionAction(
  adminPassword: string,
  id: string,
  action: 'validate' | 'confirm' | 'cancel'
): Promise<void> {
  const res = await fetch(`/api/admin/distributions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ action }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur lors du traitement.');
}
