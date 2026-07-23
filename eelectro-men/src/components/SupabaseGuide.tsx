import React, { useState } from 'react';
import { Database, Github, Globe, Code, Check, Copy, Download, Terminal, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';

export const SupabaseGuide: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);

  const supabaseSql = `-- ============================================================
-- SCRIPT DE CREATION DE BASE DE DONNEES SUPABASE POUR ELECTRO MEN
-- Exécutez ce script dans : Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Table des Produits
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mpn TEXT NOT NULL, -- Référence constructeur (ex: STM32F103C8T6, NE555)
  category TEXT NOT NULL,
  price_fcfa INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IN_STOCK', -- 'IN_STOCK', 'ON_DEMAND', 'OUT_OF_STOCK'
  description TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  datasheet_url TEXT,
  image_url TEXT,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par Référence MPN et Categorie
CREATE INDEX IF NOT EXISTS idx_products_mpn ON public.products(mpn);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- 2. Table des Demandes de Sourcing Sur-Mesure
CREATE TABLE IF NOT EXISTS public.sourcing_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  phone_whatsapp TEXT NOT NULL,
  component_name_or_mpn TEXT NOT NULL,
  quantity_needed INTEGER NOT NULL DEFAULT 1,
  estimated_budget_fcfa INTEGER,
  description_or_link TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active la sécurité niveau ligne (RLS) avec accès public en lecture
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accès public en lecture produits" ON public.products FOR SELECT USING (true);
CREATE POLICY "Insertion restreinte admin produits" ON public.products FOR ALL USING (true);

ALTER TABLE public.sourcing_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accès public création sourcing" ON public.sourcing_requests FOR INSERT WITH CHECK (true);
`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(supabaseSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const downloadSqlFile = () => {
    const blob = new Blob([supabaseSql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'electromen_supabase_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Intro Banner */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono uppercase">
              Guide de Déploiement : GitHub + Vercel + Supabase
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Vous avez un compte GitHub ? Suivez ces 4 étapes simples pour héberger ELECTRO MEN et contrôler votre propre base de données Supabase.
            </p>
          </div>
        </div>

        <button
          onClick={downloadSqlFile}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono uppercase flex items-center gap-2 shadow-md shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Télécharger schema.sql</span>
        </button>
      </div>

      {/* Steps Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Step 1: GitHub */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
              1
            </span>
            <Github className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white font-mono uppercase">Étape 1 : Créer le Dépôt GitHub</h4>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
            <li>Allez sur <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 underline">GitHub.com/new</a>.</li>
            <li>Nommez votre projet : <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded font-mono">electro-men</code>.</li>
            <li>Choisissez <strong>Public</strong> ou <strong>Private</strong> puis cliquez sur <em>Create repository</em>.</li>
            <li>Téléchargez ou exportez le code de ce site et poussez-le avec les commandes :
              <pre className="mt-1 p-2 bg-slate-900 text-amber-200 rounded text-[11px] font-mono overflow-x-auto">
{`git init
git add .
git commit -m "Initialisation ELECTRO MEN"
git branch -M main
git remote add origin https://github.com/votre-user/electro-men.git
git push -u origin main`}
              </pre>
            </li>
          </ol>
        </div>

        {/* Step 2: Supabase SQL Setup */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
              2
            </span>
            <Database className="w-5 h-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-white font-mono uppercase">Étape 2 : Configurer Supabase</h4>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
            <li>Créez un compte gratuit sur <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Supabase.com</a>.</li>
            <li>Cliquez sur <em>New Project</em>, choisissez le nom <strong>ELECTRO-MEN-DB</strong> et votre mot de passe.</li>
            <li>Dans le menu de gauche, ouvrez <strong>SQL Editor</strong> &gt; <em>New Query</em>.</li>
            <li>Collez le script SQL ci-dessous puis cliquez sur <strong>RUN</strong>.</li>
          </ol>
        </div>

        {/* Step 3: Vercel Deployment */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
              3
            </span>
            <Globe className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-white font-mono uppercase">Étape 3 : Déployer sur Vercel</h4>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
            <li>Connectez-vous sur <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Vercel.com</a> avec votre compte GitHub.</li>
            <li>Cliquez sur <strong>Add New... &gt; Project</strong>.</li>
            <li>Sélectionnez votre dépôt GitHub <strong>electro-men</strong>.</li>
            <li>Vercel détectera automatiquement <strong>Vite / React</strong>. Cliquez sur <strong>Deploy</strong> !</li>
          </ol>
        </div>

        {/* Step 4: Environment Variables */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-purple-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
              4
            </span>
            <ShieldCheck className="w-5 h-5 text-purple-400" />
            <h4 className="text-sm font-bold text-white font-mono uppercase">Étape 4 : Variables d'Environnement</h4>
          </div>
          <p className="text-xs text-slate-300">
            Sur Supabase (Project Settings &gt; API), copiez votre <strong>URL</strong> et la clé <strong>anon public key</strong>. Dans Vercel (Project Settings &gt; Environment Variables), ajoutez :
          </p>
          <div className="p-2.5 bg-slate-900 rounded font-mono text-[11px] text-amber-300 space-y-1">
            <div>VITE_SUPABASE_URL = https://xyz.supabase.co</div>
            <div>VITE_SUPABASE_ANON_KEY = eyJhbG...</div>
            <div>GEMINI_API_KEY = (Votre clé Gemini)</div>
          </div>
        </div>

      </div>

      {/* SQL Script Box */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-400" />
            <h4 className="text-sm font-bold text-white font-mono uppercase">
              Script SQL d'initialisation pour Supabase SQL Editor
            </h4>
          </div>

          <button
            onClick={copySqlToClipboard}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            {copiedSql ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Copié !
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copier SQL
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-64 leading-relaxed">
          {supabaseSql}
        </pre>
      </div>
    </div>
  );
};
