import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

interface LegalPageProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const LegalPage: React.FC<LegalPageProps> = ({ title, onClose, children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="cursor-pointer" onClick={onClose}>
          <Logo size="md" />
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-xs uppercase font-bold flex items-center gap-2 border border-slate-300 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-amber-600" />
          <span>Retour à la boutique</span>
        </button>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 sm:p-8 lg:p-10">
        <h1 className="text-2xl font-bold text-slate-950 mb-6">{title}</h1>
        <div className="prose prose-sm max-w-none text-slate-700 space-y-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1">
          {children}
        </div>
      </main>
    </div>
  );
};
