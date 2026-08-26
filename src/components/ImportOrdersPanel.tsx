import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X, Trash2, Info, Ship, PackageCheck } from 'lucide-react';
import { ImportOrder, ImportOrderStatus } from '../types';
import { getImportOrders, createImportOrder, updateImportOrderStatus, deleteImportOrder } from '../services/importOrdersService';

const STATUS_LABELS: Record<ImportOrderStatus, string> = {
  draft: 'Brouillon',
  ordered: 'Commandé',
  in_transit: 'En transit',
  customs: 'En douane',
  received: 'Réceptionné',
  cancelled: 'Annulé',
};

const STATUS_STYLES: Record<ImportOrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  ordered: 'bg-cyan-50 text-cyan-800',
  in_transit: 'bg-blue-50 text-blue-800',
  customs: 'bg-amber-50 text-amber-800',
  received: 'bg-emerald-50 text-emerald-800',
  cancelled: 'bg-red-50 text-red-700',
};

const FILTERS: { key: 'all' | ImportOrderStatus; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'ordered', label: 'Commandé' },
  { key: 'in_transit', label: 'En transit' },
  { key: 'customs', label: 'En douane' },
  { key: 'received', label: 'Réceptionné' },
];

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

const emptyForm = {
  supplierName: '',
  productDescription: '',
  quantity: '',
  purchasePriceFcfa: '',
  transportFeeFcfa: '0',
  customsFeeFcfa: '0',
  taxFeeFcfa: '0',
  otherFeesFcfa: '0',
  orderDate: new Date().toISOString().slice(0, 10),
  expectedReceptionDate: '',
};

interface ImportOrdersPanelProps {
  adminPassword: string;
}

export const ImportOrdersPanel: React.FC<ImportOrdersPanelProps> = ({ adminPassword }) => {
  const [items, setItems] = useState<ImportOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ImportOrderStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setItems(await getImportOrders());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const matchesFilter = filter === 'all' || it.status === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        it.supplierName.toLowerCase().includes(q) ||
        it.productDescription.toLowerCase().includes(q) ||
        it.reference.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [items, filter, search]);

  const totalCost = (it: ImportOrder) =>
    it.purchasePriceFcfa + it.transportFeeFcfa + it.customsFeeFcfa + it.taxFeeFcfa + it.otherFeesFcfa;

  const setField = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierName.trim() || !form.productDescription.trim()) {
      setFormError('Le fournisseur et la description du produit sont obligatoires.');
      return;
    }
    const qty = Number(form.quantity);
    const price = Number(form.purchasePriceFcfa);
    if (!qty || qty <= 0 || !price || price <= 0) {
      setFormError('Quantité et prix d\'achat doivent être des nombres positifs.');
      return;
    }
    setSaving(true);
    try {
      await createImportOrder(adminPassword, {
        supplierName: form.supplierName.trim(),
        productDescription: form.productDescription.trim(),
        quantity: qty,
        purchasePriceFcfa: price,
        transportFeeFcfa: Number(form.transportFeeFcfa) || 0,
        customsFeeFcfa: Number(form.customsFeeFcfa) || 0,
        taxFeeFcfa: Number(form.taxFeeFcfa) || 0,
        otherFeesFcfa: Number(form.otherFeesFcfa) || 0,
        orderDate: form.orderDate,
        expectedReceptionDate: form.expectedReceptionDate || undefined,
      });
      setForm(emptyForm);
      setFormError(null);
      setShowModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (it: ImportOrder) => {
    if (!window.confirm(`Supprimer la commande "${it.reference}" (${it.supplierName}) ?`)) return;
    await deleteImportOrder(adminPassword, it.id);
    await load();
  };

  const handleStatusChange = async (it: ImportOrder, status: ImportOrderStatus) => {
    if (status === 'received' && !window.confirm('Marquer comme réceptionné ? Le stock produit devra être mis à jour manuellement tant que le backend n\'est pas branché.')) {
      return;
    }
    await updateImportOrderStatus(adminPassword, it.id, status);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Module en préparation : ces commandes d'importation sont un brouillon local. La réception ne met pas
          encore à jour automatiquement le stock du catalogue — ce lien sera fait une fois le backend branché.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher fournisseur, produit, référence..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 px-4 rounded-xl transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouvelle commande
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono uppercase font-bold whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl">
          <Ship className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {items.length === 0 ? 'Aucune commande d\'importation pour le moment.' : 'Aucun résultat pour ce filtre.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((it) => (
            <div key={it.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{it.supplierName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${STATUS_STYLES[it.status]}`}>
                      {STATUS_LABELS[it.status]}
                    </span>
                    {it.status === 'received' && <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{it.productDescription}</p>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Réf. {it.reference} · Qté {it.quantity} · Commandé le {new Date(it.orderDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <button onClick={() => handleDelete(it)} className="text-slate-300 hover:text-red-600 transition-colors shrink-0" title="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                <div><span className="text-slate-400 block">Achat</span><span className="font-bold text-slate-800">{fmt(it.purchasePriceFcfa)}</span></div>
                <div><span className="text-slate-400 block">Transport</span><span className="font-bold text-slate-800">{fmt(it.transportFeeFcfa)}</span></div>
                <div><span className="text-slate-400 block">Douane</span><span className="font-bold text-slate-800">{fmt(it.customsFeeFcfa)}</span></div>
                <div><span className="text-slate-400 block">Taxes</span><span className="font-bold text-slate-800">{fmt(it.taxFeeFcfa)}</span></div>
                <div><span className="text-slate-400 block">Total</span><span className="font-bold text-amber-700">{fmt(totalCost(it))}</span></div>
              </div>

              <select
                value={it.status}
                onChange={(e) => handleStatusChange(it, e.target.value as ImportOrderStatus)}
                className="mt-3 text-xs font-mono uppercase border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-amber-500"
              >
                {(Object.keys(STATUS_LABELS) as ImportOrderStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-950">Nouvelle commande d'importation</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Fournisseur *</label>
                <input value={form.supplierName} onChange={setField('supplierName')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Produit(s) *</label>
                <input value={form.productDescription} onChange={setField('productDescription')} placeholder="Ex : STM32F103C8T6 x500" className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Quantité *</label>
                  <input type="number" min={1} value={form.quantity} onChange={setField('quantity')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Prix d'achat (FCFA) *</label>
                  <input type="number" min={1} value={form.purchasePriceFcfa} onChange={setField('purchasePriceFcfa')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Transport</label>
                  <input type="number" min={0} value={form.transportFeeFcfa} onChange={setField('transportFeeFcfa')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Douane</label>
                  <input type="number" min={0} value={form.customsFeeFcfa} onChange={setField('customsFeeFcfa')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Taxes</label>
                  <input type="number" min={0} value={form.taxFeeFcfa} onChange={setField('taxFeeFcfa')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Autres frais</label>
                <input type="number" min={0} value={form.otherFeesFcfa} onChange={setField('otherFeesFcfa')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Date de commande</label>
                  <input type="date" value={form.orderDate} onChange={setField('orderDate')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Réception prévue</label>
                  <input type="date" value={form.expectedReceptionDate} onChange={setField('expectedReceptionDate')} className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500" />
                </div>
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <button type="submit" disabled={saving} className="mt-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors">
                {saving ? 'Création…' : 'Créer la commande'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
