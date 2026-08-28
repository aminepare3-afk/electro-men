import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, X, Trash2, Info } from 'lucide-react';
import { Operation, OperationStatus } from '../types';
import { getOperations, createOperation, updateOperationStatus, deleteOperation } from '../services/operationsService';

const STATUS_LABELS: Record<OperationStatus, string> = {
  open: 'Ouvert',
  funded: 'Financé',
  in_progress: 'En cours',
  closed: 'Clôturé',
  cancelled: 'Annulé',
};

const STATUS_STYLES: Record<OperationStatus, string> = {
  open: 'bg-emerald-50 text-emerald-800',
  funded: 'bg-cyan-50 text-cyan-800',
  in_progress: 'bg-amber-50 text-amber-800',
  closed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-red-50 text-red-700',
};

const FILTERS: { key: 'all' | OperationStatus; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'open', label: 'Ouvert' },
  { key: 'funded', label: 'Financé' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'closed', label: 'Clôturé' },
];

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

interface OperationsPanelProps {
  adminPassword: string;
}

export const OperationsPanel: React.FC<OperationsPanelProps> = ({ adminPassword }) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | OperationStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulaire de création
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formEndDate, setFormEndDate] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formResaleChannel, setFormResaleChannel] = useState('');
  const [formRiskNotes, setFormRiskNotes] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formSharePrice, setFormSharePrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getOperations();
    setOperations(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      const matchesFilter = filter === 'all' || op.status === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || op.title.toLowerCase().includes(q) || op.reference.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [operations, filter, search]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormTarget('');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate('');
    setFormCategory('');
    setFormQuantity('');
    setFormResaleChannel('');
    setFormRiskNotes('');
    setFormDuration('');
    setFormSharePrice('');
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = Number(formTarget);
    if (!formTitle.trim()) {
      setFormError('Le titre est obligatoire.');
      return;
    }
    if (!targetNum || targetNum <= 0) {
      setFormError('Le montant cible doit être un nombre positif.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Merci de décrire précisément cette opération — les participants doivent comprendre ce qu\'ils financent.');
      return;
    }
    const sharePriceNum = formSharePrice ? Number(formSharePrice) : undefined;
    if (formSharePrice && (!sharePriceNum || sharePriceNum <= 0)) {
      setFormError('Le prix de la part doit être un nombre positif.');
      return;
    }
    if (sharePriceNum && targetNum % sharePriceNum !== 0) {
      setFormError('Le montant cible doit être un multiple exact du prix de la part.');
      return;
    }
    setSaving(true);
    try {
      await createOperation(adminPassword, {
        title: formTitle.trim(),
        description: formDescription.trim(),
        targetAmountFcfa: targetNum,
        startDate: formStartDate,
        endDate: formEndDate || undefined,
        productCategory: formCategory.trim() || undefined,
        estimatedQuantity: formQuantity ? Number(formQuantity) : undefined,
        resaleChannel: formResaleChannel.trim() || undefined,
        riskNotes: formRiskNotes.trim() || undefined,
        estimatedDurationDays: formDuration ? Number(formDuration) : undefined,
        sharePriceFcfa: sharePriceNum,
      });
      resetForm();
      setShowCreateModal(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (op: Operation) => {
    if (!window.confirm(`Supprimer l'opération "${op.title}" (${op.reference}) ? Cette action est irréversible.`)) return;
    await deleteOperation(adminPassword, op.id);
    await load();
  };

  const handleStatusChange = async (op: Operation, status: OperationStatus) => {
    await updateOperationStatus(adminPassword, op.id, status);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Bandeau d'avertissement : module en préparation, pas de backend financier dédié */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Module en préparation : les opérations créées ici sont un brouillon de travail stocké dans ce navigateur.
          Les montants collectés et le nombre de participants ne sont pas encore réels — ils seront calculés
          automatiquement une fois le backend financement (comptes participants, ledger) branché.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une opération..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 px-4 rounded-xl transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouvelle opération
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
          <p className="text-sm text-slate-500">
            {operations.length === 0 ? 'Aucune opération pour le moment.' : 'Aucun résultat pour ce filtre.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((op) => {
            const progress = op.targetAmountFcfa > 0 ? Math.min(100, Math.round((op.collectedAmountFcfa / op.targetAmountFcfa) * 100)) : 0;
            return (
              <div key={op.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${STATUS_STYLES[op.status]}`}>
                      {STATUS_LABELS[op.status]}
                    </span>
                    <h3 className="font-bold text-slate-900 mt-1.5">{op.title}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">Réf. {op.reference}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(op)}
                    className="text-slate-300 hover:text-red-600 transition-colors shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {op.description && <p className="text-xs text-slate-500 line-clamp-2">{op.description}</p>}
                {(op.productCategory || op.estimatedDurationDays) && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {op.productCategory && <span className="bg-slate-50 px-2 py-1 rounded-lg">{op.productCategory}</span>}
                    {op.estimatedDurationDays && <span className="bg-slate-50 px-2 py-1 rounded-lg">~{op.estimatedDurationDays}j</span>}
                    {op.riskNotes && <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">⚠ Risques notés</span>}
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

                <select
                  value={op.status}
                  onChange={(e) => handleStatusChange(op, e.target.value as OperationStatus)}
                  className="text-xs font-mono uppercase border border-slate-200 rounded-lg py-1.5 px-2 outline-none focus:border-amber-500"
                >
                  {(Object.keys(STATUS_LABELS) as OperationStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-950">Nouvelle opération</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Titre *</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  placeholder="Ex : Importation composants Q1"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Montant cible (FCFA) *</label>
                <input
                  type="number"
                  min={1}
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  placeholder="Ex : 2000000"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">
                  Prix d'une part (FCFA) — optionnel
                </label>
                <input
                  type="number"
                  min={1}
                  value={formSharePrice}
                  onChange={(e) => setFormSharePrice(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  placeholder="Ex : 10000 (le participant investit alors en nombre de parts)"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Si rempli, le montant cible doit être un multiple exact de ce prix. Laisse vide pour un montant libre.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Début</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Fin (optionnel)</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 mt-1">
                <p className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-2">
                  Détails pour une décision informée des participants
                </p>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Catégorie de produits</label>
                <input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Ex : Microcontrôleurs ARM, capteurs..."
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Quantité estimée</label>
                  <input
                    type="number"
                    min={1}
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="Ex : 500 unités"
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono uppercase text-slate-500 font-bold">Durée estimée (jours)</label>
                  <input
                    type="number"
                    min={1}
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="Ex : 60"
                    className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">Canal de revente prévu</label>
                <input
                  value={formResaleChannel}
                  onChange={(e) => setFormResaleChannel(e.target.value)}
                  placeholder="Ex : Boutique en ligne + WhatsApp"
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-mono uppercase text-slate-500 font-bold">
                  Risques spécifiques identifiés (affiché aux participants)
                </label>
                <textarea
                  value={formRiskNotes}
                  onChange={(e) => setFormRiskNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex : délai douanier variable, risque de mévente si le prix du marché baisse, fluctuation du taux de change..."
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={saving}
                className="mt-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Création…' : "Créer l'opération"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
