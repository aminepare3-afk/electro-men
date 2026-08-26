import React, { useEffect, useState } from 'react';
import { FolderOpen, Download } from 'lucide-react';
import { DocumentRow, getMyDocuments } from '../services/documentsService';

export const InvestorDocuments: React.FC<{ token: string }> = ({ token }) => {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyDocuments(token)
      .then(setDocuments)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>;

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
        <FolderOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Aucun document pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {documents.map((d) => (
        <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-900">{d.label}</p>
            {d.operationTitle && <p className="text-xs text-slate-500">{d.operationTitle}</p>}
          </div>
          {d.signedUrl && (
            <a
              href={d.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono uppercase font-bold py-2 px-3 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Ouvrir
            </a>
          )}
        </div>
      ))}
    </div>
  );
};
