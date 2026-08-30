import { AuditLogEntry } from '../types';

/** Connecté au backend réel (table `audit_log`, écrite automatiquement par le serveur). */
export async function getAuditLog(adminPassword: string): Promise<AuditLogEntry[]> {
  const res = await fetch('/api/admin/audit-log', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement du journal.');
  return (json.data || []).map((row: any) => ({
    id: row.id,
    actorName: row.actor_name,
    action: row.action,
    resource: row.resource,
    date: row.created_at,
    previousValue: row.previous_value || undefined,
    newValue: row.new_value || undefined,
  }));
}
