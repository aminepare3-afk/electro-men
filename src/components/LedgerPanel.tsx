import React, { useEffect, useState, useMemo } from 'react';
import { BookOpen, ShieldAlert, Search } from 'lucide-react';
import { LedgerEntry, LedgerEntryType } from '../types';
import { getLedgerEntries } from '../services/ledgerService';

const TYPE_LABELS: Record<LedgerEntryType, string> = {
  deposit: 'Dépôt',
  participation: 'Participation',
  profit: 'Bénéfice',
  loss: 'Perte',
  refund: 'Remboursement',
  withdrawal: 'Retrait',
  adjustment: 'Ajustement',
};

export const LedgerPanel: React.FC<{ adminPassword: string }> = ({ adminPassword }) => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLedgerEntries(adminPassword)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.participantName.toLowerCase().includes(q) || e.reference.toLowerCase().includes(q)
    );
  }, [entries, search]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Grand livre</h2>
        <p className="text-sm text-slate-500">
          L'historique complet de tous les mouvements d'argent des investisseurs (participations, bénéfices,
          pertes, retraits). Uniquement pour consulter — rien ne peut être modifié ou supprimé ici.
        </p>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}

      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un participant, une référence..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
        />
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <BookOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune écriture pour le moment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Date</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Type</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Participant</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Référence</th>
                <th className="text-right px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5">{TYPE_LABELS[e.type]}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{e.participantName}</td>
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
      )}
    </div>
  );
};
