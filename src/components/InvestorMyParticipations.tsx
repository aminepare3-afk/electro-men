import React, { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { Participation } from '../types';
import { getMyParticipations } from '../services/participantService';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente de confirmation',
  active: 'Active',
  closed: 'Clôturée',
  cancelled: 'Annulée',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  active: 'bg-emerald-50 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-50 text-red-700',
};

export const InvestorMyParticipations: React.FC<{ token: string }> = ({ token }) => {
  const [items, setItems] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyParticipations(token)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>;

  if (items.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
        <Landmark className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Aucune participation pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Opération</th>
            <th className="text-right px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Montant</th>
            <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Date</th>
            <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Statut</th>
            <th className="text-right px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Résultat</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5">
                <div className="font-medium text-slate-900">{p.operationTitle}</div>
                <div className="text-xs font-mono text-slate-400">{p.operationReference}</div>
              </td>
              <td className="px-4 py-2.5 text-right font-bold text-slate-900">{p.amountFcfa.toLocaleString('fr-FR')} FCFA</td>
              <td className="px-4 py-2.5 text-slate-500">{new Date(p.date).toLocaleDateString('fr-FR')}</td>
              <td className="px-4 py-2.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${STATUS_STYLES[p.status]}`}>
                  {STATUS_LABELS[p.status]}
                </span>
              </td>
              <td className={`px-4 py-2.5 text-right font-bold ${p.resultFcfa === undefined ? 'text-slate-400' : p.resultFcfa >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {p.resultFcfa === undefined ? '—' : `${p.resultFcfa >= 0 ? '+' : ''}${p.resultFcfa.toLocaleString('fr-FR')} FCFA`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
