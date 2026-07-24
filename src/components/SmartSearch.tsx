import React, { useState } from 'react';
import { Search, Sparkles, Cpu, Layers, ExternalLink, Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Product, SmartSearchReferenceInfo } from '../types';

interface SmartSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categories: string[];
  products: Product[];
  onOpenSourcingForMpn: (mpnInfo: { mpn: string; name: string; category: string; priceEst?: number }) => void;
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  categories,
  products,
  onOpenSourcingForMpn,
}) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<SmartSearchReferenceInfo['aiLookup'] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Check if query matches local stock
  const cleanQuery = searchQuery.trim().toLowerCase();
  const matchedInStock = products.filter(
    (p) =>
      p.name.toLowerCase().includes(cleanQuery) ||
      p.mpn.toLowerCase().includes(cleanQuery) ||
      p.category.toLowerCase().includes(cleanQuery)
  );

  // Auto-trigger AI lookup when query is long enough and no local matches
  React.useEffect(() => {
    if (searchQuery.trim().length >= 3 && matchedInStock.length === 0 && !aiResult && !aiLoading) {
      handleTriggerAiLookup();
    }
  }, [searchQuery]);

  const handleTriggerAiLookup = async () => {
    if (!searchQuery || searchQuery.trim().length < 2) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);

    try {
      const res = await fetch('/api/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible d'identifier la référence.");
      }

      setAiResult(data.data);
    } catch (err: any) {
      setAiError(err.message || 'Erreur de recherche AI.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div id="search-section" className="w-full bg-white border-y border-slate-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <Search className="w-6 h-6 text-amber-600" />
              <span>Recherche Intelligente par Nom & Référence MPN</span>
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Entrez le nom ou le code référence d'un composant (ex: <code className="text-amber-800 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">NE555</code>, <code className="text-amber-800 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">STM32F103</code>, <code className="text-amber-800 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">ESP32</code>, <code className="text-amber-800 font-mono bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">IRFZ44N</code>)
            </p>
          </div>

          {/* Quick AI Lookup Trigger */}
          {searchQuery.trim().length >= 2 && (
            <button
              onClick={handleTriggerAiLookup}
              disabled={aiLoading}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 font-mono uppercase transition-all"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyse Référence AI en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Identifier la référence avec AI</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Input Bar & Category Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Main Search Input */}
          <div className="md:col-span-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Ex: STM32, NE555, LM317, ESP32, Transistor, Capteur d'humidité..."
              className="w-full pl-12 pr-10 py-3.5 bg-slate-50 border border-slate-300 focus:border-amber-500 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  onSearchChange('');
                  setAiResult(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 text-xs font-mono bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded"
              >
                Effacer
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-4 relative">
            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-600 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="w-full pl-12 pr-8 py-3.5 bg-slate-50 border border-slate-300 focus:border-cyan-500 rounded-xl text-slate-900 text-sm font-sans focus:outline-none focus:bg-white appearance-none cursor-pointer shadow-sm"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* AI Reference Lookup Result Box */}
        {aiResult && (
          <div className="p-5 rounded-2xl bg-slate-50 border-2 border-amber-500/50 shadow-md space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-800 font-mono text-xs font-bold border border-amber-500/30">
                  REF AI IDENTIFIÉE
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-mono">
                  {aiResult.reference} — {aiResult.fullTitle}
                </h3>
              </div>
              <span className="text-xs font-mono text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-200">
                {aiResult.category}
              </span>
            </div>

            {/* Technical Summary & Specs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
              <div className="space-y-1">
                <span className="text-slate-500 font-mono uppercase text-[11px] font-bold block">Boîtier & Format</span>
                <p className="text-slate-900 font-semibold bg-white p-2.5 rounded-lg border border-slate-200">{aiResult.packageType} ({aiResult.pinCount})</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <span className="text-slate-500 font-mono uppercase text-[11px] font-bold block">Résumé Technique</span>
                <p className="text-slate-800 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-slate-200">{aiResult.summary}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold">Disponibilité Stock Boutique :</span>
              <span className="font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded border border-amber-300">
                Non disponible en stock immédiat — À commander sur-mesure
              </span>
            </div>

            {/* Specifications & Applications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-800 font-mono font-bold block mb-1.5 uppercase text-[11px]">Caractéristiques Clés :</span>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {aiResult.keySpecs.map((spec, idx) => (
                    <li key={idx}>{spec}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-slate-800 font-mono font-bold block mb-1.5 uppercase text-[11px]">Applications Courantes :</span>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {aiResult.typicalApplications.map((app, idx) => (
                    <li key={idx}>{app}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action button for Custom Sourcing */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-600 font-mono">
                Ce composant n'est pas en stock immédiat. Cliquez pour passer une commande sur-mesure !
              </div>

              <button
                onClick={() =>
                  onOpenSourcingForMpn({
                    mpn: aiResult.reference,
                    name: aiResult.fullTitle,
                    category: aiResult.category,
                  })
                }
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs font-mono uppercase flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Commander {aiResult.reference} sur-mesure via WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {aiError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{aiError}</span>
          </div>
        )}

      </div>
    </div>
  );
};
