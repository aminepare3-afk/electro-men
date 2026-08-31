import React, { useEffect, useState } from 'react';
import { Landmark, Info, CheckCircle2 } from 'lucide-react';
import { WithdrawalRequest } from '../types';
import { getMyWithdrawals, requestWithdrawal } from '../services/participantService';

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En traitement',
  approved: 'Approuvé',
  rejected: 'Refusé',
  completed: 'Terminé',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800',
  processing: 'bg-cyan-50 text-cyan-800',
  approved: 'bg-cyan-50 text-cyan-800',
  rejected: 'bg-red-50 text-red-700',
  completed: 'bg-emerald-50 text-emerald-800',
};

export const InvestorWithdrawals: React.FC<{ token: string }> = ({ token }) => {
  const [items, setItems] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('orange_money');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    getMyWithdrawals(token)
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Montant invalide.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestWithdrawal(token, amountNum, method);
      setSuccessMsg('Demande de retrait envoyée. Elle sera traitée après vérification par l\'admin.');
      setAmount('');
      load();
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
          Le solde disponible est vérifié côté serveur au moment de la demande — jamais côté application.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4 max-w-sm">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
          <Landmark className="w-4 h-4" />
          Demander un retrait
        </h3>
        <div>
          <label className="text-sm font-mono uppercase text-slate-600 font-bold">Montant (FCFA)</label>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1.5 px-4 py-3.5 border border-slate-300 rounded-xl text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <label className="text-sm font-mono uppercase text-slate-600 font-bold">Moyen de retrait</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full mt-1.5 px-4 py-3.5 border border-slate-300 rounded-xl text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="orange_money">Orange Money</option>
            <option value="moov_money">Moov Money</option>
            <option value="cash">Espèces / autre</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {successMsg && (
          <p className="text-sm text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {successMsg}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-mono text-sm uppercase font-bold py-4 rounded-xl transition-colors"
        >
          {submitting ? 'Envoi…' : 'Envoyer la demande'}
        </button>
      </form>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-300 rounded-xl">
          <p className="text-sm text-slate-500">Aucune demande de retrait.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((w) => (
            <div key={w.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">{w.amountFcfa.toLocaleString('fr-FR')} FCFA</p>
                <p className="text-xs text-slate-500">{w.method} · {new Date(w.requestedAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${STATUS_STYLES[w.status]}`}>
                {STATUS_LABELS[w.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
