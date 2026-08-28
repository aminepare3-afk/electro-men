export interface CommunityPost {
  id: string;
  authorName: string;
  authorRole: 'admin' | 'participant';
  postType: 'announcement' | 'discussion';
  content: string;
  createdAt: string;
}

function mapPost(row: any): CommunityPost {
  return {
    id: row.id,
    authorName: row.author_name,
    authorRole: row.author_role,
    postType: row.post_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** authHeader: soit { Authorization: 'Bearer <token>' } (participant), soit { 'x-admin-password': '...' } (admin). */
export async function getCommunityPosts(authHeaders: Record<string, string>): Promise<CommunityPost[]> {
  const res = await fetch('/api/community/posts', { headers: authHeaders });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de chargement des messages.');
  return (json.data || []).map(mapPost);
}

export async function postCommunityMessage(authHeaders: Record<string, string>, content: string): Promise<void> {
  const res = await fetch('/api/community/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ content }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Erreur lors de l'envoi du message.");
}

export async function deleteCommunityPost(adminPassword: string, id: string): Promise<void> {
  const res = await fetch(`/api/admin/community/posts/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erreur de suppression.');
}
