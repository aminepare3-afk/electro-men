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

export const AuditPanel: React.FC = () => {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog()
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">Journal d'audit — lecture seule</h3>
          <p className="text-xs text-amber-800/90">
            Chaque action sensible (créer, modifier, approuver un retrait, etc.) sera enregistrée automatiquement
            côté serveur ici, une fois le backend branché. Vide pour l'instant car aucune écriture serveur n'existe encore.
          </p>
        </div>
      </div>

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
