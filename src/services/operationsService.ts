import { Operation, OperationStatus } from '../types';

/**
 * Connecté au backend réel (table `operations` + `participations` via la vue
 * `operations_with_stats`). L'écriture nécessite le mot de passe admin, comme le
 * reste de l'admin actuel — voir migration vers de vrais comptes admin dans le plan.
 */

function mapFromApi(row: any): Operation {
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
    productCategory: row.product_category || undefined,
    estimatedQuantity: row.estimated_quantity ?? undefined,
    resaleChannel: row.resale_channel || undefined,
    riskNotes: row.risk_notes || undefined,
    estimatedDurationDays: row.estimated_duration_days ?? undefined,
  };
}

export async function getOperations(): Promise<Operation[]> {
  const res = await fetch('/api/operations');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des opérations.');
  return (json.data || []).map(mapFromApi);
}

export async function createOperation(
  adminPassword: string,
  input: {
    title: string;
    description?: string;
    targetAmountFcfa: number;
    startDate: string;
    endDate?: string;
    productCategory?: string;
    estimatedQuantity?: number;
    resaleChannel?: string;
    riskNotes?: string;
    estimatedDurationDays?: number;
  }
): Promise<Operation> {
  const res = await fetch('/api/operations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Erreur de création de l'opération.");
  return mapFromApi(json.data);
}

export async function updateOperationStatus(adminPassword: string, id: string, status: OperationStatus): Promise<void> {
  const res = await fetch(`/api/operations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de mise à jour du statut.');
}

export async function deleteOperation(adminPassword: string, id: string): Promise<void> {
  const res = await fetch(`/api/operations/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de suppression.');
}
