import React, { useEffect, useState } from 'react';
import { Landmark, CheckCircle2, XCircle } from 'lucide-react';
import { WithdrawalRequest } from '../types';
import { getWithdrawalRequests, reviewWithdrawal } from '../services/withdrawalsService';

interface WithdrawalsPanelProps {
  adminPassword: string;
}

const STATUS_LABELS: Record<WithdrawalRequest['status'], string> = {
  pending: 'En attente',
  processing: 'En traitement',
  approved: 'Approuvé',
  rejected: 'Refusé',
  completed: 'Terminé',
};

const STATUS_STYLES: Record<WithdrawalRequest['status'], string> = {
  pending: 'bg-amber-50 text-amber-800',
  processing: 'bg-cyan-50 text-cyan-800',
  approved: 'bg-cyan-50 text-cyan-800',
  rejected: 'bg-red-50 text-red-700',
  completed: 'bg-emerald-50 text-emerald-800',
};

export const WithdrawalsPanel: React.FC<WithdrawalsPanelProps> = ({ adminPassword }) => {
  const [items, setItems] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getWithdrawalRequests(adminPassword)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReview = async (id: string, decision: 'confirm' | 'reject') => {
    setProcessingId(id);
    try {
      await reviewWithdrawal(adminPassword, id, decision);
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const pending = items.filter((w) => w.status === 'pending');
  const processed = items.filter((w) => w.status !== 'pending');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Retraits investisseurs</h2>
        <p className="text-sm text-slate-500">
          Un investisseur a demandé à retirer de l'argent de son solde disponible. Confirme uniquement <strong>après</strong> avoir
          réellement envoyé l'argent (mobile money, espèces...) — sinon refuse.
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}

      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          En attente de traitement {pending.length > 0 && `(${pending.length})`}
        </h3>
        {loading ? (
          <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
        ) : pending.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-300 rounded-xl">
            <Landmark className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aucune demande en attente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((w) => (
              <div key={w.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{w.participantName}</p>
                  <p className="text-xs text-slate-500">{w.method} · {new Date(w.requestedAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{w.amountFcfa.toLocaleString('fr-FR')} FCFA</span>
                  <button
                    onClick={() => handleReview(w.id, 'confirm')}
                    disabled={processingId === w.id}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-mono uppercase font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmer
                  </button>
                  <button
                    onClick={() => handleReview(w.id, 'reject')}
                    disabled={processingId === w.id}
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

      {processed.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Historique</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Participant</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Méthode</th>
                  <th className="text-right px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Montant</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processed.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{w.participantName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{w.method}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">{w.amountFcfa.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${STATUS_STYLES[w.status]}`}>
                        {STATUS_LABELS[w.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
