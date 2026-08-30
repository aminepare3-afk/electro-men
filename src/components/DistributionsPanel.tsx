import React, { useEffect, useState } from 'react';
import { TrendingUp, X, CheckCircle2, ShieldAlert, Trash2 } from 'lucide-react';
import {
  getDistributions,
  getDistributionDetail,
  createDistribution,
  distributionAction,
  DistributionRow,
  DistributionDetail,
} from '../services/adminDistributionsService';
import { getOperations } from '../services/operationsService';
import { Operation } from '../types';

interface DistributionsPanelProps {
  adminPassword: string;
}

const STATUS_LABELS: Record<DistributionRow['status'], string> = {
  draft: 'Brouillon',
  validated: 'Validée',
  confirmed: 'Confirmée',
};

const STATUS_STYLES: Record<DistributionRow['status'], string> = {
  draft: 'bg-slate-100 text-slate-600',
  validated: 'bg-cyan-50 text-cyan-800',
  confirmed: 'bg-emerald-50 text-emerald-800',
};

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export const DistributionsPanel: React.FC<DistributionsPanelProps> = ({ adminPassword }) => {
  const [distributions, setDistributions] = useState<DistributionRow[]>([]);
  const [closedOperations, setClosedOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedOpId, setSelectedOpId] = useState('');
  const [totalResult, setTotalResult] = useState('');
  const [creating, setCreating] = useState(false);

  const [detail, setDetail] = useState<DistributionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dists, ops] = await Promise.all([getDistributions(adminPassword), getOperations()]);
      setDistributions(dists);
      setClosedOperations(ops.filter((o) => o.status === 'closed'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const d = await getDistributionDetail(adminPassword, id);
      setDetail(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const resultNum = Number(totalResult);
    if (!selectedOpId || !resultNum) {
      setError('Opération et résultat (non nul) requis.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createDistribution(adminPassword, selectedOpId, resultNum);
      setShowCreate(false);
      setSelectedOpId('');
      setTotalResult('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (id: string, action: 'validate' | 'confirm' | 'cancel') => {
    if (action === 'confirm') {
      const ok = window.confirm(
        'Confirmer cette distribution ? Cette action est IRRÉVERSIBLE : elle écrit les bénéfices/pertes dans le grand livre de chaque participant.'
      );
      if (!ok) return;
    }
    if (action === 'cancel') {
      const ok = window.confirm('Annuler et supprimer ce brouillon de distribution ?');
      if (!ok) return;
    }
    setActionLoading(true);
    try {
      await distributionAction(adminPassword, id, action);
      setDetail(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Distributions de bénéfices/pertes</h2>
        <p className="text-sm text-slate-500">
          Une fois une opération <strong>clôturée</strong>, calcule ici le résultat final (bénéfice ou perte) et
          répartis-le entre les investisseurs, selon le montant que chacun a réellement engagé.
        </p>
      </div>
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          3 étapes : Préparer (calcul automatique de la part de chacun) → Valider (relis avant confirmation) →
          Confirmer (irréversible, écrit dans le grand livre de chaque investisseur).
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}

      <button
        onClick={() => setShowCreate(true)}
        disabled={closedOperations.length === 0}
        className="self-start bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-mono text-xs uppercase font-bold py-2.5 px-4 rounded-xl transition-colors"
      >
        Préparer une distribution
      </button>
      {closedOperations.length === 0 && (
        <p className="text-xs text-slate-400">Aucune opération clôturée disponible — clôture une opération dans l'onglet Opérations d'abord.</p>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : distributions.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <TrendingUp className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune distribution.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {distributions.map((d) => (
            <button
              key={d.id}
              onClick={() => openDetail(d.id)}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-amber-300 transition-colors"
            >
              <div>
                <p className="font-bold text-slate-900">{d.operationTitle}</p>
                <p className="text-xs text-slate-500">{d.operationReference} · {d.linesCount} participant(s)</p>
              </div>
              <div className="text-right flex items-center gap-3">
                <span className={`font-bold ${d.totalAmountFcfa >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {d.totalAmountFcfa >= 0 ? '+' : ''}{fmt(d.totalAmountFcfa)}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${STATUS_STYLES[d.status]}`}>
                  {STATUS_LABELS[d.status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal création */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-950">Préparer une distribution</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Opération clôturée *</label>
                <select
                  value={selectedOpId}
                  onChange={(e) => setSelectedOpId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                >
                  <option value="">— Choisir —</option>
                  {closedOperations.map((op) => (
                    <option key={op.id} value={op.id}>{op.title} ({op.reference})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">
                  Résultat total (FCFA) — positif = bénéfice, négatif = perte
                </label>
                <input
                  type="number"
                  value={totalResult}
                  onChange={(e) => setTotalResult(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  placeholder="Ex : 150000 ou -50000"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="mt-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
              >
                {creating ? 'Calcul…' : 'Calculer la répartition'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal détail / validation / confirmation */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-950">Détail de la distribution</h3>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            {detailLoading || !detail ? (
              <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-900">{detail.operationTitle}</p>
                <p className="text-xs text-slate-500 mb-4">{detail.operationReference}</p>

                <div className="flex flex-col gap-1.5 mb-4">
                  {detail.lines.map((l) => (
                    <div key={l.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100">
                      <span className="text-slate-700">{l.participantName}</span>
                      <span className={`font-bold ${l.amountFcfa >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {l.amountFcfa >= 0 ? '+' : ''}{fmt(l.amountFcfa)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  {detail.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleAction(detail.id, 'validate')}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-mono uppercase font-bold py-2.5 rounded-xl transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valider
                      </button>
                      <button
                        onClick={() => handleAction(detail.id, 'cancel')}
                        disabled={actionLoading}
                        className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 text-slate-600 text-xs font-mono uppercase font-bold py-2.5 px-3 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {detail.status === 'validated' && (
                    <button
                      onClick={() => handleAction(detail.id, 'confirm')}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-mono uppercase font-bold py-2.5 rounded-xl transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmer (irréversible)
                    </button>
                  )}
                  {detail.status === 'confirmed' && (
                    <p className="text-xs text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Distribution confirmée et écrite au grand livre.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
