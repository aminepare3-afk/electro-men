import { Operation, OperationStatus } from '../types';

/**
 * TODO(backend): remplacer entièrement ce fichier par des appels à une vraie API
 * (`/api/operations`) connectée à une table Supabase `operations`, avec :
 *  - authentification par compte (pas le mot de passe admin partagé actuel) ;
 *  - `collectedAmountFcfa` et `participantsCount` calculés côté serveur à partir
 *    de la table `participations`, jamais saisis manuellement ;
 *  - journalisation de chaque création/modification dans `audit_log`.
 *
 * En attendant, les opérations créées ici sont un brouillon de travail stocké
 * dans le navigateur de l'admin (localStorage) — ce ne sont PAS des fonds
 * réellement collectés. L'UI doit toujours le préciser à l'utilisateur.
 */

const STORAGE_KEY = 'electro-men-operations-draft-v1';

function readAll(): Operation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Operation[]) : [];
  } catch {
    return [];
  }
}

function writeAll(ops: Operation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

function generateReference(existing: Operation[]): string {
  const year = new Date().getFullYear();
  const seq = existing.length + 1;
  const code = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `OP-${year}-${String(seq).padStart(2, '0')}${code}`;
}

export async function getOperations(): Promise<Operation[]> {
  // TODO(backend): GET /api/operations
  return readAll().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createOperation(input: {
  title: string;
  description?: string;
  targetAmountFcfa: number;
  startDate: string;
  endDate?: string;
}): Promise<Operation> {
  // TODO(backend): POST /api/operations (vérification des permissions côté serveur)
  const all = readAll();
  const op: Operation = {
    id: crypto.randomUUID(),
    reference: generateReference(all),
    title: input.title,
    description: input.description,
    targetAmountFcfa: input.targetAmountFcfa,
    collectedAmountFcfa: 0,
    status: 'open',
    startDate: input.startDate,
    endDate: input.endDate,
    participantsCount: 0,
    createdAt: new Date().toISOString(),
  };
  writeAll([...all, op]);
  return op;
}

export async function updateOperationStatus(id: string, status: OperationStatus): Promise<void> {
  // TODO(backend): PATCH /api/operations/:id (+ entrée audit_log)
  const all = readAll();
  writeAll(all.map((o) => (o.id === id ? { ...o, status } : o)));
}

export async function deleteOperation(id: string): Promise<void> {
  // TODO(backend): DELETE /api/operations/:id (réservé, avec confirmation + audit)
  writeAll(readAll().filter((o) => o.id !== id));
}
