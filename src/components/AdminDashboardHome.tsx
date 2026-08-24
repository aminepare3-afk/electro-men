import React, { useMemo } from 'react';
import {
  ShoppingCart,
  PackageSearch,
  AlertTriangle,
  Boxes,
  Clock,
  TrendingUp,
  Landmark,
  Users,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import { Product, Order } from '../types';

interface AdminDashboardHomeProps {
  products: Product[];
  orders: Order[];
  ordersLoading: boolean;
  onGoToOrders: () => void;
  onGoToProducts: () => void;
}

/** Petite carte KPI générique, dans le langage visuel existant de l'admin (slate/amber, mono). */
const KpiCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: 'amber' | 'emerald' | 'red' | 'slate';
}> = ({ icon, label, value, sub, accent = 'slate' }) => {
  const accentClasses: Record<string, string> = {
    amber: 'text-amber-600 bg-amber-50',
    emerald: 'text-emerald-700 bg-emerald-50',
    red: 'text-red-700 bg-red-50',
    slate: 'text-slate-600 bg-slate-100',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentClasses[accent]}`}>
          {icon}
        </span>
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-950">{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
};

/** Carte pour un module pas encore branché à une vraie base de données (pas de chiffres inventés). */
const ComingSoonCard: React.FC<{ icon: React.ReactNode; label: string; note: string }> = ({ icon, label, note }) => (
  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <span className="w-8 h-8 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center">
        {icon}
      </span>
      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">{label}</span>
    </div>
    <div className="text-sm text-slate-500 flex items-center gap-1.5">
      <Clock className="w-3.5 h-3.5" />
      {note}
    </div>
  </div>
);

export const AdminDashboardHome: React.FC<AdminDashboardHomeProps> = ({
  products,
  orders,
  ordersLoading,
  onGoToOrders,
  onGoToProducts,
}) => {
  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== 'cancelled');
    const revenueTotal = activeOrders.reduce((sum, o) => sum + (o.totalFcfa || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === 'new').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const stockValue = products.reduce((sum, p) => sum + p.priceFcfa * (p.stock || 0), 0);
    const outOfStock = products.filter((p) => p.status === 'OUT_OF_STOCK').length;

    return { revenueTotal, pendingOrders, deliveredOrders, stockValue, outOfStock };
  }, [orders, products]);

  const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Vue d'ensemble</h2>
        <p className="text-sm text-slate-500">Boutique + centre d'administration ELECTRO MEN</p>
      </div>

      {/* Alerte si commandes en attente */}
      {stats.pendingOrders > 0 && (
        <button
          onClick={onGoToOrders}
          className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-900 mb-0.5">
              {stats.pendingOrders} commande{stats.pendingOrders > 1 ? 's' : ''} en attente
            </h3>
            <p className="text-xs text-amber-800/80">À traiter dans l'onglet Commandes.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-600 mt-1" />
        </button>
      )}

      {/* KPI boutique — données réelles */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">Boutique (données réelles)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={<ShoppingCart className="w-4 h-4" />}
            label="Chiffre d'affaires"
            value={ordersLoading ? '…' : fmt(stats.revenueTotal)}
            sub={`${orders.length} commande${orders.length > 1 ? 's' : ''} au total`}
            accent="amber"
          />
          <KpiCard
            icon={<Boxes className="w-4 h-4" />}
            label="Valeur du stock"
            value={fmt(stats.stockValue)}
            sub={`${products.length} produits catalogués`}
            accent="slate"
          />
          <KpiCard
            icon={<Clock className="w-4 h-4" />}
            label="Commandes en attente"
            value={ordersLoading ? '…' : String(stats.pendingOrders)}
            sub="Statut « nouvelle »"
            accent={stats.pendingOrders > 0 ? 'red' : 'emerald'}
          />
          <KpiCard
            icon={<PackageSearch className="w-4 h-4" />}
            label="Ruptures de stock"
            value={String(stats.outOfStock)}
            sub="Produits à réapprovisionner"
            accent={stats.outOfStock > 0 ? 'red' : 'emerald'}
          />
        </div>
      </div>

      {/* Modules financement participatif — pas encore de données réelles en base */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-3">
          Financement &amp; importations (à venir)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ComingSoonCard icon={<Landmark className="w-4 h-4" />} label="Capital collecté" note="Module Finance non branché" />
          <ComingSoonCard icon={<Briefcase className="w-4 h-4" />} label="Opérations actives" note="Module Opérations non branché" />
          <ComingSoonCard icon={<Users className="w-4 h-4" />} label="Participants" note="Comptes participants inexistants" />
          <ComingSoonCard icon={<TrendingUp className="w-4 h-4" />} label="Bénéfices / pertes" note="Ledger non branché" />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Ces cartes s'activeront une fois le schéma (opérations, participations, ledger) et l'authentification par
          compte créés — voir plan d'étapes convenu.
        </p>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onGoToProducts}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs uppercase font-bold py-3 px-4 rounded-xl transition-colors"
        >
          Gérer le catalogue
        </button>
        <button
          onClick={onGoToOrders}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs uppercase font-bold py-3 px-4 rounded-xl transition-colors"
        >
          Voir les commandes
        </button>
      </div>
    </div>
  );
};
