import React, { useEffect, useRef, useState } from 'react';
import { FolderOpen, Upload, Download, Trash2 } from 'lucide-react';
import { DocumentRow, getAdminDocuments, uploadAdminDocument, deleteAdminDocument } from '../services/documentsService';

interface DocumentsPanelProps {
  adminPassword: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ adminPassword }) => {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    getAdminDocuments(adminPassword)
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !label.trim()) {
      setError('Libellé et fichier requis.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      await uploadAdminDocument(adminPassword, { label: label.trim(), fileBase64: base64, fileName: file.name });
      setLabel('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, docLabel: string) => {
    if (!window.confirm(`Supprimer "${docLabel}" ?`)) return;
    try {
      await deleteAdminDocument(adminPassword, id);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 max-w-md">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Upload className="w-4 h-4" /> Ajouter un document
        </h3>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Libellé (ex : Facture fournisseur XYZ)"
          className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
        />
        <input ref={fileInputRef} type="file" className="text-xs" />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 rounded-xl transition-colors"
        >
          {uploading ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
          <FolderOpen className="w-6 h-6 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Aucun document pour le moment.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {documents.map((d) => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900">{d.label}</p>
                <p className="text-xs text-slate-500">{new Date(d.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="flex items-center gap-2">
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
                <button onClick={() => handleDelete(d.id, d.label)} className="text-slate-300 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
