import { ImportOrder, ImportOrderStatus } from '../types';

/**
 * TODO(backend): remplacer par des appels à `/api/import-orders` connectés à Supabase.
 * La réception (statut `received`) doit, côté serveur, incrémenter le stock réel du produit
 * concerné et journaliser l'opération dans `audit_log` — jamais fait uniquement côté client.
 * En attendant, ces commandes d'importation sont un brouillon local (navigateur admin).
 */

const STORAGE_KEY = 'electro-men-import-orders-draft-v1';

function readAll(): ImportOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ImportOrder[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: ImportOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateReference(existing: ImportOrder[]): string {
  const year = new Date().getFullYear();
  const seq = existing.length + 1;
  const code = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `IMP-${year}-${String(seq).padStart(2, '0')}${code}`;
}

export async function getImportOrders(): Promise<ImportOrder[]> {
  // TODO(backend): GET /api/import-orders
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createImportOrder(input: {
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
}): Promise<ImportOrder> {
  // TODO(backend): POST /api/import-orders
  const all = readAll();
  const item: ImportOrder = {
    id: crypto.randomUUID(),
    reference: generateReference(all),
    status: 'draft',
    createdAt: new Date().toISOString(),
    ...input,
  };
  writeAll([...all, item]);
  return item;
}

export async function updateImportOrderStatus(id: string, status: ImportOrderStatus): Promise<void> {
  // TODO(backend): PATCH /api/import-orders/:id
  // TODO(backend): quand status passe à 'received', incrémenter le stock produit côté serveur + audit_log
  const all = readAll();
  writeAll(
    all.map((o) =>
      o.id === id
        ? { ...o, status, receivedDate: status === 'received' ? new Date().toISOString() : o.receivedDate }
        : o
    )
  );
}

export async function deleteImportOrder(id: string): Promise<void> {
  // TODO(backend): DELETE /api/import-orders/:id (réservé, avec confirmation + audit)
  writeAll(readAll().filter((o) => o.id !== id));
}
