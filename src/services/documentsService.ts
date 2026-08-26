export interface DocumentRow {
  id: string;
  label: string;
  operationTitle?: string;
  operationReference?: string;
  participantName?: string;
  signedUrl: string | null;
  createdAt: string;
}

function mapDoc(row: any): DocumentRow {
  return {
    id: row.id,
    label: row.label,
    operationTitle: row.operations?.title,
    operationReference: row.operations?.reference,
    participantName: row.participant_profiles?.full_name,
    signedUrl: row.signed_url,
    createdAt: row.created_at,
  };
}

export async function getAdminDocuments(adminPassword: string): Promise<DocumentRow[]> {
  const res = await fetch('/api/admin/documents', { headers: { 'x-admin-password': adminPassword } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des documents.');
  return (json.data || []).map(mapDoc);
}

export async function uploadAdminDocument(
  adminPassword: string,
  input: { label: string; fileBase64: string; fileName: string; operationId?: string; importOrderId?: string; participantId?: string }
): Promise<void> {
  const res = await fetch('/api/admin/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Erreur lors de l'envoi du document.");
}

export async function deleteAdminDocument(adminPassword: string, id: string): Promise<void> {
  const res = await fetch(`/api/admin/documents/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de suppression.');
}

export async function getMyDocuments(token: string): Promise<DocumentRow[]> {
  const res = await fetch('/api/investor/documents', { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement de vos documents.');
  return (json.data || []).map(mapDoc);
}
