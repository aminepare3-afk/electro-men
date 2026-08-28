import React, { useEffect, useState } from 'react';
import { Megaphone, MessageCircle, Send, Trash2 } from 'lucide-react';
import { CommunityPost, getCommunityPosts, postCommunityMessage, deleteCommunityPost } from '../services/communityService';

interface CommunityFeedProps {
  /** En-têtes d'authentification à envoyer (Bearer participant OU x-admin-password). */
  authHeaders: Record<string, string>;
  /** Si fourni, active le bouton de suppression (réservé à l'admin). */
  adminPassword?: string;
  /** Texte du placeholder du champ de saisie. */
  placeholder?: string;
}

export const CommunityFeed: React.FC<CommunityFeedProps> = ({ authHeaders, adminPassword, placeholder }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getCommunityPosts(authHeaders)
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      await postCommunityMessage(authHeaders, content.trim());
      setContent('');
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!adminPassword) return;
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await deleteCommunityPost(adminPassword, id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSend} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={placeholder || 'Écris un message...'}
          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 resize-none"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={sending || !content.trim()}
          className="self-end flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-mono text-xs uppercase font-bold py-2 px-4 rounded-xl transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Envoi…' : 'Publier'}
        </button>
      </form>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl">
          <MessageCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucun message pour le moment. Sois le premier à écrire !</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl p-4 border ${
                p.postType === 'announcement' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  {p.postType === 'announcement' ? (
                    <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <MessageCircle className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className="text-xs font-bold text-slate-900">{p.authorName}</span>
                  {p.postType === 'announcement' && (
                    <span className="text-[9px] font-mono uppercase font-bold bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full">
                      Communiqué
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleString('fr-FR')}</span>
                  {adminPassword && (
                    <button onClick={() => handleDelete(p.id)} className="text-slate-300 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
