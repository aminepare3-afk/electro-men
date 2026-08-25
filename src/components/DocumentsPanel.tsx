import React from 'react';
import { FolderOpen, Info } from 'lucide-react';

/**
 * TODO(backend): stockage Supabase Storage pour factures fournisseurs, documents douaniers,
 * justificatifs de distribution, etc., avec permissions par rôle.
 */
export const DocumentsPanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
        <p className="text-xs text-cyan-900">
          Module en préparation : stockage de documents (factures fournisseurs, papiers douaniers, justificatifs)
          nécessite un backend de stockage de fichiers dédié.
        </p>
      </div>
      <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
        <FolderOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Aucun document pour le moment.</p>
      </div>
    </div>
  );
};
