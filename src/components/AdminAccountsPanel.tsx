import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { getAdminAccounts, createAdminAccount, deleteAdminAccount, bootstrapOwnerAccount, AdminAccount, AdminRole } from '../services/adminAccountsService';

interface AdminAccountsPanelProps {
  adminPassword: string;
}

export const AdminAccountsPanel: React.FC<AdminAccountsPanelProps> = ({ adminPassword }) => {
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [accEmail, setAccEmail] = useState('');
  const [accPassword, setAccPassword] = useState('');
  const [accRole, setAccRole] = useState<AdminRole>('employee');
  const [accSaving, setAccSaving] = useState(false);
  const [accSuccess, setAccSuccess] = useState<string | null>(null);

  const hasOwner = adminAccounts.some((a) => a.role === 'owner');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAdminAccounts(await getAdminAccounts(adminPassword));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBootstrapOrCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accEmail || !accPassword) {
      setError('Email et mot de passe requis.');
      return;
    }
    setAccSaving(true);
    setError(null);
    setAccSuccess(null);
    try {
      if (!hasOwner) {
        await bootstrapOwnerAccount(adminPassword, accEmail, accPassword);
        setAccSuccess('Compte owner créé ! Il peut maintenant se connecter avec ces identifiants.');
      } else {
        await createAdminAccount(adminPassword, { email: accEmail, password: accPassword, role: accRole });
        setAccSuccess('Compte créé.');
      }
      setAccEmail('');
      setAccPassword('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAccSaving(false);
    }
  };

  const handleDeleteAccount = async (id: string, email: string) => {
    if (!window.confirm(`Supprimer l'accès admin de ${email} ?`)) return;
    try {
      await deleteAdminAccount(adminPassword, id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
      <h3 className="text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-600" />
        <span>Comptes administrateur</span>
      </h3>
      <p className="text-xs text-slate-500">
        {hasOwner
          ? 'Le mot de passe partagé reste valide en parallèle. Ajoute des comptes individuels avec des rôles pour savoir qui fait quoi.'
          : "Aucun compte owner n'existe encore — crée-le maintenant avec le mot de passe partagé actuel, pour commencer à donner des accès individuels à ton équipe."}
      </p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>}

      <form onSubmit={handleBootstrapOrCreate} className="flex flex-col md:flex-row gap-3 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-mono uppercase text-slate-500 font-bold">Email</label>
          <input
            type="email"
            value={accEmail}
            onChange={(e) => setAccEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="text-xs font-mono uppercase text-slate-500 font-bold">Mot de passe</label>
          <input
            type="password"
            minLength={6}
            value={accPassword}
            onChange={(e) => setAccPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
          />
        </div>
        {hasOwner && (
          <div className="w-full md:w-40">
            <label className="text-xs font-mono uppercase text-slate-500 font-bold">Rôle</label>
            <select
              value={accRole}
              onChange={(e) => setAccRole(e.target.value as AdminRole)}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:border-amber-500"
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
            </select>
          </div>
        )}
        <button
          type="submit"
          disabled={accSaving}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-mono text-xs uppercase font-bold py-2.5 px-4 rounded-xl transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {hasOwner ? 'Créer' : 'Créer le owner'}
        </button>
      </form>
      {accSuccess && <p className="text-xs text-emerald-700">{accSuccess}</p>}

      {!loading && adminAccounts.length > 0 && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Email</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Rôle</th>
                <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Créé le</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {adminAccounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{a.email}</td>
                  <td className="px-4 py-2.5 text-slate-500 capitalize">{a.role}</td>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(a.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDeleteAccount(a.id, a.email)} className="text-slate-300 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
