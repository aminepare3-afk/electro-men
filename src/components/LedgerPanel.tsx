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

export const LedgerPanel: React.FC = () => {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getLedgerEntries()
      .then(setEntries)
      .finally(() => setLoading(false));
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
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">Grand livre — lecture seule</h3>
          <p className="text-xs text-amber-800/90">
            Les écritures financières ne peuvent pas être supprimées depuis cette interface. Toute correction
            passera par un mécanisme d'ajustement audité, une fois le backend ledger branché. Vide pour l'instant.
          </p>
        </div>
      </div>

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
