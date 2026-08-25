import React, { useState } from 'react';
import { FileText, Info, Save } from 'lucide-react';

/**
 * TODO(backend): table `site_content` (clé/valeur), servie au frontend boutique pour
 * afficher ces textes dynamiquement. En attendant, brouillon stocké localement — ce
 * n'est pas de la donnée financière, donc un brouillon local est acceptable ici.
 */
const STORAGE_KEY = 'electro-men-site-content-draft-v1';

interface SiteContentDraft {
  bannerMessage: string;
  aboutText: string;
  whatsappNumber: string;
}

const DEFAULT_DRAFT: SiteContentDraft = {
  bannerMessage: '',
  aboutText: '',
  whatsappNumber: '',
};

function readDraft(): SiteContentDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_DRAFT, ...JSON.parse(raw) } : DEFAULT_DRAFT;
  } catch {
    return DEFAULT_DRAFT;
  }
}

export const ContentPanel: React.FC = () => {
  const [draft, setDraft] = useState<SiteContentDraft>(() => readDraft());
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Brouillon local : ces textes ne sont pas encore branchés à la boutique publique. Le catalogue produit se
          gère dans l'onglet « Produits ».
        </p>
      </div>

      <div className="flex flex-col gap-3 max-w-lg">
        <div>
          <label className="text-xs font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Message du bandeau (promo/annonce)
          </label>
          <input
            value={draft.bannerMessage}
            onChange={(e) => setDraft((d) => ({ ...d, bannerMessage: e.target.value }))}
            placeholder="Ex : Livraison gratuite à Bobo-Dioulasso ce week-end !"
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase text-slate-500 font-bold">Texte "À propos"</label>
          <textarea
            value={draft.aboutText}
            onChange={(e) => setDraft((d) => ({ ...d, aboutText: e.target.value }))}
            rows={4}
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500 resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase text-slate-500 font-bold">Numéro WhatsApp affiché</label>
          <input
            value={draft.whatsappNumber}
            onChange={(e) => setDraft((d) => ({ ...d, whatsappNumber: e.target.value }))}
            placeholder="+226 ..."
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
          />
        </div>
        <button
          onClick={save}
          className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors w-fit px-4"
        >
          <Save className="w-3.5 h-3.5" />
          {saved ? 'Enregistré ✓' : 'Enregistrer le brouillon'}
        </button>
      </div>
    </div>
  );
};
