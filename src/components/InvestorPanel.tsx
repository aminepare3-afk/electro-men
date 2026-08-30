import React, { useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Wallet,
  History,
  Landmark,
  UserCircle,
  FolderOpen,
  LogIn,
  ShieldAlert,
  Megaphone,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useInvestorAuth } from '../hooks/useInvestorAuth';
import { InvestorAuthScreen } from './InvestorAuthScreen';
import { InvestorOperationsList } from './InvestorOperationsList';
import { InvestorMyParticipations } from './InvestorMyParticipations';
import { InvestorWallet } from './InvestorWallet';
import { InvestorTransactions } from './InvestorTransactions';
import { InvestorWithdrawals } from './InvestorWithdrawals';
import { InvestorDocuments } from './InvestorDocuments';
import { CommunityFeed } from './CommunityFeed';

type InvestorTab =
  | 'dashboard'
  | 'operations'
  | 'investments'
  | 'wallet'
  | 'transactions'
  | 'withdrawals'
  | 'profile'
  | 'documents'
  | 'community';

const NAV_ITEMS: { key: InvestorTab; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-4 h-4" /> },
  { key: 'operations', label: 'Opérations', icon: <Briefcase className="w-4 h-4" /> },
  { key: 'investments', label: 'Mes participations', icon: <Landmark className="w-4 h-4" /> },
  { key: 'wallet', label: 'Portefeuille', icon: <Wallet className="w-4 h-4" /> },
  { key: 'transactions', label: 'Transactions', icon: <History className="w-4 h-4" /> },
  { key: 'withdrawals', label: 'Retraits', icon: <Landmark className="w-4 h-4" /> },
  { key: 'community', label: 'Communauté', icon: <Megaphone className="w-4 h-4" /> },
  { key: 'documents', label: 'Documents', icon: <FolderOpen className="w-4 h-4" /> },
  { key: 'profile', label: 'Profil', icon: <UserCircle className="w-4 h-4" /> },
];

// Sur téléphone : seules ces 4 sections restent accessibles directement au pouce
// dans la barre du bas — le reste passe dans le menu "Plus" pour ne pas surcharger.
const MOBILE_PRIMARY_KEYS: InvestorTab[] = ['dashboard', 'operations', 'wallet', 'community'];
const MOBILE_PRIMARY_ITEMS = NAV_ITEMS.filter((i) => MOBILE_PRIMARY_KEYS.includes(i.key));
const MOBILE_MORE_ITEMS = NAV_ITEMS.filter((i) => !MOBILE_PRIMARY_KEYS.includes(i.key));

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (auth.loading && !auth.profile) {
    return <div className="text-center py-16 text-sm text-slate-400">Chargement…</div>;
  }

  if (!auth.token || !auth.profile) {
    return <InvestorAuthScreen auth={auth} />;
  }

  const wallet = auth.wallet;
  const isMoreTabActive = MOBILE_MORE_ITEMS.some((i) => i.key === activeTab);

  const goTo = (tab: InvestorTab) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  return (
    <div className="flex flex-col gap-6 pb-20 md:pb-0">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <ShieldAlert className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Compte, participations, portefeuille et retraits sont maintenant tous réels : chaque mouvement d'argent
          (participation confirmée, retrait effectué) est vérifié manuellement par l'admin avant d'affecter ton solde.
        </p>
      </div>

      {/* Navigation desktop — rangée complète, cachée sur mobile */}
      <div className="hidden md:flex gap-2 overflow-x-auto pb-1">
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

      {/* Navigation mobile — barre fixe en bas, accessible au pouce */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {MOBILE_PRIMARY_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => goTo(item.key)}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                activeTab === item.key ? 'text-amber-600' : 'text-slate-500'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-mono uppercase font-bold leading-none">{item.label.split(' ')[0]}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
              isMoreTabActive ? 'text-amber-600' : 'text-slate-500'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase font-bold leading-none">Plus</span>
          </button>
        </div>
      </div>

      {/* Feuille "Plus" — sections secondaires, mobile uniquement */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full rounded-t-2xl p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-bold text-slate-900">Plus</h3>
              <button onClick={() => setShowMoreMenu(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            {MOBILE_MORE_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => goTo(item.key)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === item.key ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
                <div className="text-xl font-bold text-slate-950">{k.value}</div>
              </div>
            ))}
          </div>
          <NoAccountState note="Une fois connecté, retrouvez ici vos opérations actives, vos dernières transactions et vos notifications." />
        </div>
      )}

      {activeTab === 'operations' && <InvestorOperationsList token={auth.token} />}
      {activeTab === 'investments' && <InvestorMyParticipations token={auth.token} />}
      {activeTab === 'wallet' && <InvestorWallet token={auth.token} />}
      {activeTab === 'transactions' && <InvestorTransactions token={auth.token} />}
      {activeTab === 'withdrawals' && <InvestorWithdrawals token={auth.token} />}
      {activeTab === 'documents' && <InvestorDocuments token={auth.token} />}
      {activeTab === 'community' && <CommunityFeed authHeaders={{ Authorization: `Bearer ${auth.token}` }} placeholder="Partage une question ou une idée avec les autres participants..." />}
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
