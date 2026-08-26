import { ImportOrder, ImportOrderStatus } from '../types';

/**
 * Connecté au backend réel (table `import_orders`). L'écriture nécessite le mot de
 * passe admin, comme le reste de l'admin actuel.
 */

function mapFromApi(row: any): ImportOrder {
  return {
    id: row.id,
    reference: row.reference,
    operationId: row.operation_id || undefined,
    supplierName: row.supplier_name,
    productDescription: row.product_description,
    quantity: row.quantity,
    purchasePriceFcfa: row.purchase_price_fcfa,
    transportFeeFcfa: row.transport_fee_fcfa,
    customsFeeFcfa: row.customs_fee_fcfa,
    taxFeeFcfa: row.tax_fee_fcfa,
    otherFeesFcfa: row.other_fees_fcfa,
    status: row.status,
    orderDate: row.order_date,
    expectedReceptionDate: row.expected_reception_date || undefined,
    receivedDate: row.received_date || undefined,
    createdAt: row.created_at,
  };
}

export async function getImportOrders(): Promise<ImportOrder[]> {
  const res = await fetch('/api/import-orders');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des importations.');
  return (json.data || []).map(mapFromApi);
}

export async function createImportOrder(
  adminPassword: string,
  input: {
    operationId?: string;
    supplierName: string;
    productDescription: string;
    quantity: number;
    purchasePriceFcfa: number;
    transportFeeFcfa: number;
    customsFeeFcfa: number;
    taxFeeFcfa: number;
    otherFeesFcfa: number;
    orderDate: string;
    expectedReceptionDate?: string;
  }
): Promise<ImportOrder> {
  const res = await fetch('/api/import-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de création de la commande.');
  return mapFromApi(json.data);
}

export async function updateImportOrderStatus(adminPassword: string, id: string, status: ImportOrderStatus): Promise<void> {
  const res = await fetch(`/api/import-orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de mise à jour du statut.');
}

export async function deleteImportOrder(adminPassword: string, id: string): Promise<void> {
  const res = await fetch(`/api/import-orders/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de suppression.');
}
