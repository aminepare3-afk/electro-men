import React, { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { ParticipantWallet } from '../types';
import { getCurrentParticipantWallet } from '../services/participantService';

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export const InvestorWallet: React.FC<{ token: string }> = ({ token }) => {
  const [wallet, setWallet] = useState<ParticipantWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentParticipantWallet(token)
      .then(setWallet)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>;
  if (error) return <div className="text-sm text-red-600 py-8 text-center">{error}</div>;
  if (!wallet) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">Solde disponible</div>
          <div className="text-2xl font-bold text-slate-950">{fmt(wallet.availableBalanceFcfa)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">Capital engagé</div>
          <div className="text-lg font-bold text-slate-900">{fmt(wallet.engagedAmountFcfa)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">Bénéfices réalisés</div>
          <div className="text-lg font-bold text-emerald-700">{fmt(wallet.totalProfitFcfa)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">Pertes</div>
          <div className="text-lg font-bold text-red-700">{fmt(wallet.totalLossFcfa)}</div>
        </div>
      </div>
    </div>
  );
};
