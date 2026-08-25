import React, { useEffect, useState } from 'react';
import { Landmark, ShieldAlert } from 'lucide-react';
import { WithdrawalRequest } from '../types';
import { getWithdrawalRequests } from '../services/withdrawalsService';

const STATUS_LABELS: Record<WithdrawalRequest['status'], string> = {
  pending: 'En attente',
  processing: 'En traitement',
  approved: 'Approuvé',
  rejected: 'Refusé',
  completed: 'Terminé',
};

export const WithdrawalsPanel: React.FC = () => {
  const [items, setItems] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWithdrawalRequests()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">Module en attente du backend financement</h3>
          <p className="text-xs text-amber-800/90">
            Les retraits représentent de l'argent réel dû à des participants réels. Cette liste restera vide tant
            que les comptes participants, les wallets et les policies de sécurité côté serveur ne sont pas en
            place — aucune demande fictive n'est affichée ici, par principe.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <Landmark className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune demande de retrait.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <div key={it.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">{it.participantName}</p>
                <p className="text-xs text-slate-500">{it.method} · {new Date(it.requestedAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{it.amountFcfa.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-xs text-slate-500">{STATUS_LABELS[it.status]}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
