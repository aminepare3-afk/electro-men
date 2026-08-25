import React, { useEffect, useState } from 'react';
import { TrendingUp, ShieldAlert } from 'lucide-react';
import { Distribution } from '../types';
import { getDistributions } from '../services/distributionsService';

const STATUS_LABELS: Record<Distribution['status'], string> = {
  draft: 'Brouillon',
  validated: 'Validée',
  confirmed: 'Confirmée',
};

export const DistributionsPanel: React.FC = () => {
  const [items, setItems] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDistributions()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">Module en attente du backend ledger</h3>
          <p className="text-xs text-amber-800/90">
            Une distribution répartit un résultat réel (bénéfice ou perte) entre les participations réelles d'une
            opération. Sans ledger ni comptes participants en base, aucune distribution ne peut être calculée
            légitimement — cette liste reste vide jusque-là. Une confirmation explicite sera exigée avant toute
            distribution réelle, celle-ci étant irréversible.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <TrendingUp className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune distribution.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((d) => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">{d.operationReference}</p>
                <p className="text-xs text-slate-500">{d.participantsCount} participant(s)</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">{d.totalAmountFcfa.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-xs text-slate-500">{STATUS_LABELS[d.status]}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
