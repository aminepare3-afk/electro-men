import React, { useEffect, useState } from 'react';
import { X, Info, CheckCircle2, AlertTriangle, Package, Clock, ShoppingBag, ChevronRight } from 'lucide-react';
import { Operation } from '../types';
import { getOpenOperations, participateInOperation } from '../services/participantService';

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  funded: 'Financé',
  in_progress: 'En cours',
};

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

const RiskWarning: React.FC = () => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5">
    <AlertTriangle className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />
    <p className="text-xs text-red-900">
      <strong>Aucun rendement n'est garanti.</strong> Si les produits importés ne se vendent pas assez ou pas assez
      vite, l'opération peut se solder par une perte partielle ou totale du montant que tu engages — ce n'est pas
      seulement un bénéfice probable, une perte est un résultat tout aussi possible.
    </p>
  </div>
);

export const InvestorOperationsList: React.FC<{ token: string }> = ({ token }) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailOp, setDetailOp] = useState<Operation | null>(null);
  const [selected, setSelected] = useState<Operation | null>(null);
  const [amount, setAmount] = useState('');
  const [shares, setShares] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('orange_money');
  const [paymentReference, setPaymentReference] = useState('');
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getOpenOperations()
      .then(setOperations)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openParticipate = (op: Operation) => {
    setSelected(op);
    setDetailOp(null);
    setAmount('');
    setShares('');
    setPaymentReference('');
    setRiskAccepted(false);
    setError(null);
  };

  const effectiveAmount = selected?.sharePriceFcfa ? (Number(shares) || 0) * selected.sharePriceFcfa : Number(amount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const amountNum = effectiveAmount;
    if (!amountNum || amountNum <= 0) {
      setError(selected.sharePriceFcfa ? 'Nombre de parts invalide.' : 'Montant invalide.');
      return;
    }
    if (!riskAccepted) {
      setError("Merci de cocher la case confirmant que tu as compris qu'une perte est possible.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await participateInOperation(token, {
        operationId: selected.id,
        amountFcfa: amountNum,
        paymentMethod,
        paymentReference: paymentReference || undefined,
      });
      setSuccessMsg(`Demande envoyée pour "${selected.title}". Elle sera confirmée dès que l'admin aura vérifié la réception du paiement.`);
      setSelected(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Participer envoie une demande avec ton paiement (mobile money). Le montant n'est compté dans l'opération
          qu'une fois l'admin ayant confirmé la réception réelle du paiement — comme pour une commande boutique.
        </p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-900">{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : operations.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <p className="text-sm text-slate-500">Aucune opération ouverte au financement pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operations.map((op) => {
            const progress = op.targetAmountFcfa > 0 ? Math.min(100, Math.round((op.collectedAmountFcfa / op.targetAmountFcfa) * 100)) : 0;
            return (
              <div key={op.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-emerald-50 text-emerald-800">
                    {STATUS_LABELS[op.status] || op.status}
                  </span>
                  <h3 className="font-bold text-slate-900 mt-1.5">{op.title}</h3>
                  <p className="text-xs font-mono text-slate-400">Réf. {op.reference}</p>
                </div>
                {op.description && <p className="text-xs text-slate-500 line-clamp-2">{op.description}</p>}

                {(op.productCategory || op.estimatedDurationDays) && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {op.productCategory && (
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                        <Package className="w-3 h-3" /> {op.productCategory}
                      </span>
                    )}
                    {op.estimatedDurationDays && (
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                        <Clock className="w-3 h-3" /> ~{op.estimatedDurationDays} jours
                      </span>
                    )}
                    {op.sharePriceFcfa && (
                      <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-bold">
                        Part = {fmt(op.sharePriceFcfa)}
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-[11px] font-mono uppercase text-slate-400 mb-1">
                    <span>Progression</span>
                    <span className="font-bold text-slate-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400">Collecté</div>
                    <div className="text-sm font-bold text-slate-900">{fmt(op.collectedAmountFcfa)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase text-slate-400">Cible</div>
                    <div className="text-sm text-slate-500">{fmt(op.targetAmountFcfa)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailOp(op)}
                    className="flex-1 flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
                  >
                    Voir détails <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openParticipate(op)}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
                  >
                    Participer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal détail complet de l'opération */}
      {detailOp && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setDetailOp(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-lg text-slate-950">{detailOp.title}</h3>
              <button onClick={() => setDetailOp(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-mono text-slate-400 mb-4">Réf. {detailOp.reference}</p>

            {detailOp.description && <p className="text-sm text-slate-700 mb-4">{detailOp.description}</p>}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Objectif financier</div>
                <div className="font-bold text-slate-900">{fmt(detailOp.targetAmountFcfa)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Déjà collecté</div>
                <div className="font-bold text-slate-900">{fmt(detailOp.collectedAmountFcfa)}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Date de début</div>
                <div className="font-bold text-slate-900">{new Date(detailOp.startDate).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-mono uppercase text-slate-400 mb-0.5">Durée estimée</div>
                <div className="font-bold text-slate-900">{detailOp.estimatedDurationDays ? `~${detailOp.estimatedDurationDays} jours` : 'Non précisée'}</div>
              </div>
            </div>

            {detailOp.productCategory && (
              <div className="flex items-start gap-2 text-sm text-slate-700 mb-2">
                <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span><strong>Produits :</strong> {detailOp.productCategory}{detailOp.estimatedQuantity ? ` — ${detailOp.estimatedQuantity} unités estimées` : ''}</span>
              </div>
            )}
            {detailOp.resaleChannel && (
              <div className="flex items-start gap-2 text-sm text-slate-700 mb-4">
                <ShoppingBag className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <span><strong>Revente prévue via :</strong> {detailOp.resaleChannel}</span>
              </div>
            )}

            {detailOp.riskNotes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                <p className="text-xs font-bold text-amber-900 mb-1">Risques identifiés pour cette opération :</p>
                <p className="text-xs text-amber-800/90">{detailOp.riskNotes}</p>
              </div>
            )}

            <RiskWarning />

            <button
              onClick={() => openParticipate(detailOp)}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
            >
              Participer à cette opération
            </button>
          </div>
        </div>
      )}

      {/* Modal formulaire de participation */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-950">Participer</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">{selected.title}</p>

            <RiskWarning />

            <form onSubmit={submit} className="flex flex-col gap-3 mt-4">
              {selected.sharePriceFcfa ? (
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">
                    Nombre de parts * (1 part = {fmt(selected.sharePriceFcfa)})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  />
                  {Number(shares) > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Total à payer : <strong>{fmt(effectiveAmount)}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Montant (FCFA) *</label>
                  <input
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Moyen de paiement</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                >
                  <option value="orange_money">Orange Money</option>
                  <option value="moov_money">Moov Money</option>
                  <option value="cash">Espèces / autre</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Référence de transaction</label>
                <input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Ex : code reçu par SMS"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 rounded-xl p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={riskAccepted}
                  onChange={(e) => setRiskAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Je comprends que le résultat de cette opération n'est pas garanti et qu'une perte partielle ou
                  totale de mon montant engagé est possible si les ventes ne suffisent pas.
                </span>
              </label>

              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !riskAccepted}
                className="mt-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
              >
                {submitting ? 'Envoi…' : 'Envoyer la demande'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
