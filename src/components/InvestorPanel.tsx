import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Wallet,
  History,
  Landmark,
  UserCircle,
  FolderOpen,
  Bell,
  LogIn,
  ShieldAlert,
} from 'lucide-react';
import { ParticipantWallet } from '../types';
import { getCurrentParticipantWallet } from '../services/participantService';
import { useInvestorAuth } from '../hooks/useInvestorAuth';
import { InvestorAuthScreen } from './InvestorAuthScreen';

type InvestorTab =
  | 'dashboard'
  | 'operations'
  | 'investments'
  | 'wallet'
  | 'transactions'
  | 'withdrawals'
  | 'profile'
  | 'documents'
  | 'notifications';

const NAV_ITEMS: { key: InvestorTab; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'operations', label: 'Opérations', icon: <Briefcase className="w-4 h-4" /> },
  { key: 'investments', label: 'Mes participations', icon: <Landmark className="w-4 h-4" /> },
  { key: 'wallet', label: 'Portefeuille', icon: <Wallet className="w-4 h-4" /> },
  { key: 'transactions', label: 'Transactions', icon: <History className="w-4 h-4" /> },
  { key: 'withdrawals', label: 'Retraits', icon: <Landmark className="w-4 h-4" /> },
  { key: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { key: 'profile', label: 'Profil', icon: <UserCircle className="w-4 h-4" /> },
];

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * Bloc générique "pas encore de compte participant" — réutilisé sur chaque section tant
 * que l'authentification participant (Supabase Auth + table participants/wallets) n'existe pas.
 */
const NoAccountState: React.FC<{ note?: string }> = ({ note }) => (
  <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl px-6">
    <LogIn className="w-6 h-6 text-slate-300 mx-auto mb-3" />
    <p className="text-sm font-bold text-slate-700 mb-1">Espace participant pas encore actif</p>
    <p className="text-xs text-slate-500 max-w-sm mx-auto">
      {note || 'La création de compte participant et le suivi des participations arrivent avec le prochain module (comptes + wallet).'}
    </p>
  </div>
);

export const InvestorPanel: React.FC = () => {
  const auth = useInvestorAuth();
  const [activeTab, setActiveTab] = useState<InvestorTab>('dashboard');
  const [wallet, setWallet] = useState<ParticipantWallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentParticipantWallet()
      .then(setWallet)
      .finally(() => setLoading(false));
  }, []);

  if (auth.loading && !auth.profile) {
    return <div className="text-center py-16 text-sm text-slate-400">Chargement…</div>;
  }

  if (!auth.token || !auth.profile) {
    return <InvestorAuthScreen auth={auth} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">Espace participant — structure prête, backend à venir</h3>
          <p className="text-xs text-amber-800/90">
            Cette interface est construite et prête à être branchée, mais aucun compte participant réel n'existe
            encore. Aucun montant, participation ou transaction n'est affiché tant que l'authentification et le
            wallet ne sont pas connectés côté serveur — c'est une garantie volontaire, pas un oubli.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono uppercase font-bold transition-all ${
              activeTab === item.key
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Capital engagé', value: wallet ? fmt(wallet.engagedAmountFcfa) : '—' },
              { label: 'Solde disponible', value: wallet ? fmt(wallet.availableBalanceFcfa) : '—' },
              { label: 'Bénéfices réalisés', value: wallet ? fmt(wallet.totalProfitFcfa) : '—' },
              { label: 'Pertes', value: wallet ? fmt(wallet.totalLossFcfa) : '—' },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-1">{k.label}</div>
                <div className="text-xl font-bold text-slate-950">{loading ? '…' : k.value}</div>
              </div>
            ))}
          </div>
          <NoAccountState note="Une fois connecté, retrouvez ici vos opérations actives, vos dernières transactions et vos notifications." />
        </div>
      )}

      {activeTab === 'operations' && <NoAccountState note="La liste des opérations ouvertes au financement participant s'affichera ici, avec progression et objectif." />}
      {activeTab === 'investments' && <NoAccountState note="Historique complet de vos participations : opération, montant, date, statut, résultat." />}
      {activeTab === 'wallet' && <NoAccountState note="Solde disponible, montant engagé, bénéfices, pertes et historique financier de votre compte." />}
      {activeTab === 'transactions' && <NoAccountState note="Table filtrable de toutes vos transactions (dépôts, participations, retraits, ajustements)." />}
      {activeTab === 'withdrawals' && <NoAccountState note="Demande de retrait — le frontend ne validera jamais lui-même un solde ; tout est vérifié côté serveur." />}
      {activeTab === 'documents' && <NoAccountState note="Documents liés à vos opérations (factures, justificatifs) accessibles ici." />}
      {activeTab === 'notifications' && <NoAccountState note="Centre de notifications personnel, avec badge non lus." />}
      {activeTab === 'profile' && (
        <div className="flex flex-col gap-4 max-w-md">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Nom complet</span>
              <p className="text-sm font-bold text-slate-900">{auth.profile.full_name}</p>
            </div>
            {auth.profile.phone && (
              <div>
                <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Téléphone</span>
                <p className="text-sm text-slate-700">{auth.profile.phone}</p>
              </div>
            )}
            <div>
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Statut du compte</span>
              <p className="text-sm text-slate-700">{auth.profile.status}</p>
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Membre depuis</span>
              <p className="text-sm text-slate-700">{new Date(auth.profile.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
          <button
            onClick={auth.logout}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
};
