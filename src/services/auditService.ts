import { AuditLogEntry } from '../types';

/**
 * TODO(backend): GET /api/audit-log, écrit automatiquement côté serveur — jamais
 * modifiable ni supprimable depuis le frontend, même par un admin.
 */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  // TODO(backend): remplacer par un vrai appel API une fois l'audit trail branché
  return [];
}
