export type AdminRole = 'owner' | 'admin' | 'manager' | 'employee';

export interface AdminAccount {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

export async function getAdminAccounts(adminPassword: string): Promise<AdminAccount[]> {
  const res = await fetch('/api/admin/accounts', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des comptes.');
  return json.data || [];
}

export async function createAdminAccount(
  adminPassword: string,
  input: { email: string; password: string; role: AdminRole }
): Promise<void> {
  const res = await fetch('/api/admin/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de création du compte.');
}

export async function deleteAdminAccount(adminPassword: string, id: string): Promise<void> {
  const res = await fetch(`/api/admin/accounts/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de suppression.');
}

export async function bootstrapOwnerAccount(
  adminPassword: string,
  email: string,
  password: string
): Promise<void> {
  const res = await fetch('/api/admin/accounts/bootstrap-owner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPassword, email, password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de création du compte owner.');
}
