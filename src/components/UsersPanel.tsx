import React, { useEffect, useState } from 'react';
import { UserCog, CheckCircle2, XCircle } from 'lucide-react';
import { getAdminParticipants, getAdminParticipations, reviewParticipation } from '../services/adminParticipantsService';
import { Participation } from '../types';

interface UsersPanelProps {
  adminPassword: string;
}

interface ParticipantRow {
  id: string;
  full_name: string;
  phone?: string;
  status: string;
  created_at: string;
}

export const UsersPanel: React.FC<UsersPanelProps> = ({ adminPassword }) => {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [participations, setParticipations] = useState<(Participation & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, part] = await Promise.all([
        getAdminParticipants(adminPassword),
        getAdminParticipations(adminPassword),
      ]);
      setParticipants(p);
      setParticipations(part);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = participations.filter((p) => p.status === 'pending');

  const handleReview = async (id: string, decision: 'confirm' | 'reject') => {
    setProcessingId(id);
    try {
      await reviewParticipation(adminPassword, id, decision);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Comptes Investisseurs</h2>
        <p className="text-sm text-slate-500">
          Les personnes inscrites sur l'espace investisseur (/investor) pour financer tes opérations
          d'importation. Confirme leurs demandes de participation ici après avoir vérifié le paiement.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>
      )}

      {/* File d'attente de participations à confirmer */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Demandes à traiter {pending.length > 0 && `(${pending.length})`}
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Confirme uniquement après avoir vérifié la réception réelle du paiement (référence mobile money, etc.).
        </p>
        {pending.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-300 rounded-xl">
            <p className="text-sm text-slate-500">Aucune demande en attente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((p) => (
              <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{p.participantName}</p>
                  <p className="text-xs text-slate-500">{p.operationTitle} ({p.operationReference})</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    {p.paymentMethod} {p.paymentReference && `· réf. ${p.paymentReference}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{p.amountFcfa.toLocaleString('fr-FR')} FCFA</span>
                  <button
                    onClick={() => handleReview(p.id, 'confirm')}
                    disabled={processingId === p.id}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-mono uppercase font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmer
                  </button>
                  <button
                    onClick={() => handleReview(p.id, 'reject')}
                    disabled={processingId === p.id}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 text-slate-600 text-xs font-mono uppercase font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Liste des comptes investisseurs */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Tous les comptes ({participants.length})</h3>
        {participants.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl">
            <UserCog className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aucun compte investisseur pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Nom</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Téléphone</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Statut</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{p.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.status}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
