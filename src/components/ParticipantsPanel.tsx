import React, { useMemo, useState } from 'react';
import { Users, Info, Search } from 'lucide-react';
import { Order } from '../types';

interface ParticipantsPanelProps {
  orders: Order[];
}

/**
 * TODO(backend): une fois les comptes participants (financement) créés, cette vue devra
 * afficher : profil, nombre d'opérations, montant engagé, résultats, historique, statut
 * du compte — voir plan d'étapes. En attendant, on affiche les vrais clients de la
 * boutique (agrégés depuis les commandes), qui est la seule base de "participants" réelle
 * disponible aujourd'hui.
 */
export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({ orders }) => {
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; ordersCount: number; totalSpentFcfa: number; lastOrderAt: string }>();
    for (const o of orders) {
      const key = o.phone || o.customerName;
      const existing = map.get(key);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalSpentFcfa += o.totalFcfa || 0;
        if (o.createdAt > existing.lastOrderAt) existing.lastOrderAt = o.createdAt;
      } else {
        map.set(key, {
          name: o.customerName,
          phone: o.phone,
          ordersCount: 1,
          totalSpentFcfa: o.totalFcfa || 0,
          lastOrderAt: o.createdAt,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalSpentFcfa - a.totalSpentFcfa);
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Vue basée sur les clients réels de la boutique (issus des commandes). Les comptes participants
          d'investissement (montant engagé, résultats, statut) s'ajouteront une fois le backend financement créé.
        </p>
      </div>

      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <Users className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucun client pour le moment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Nom</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Téléphone</th>
                <th className="text-right px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Commandes</th>
                <th className="text-right px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Total dépensé</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Dernière commande</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.phone + c.name} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{c.phone}</td>
                  <td className="px-4 py-2.5 text-right">{c.ordersCount}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">{c.totalSpentFcfa.toLocaleString('fr-FR')} FCFA</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(c.lastOrderAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
