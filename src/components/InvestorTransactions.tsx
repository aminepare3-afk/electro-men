import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { LedgerEntry } from '../types';
import { getMyTransactions } from '../services/participantService';

const TYPE_LABELS: Record<string, string> = {
  deposit: 'Dépôt',
  participation: 'Participation',
  profit: 'Bénéfice',
  loss: 'Perte',
  refund: 'Remboursement',
  withdrawal: 'Retrait',
  adjustment: 'Ajustement',
};

export const InvestorTransactions: React.FC<{ token: string }> = ({ token }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTransactions(token)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>;

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
        <History className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Aucune transaction pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Date</th>
            <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Type</th>
            <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Référence</th>
            <th className="text-right px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Montant</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 text-slate-500">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
              <td className="px-4 py-2.5">{TYPE_LABELS[e.type] || e.type}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{e.reference}</td>
              <td className={`px-4 py-2.5 text-right font-bold ${e.amountFcfa >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {e.amountFcfa >= 0 ? '+' : ''}
                {e.amountFcfa.toLocaleString('fr-FR')} FCFA
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
