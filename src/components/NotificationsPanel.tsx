import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ShoppingCart, PackageX, CheckCheck, Info } from 'lucide-react';
import { Product, Order } from '../types';

interface NotificationsPanelProps {
  orders: Order[];
  products: Product[];
}

interface FeedItem {
  id: string;
  kind: 'new_order' | 'out_of_stock';
  title: string;
  detail: string;
  date: string;
}

const READ_KEY = 'electro-men-notifications-read-v1';

function readReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeReadSet(set: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set)));
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ orders, products }) => {
  const [readIds, setReadIds] = useState<Set<string>>(() => readReadSet());

  const feed: FeedItem[] = useMemo(() => {
    const orderItems: FeedItem[] = orders.map((o) => ({
      id: `order-${o.id}`,
      kind: 'new_order',
      title: `Nouvelle commande ${o.orderNumber}`,
      detail: `${o.customerName} — ${o.totalFcfa.toLocaleString('fr-FR')} FCFA`,
      date: o.createdAt,
    }));
    const stockItems: FeedItem[] = products
      .filter((p) => p.status === 'OUT_OF_STOCK')
      .map((p) => ({
        id: `stock-${p.id}`,
        kind: 'out_of_stock',
        title: `Rupture de stock`,
        detail: p.name,
        date: p.createdAt || new Date().toISOString(),
      }));
    return [...orderItems, ...stockItems].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 50);
  }, [orders, products]);

  const unreadCount = feed.filter((f) => !readIds.has(f.id)).length;

  const markRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    writeReadSet(next);
  };

  const markAllRead = () => {
    const next = new Set(feed.map((f) => f.id));
    setReadIds(next);
    writeReadSet(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Flux basé sur les événements réels de la boutique (nouvelles commandes, ruptures de stock). Pour recevoir
          ces alertes même site fermé, active les notifications push depuis l'onglet Commandes.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-xs font-mono uppercase font-bold text-slate-500 hover:text-slate-900"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Tout marquer lu
          </button>
        )}
      </div>

      {feed.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {feed.map((f) => {
            const isRead = readIds.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => markRead(f.id)}
                className={`text-left flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                  isRead ? 'bg-white border-slate-100' : 'bg-amber-50 border-amber-200'
                }`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  f.kind === 'new_order' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {f.kind === 'new_order' ? <ShoppingCart className="w-4 h-4" /> : <PackageX className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{f.title}</p>
                  <p className="text-xs text-slate-500 truncate">{f.detail}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {new Date(f.date).toLocaleString('fr-FR')}
                  </p>
                </div>
                {!isRead && <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
