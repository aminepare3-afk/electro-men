import React, { useEffect, useState } from 'react';
import { History, ShieldAlert } from 'lucide-react';
import { AuditLogEntry, AuditActionType } from '../types';
import { getAuditLog } from '../services/auditService';

const ACTION_LABELS: Record<AuditActionType, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  approve: 'Approbation',
  reject: 'Refus',
  login: 'Connexion',
};

export const AuditPanel: React.FC<{ adminPassword: string }> = ({ adminPassword }) => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuditLog(adminPassword)
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Journal d'audit</h2>
        <p className="text-sm text-slate-500">
          L'historique de toutes les actions importantes (créer, modifier, confirmer un retrait...) faites sur le
          site — utile pour retrouver qui a fait quoi en cas de doute. Lecture seule, rien n'est modifiable ici.
        </p>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <History className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune entrée d'audit.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Date</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Utilisateur</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Action</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Ressource</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Avant → Après</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-500">{new Date(e.date).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{e.actorName}</td>
                  <td className="px-4 py-2.5">{ACTION_LABELS[e.action]}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{e.resource}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">
                    {e.previousValue || '—'} → {e.newValue || '—'}
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
