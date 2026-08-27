import React, { useEffect, useState } from 'react';
import { UserCog, CheckCircle2, XCircle, Info, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { getAdminParticipants, getAdminParticipations, reviewParticipation } from '../services/adminParticipantsService';
import { getAdminAccounts, createAdminAccount, deleteAdminAccount, bootstrapOwnerAccount, AdminAccount, AdminRole } from '../services/adminAccountsService';
import { Participation } from '../types';

interface UsersPanelProps {
  adminPassword: string;
}

interface ParticipantRow {
  id: string;
  full_name: string;
  phone?: string;
  status: string;
  created_at: string;
}

export const UsersPanel: React.FC<UsersPanelProps> = ({ adminPassword }) => {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [participations, setParticipations] = useState<(Participation & { id: string })[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Formulaire bootstrap / création de compte admin
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
      const [p, part, accounts] = await Promise.all([
        getAdminParticipants(adminPassword),
        getAdminParticipations(adminPassword),
        getAdminAccounts(adminPassword),
      ]);
      setParticipants(p);
      setParticipations(part);
      setAdminAccounts(accounts);
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

  const pending = participations.filter((p) => p.status === 'pending');

  const handleReview = async (id: string, decision: 'confirm' | 'reject') => {
    setProcessingId(id);
    try {
      await reviewParticipation(adminPassword, id, decision);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessingId(null);
    }
  };

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

  if (loading) return <div className="text-sm text-slate-400 py-8 text-center">Chargement…</div>;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">{error}</div>
      )}

      {/* Comptes admin individuels */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> Comptes administrateur
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          {hasOwner
            ? 'Le mot de passe partagé reste valide en parallèle. Ajoute des comptes individuels avec des rôles pour une meilleure traçabilité.'
            : "Aucun compte owner n'existe encore — crée-le maintenant avec le mot de passe partagé actuel, pour commencer la migration vers des comptes individuels."}
        </p>

        <form onSubmit={handleBootstrapOrCreate} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-end mb-3 max-w-2xl">
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
        {accSuccess && <p className="text-xs text-emerald-700 mb-3">{accSuccess}</p>}

        {adminAccounts.length > 0 && (
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

      {/* File d'attente de participations à confirmer */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Participations en attente {pending.length > 0 && `(${pending.length})`}
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Confirme uniquement après avoir vérifié la réception réelle du paiement (référence mobile money, etc.).
        </p>
        {pending.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-300 rounded-xl">
            <p className="text-sm text-slate-500">Aucune demande en attente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((p) => (
              <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{p.participantName}</p>
                  <p className="text-xs text-slate-500">{p.operationTitle} ({p.operationReference})</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    {p.paymentMethod} {p.paymentReference && `· réf. ${p.paymentReference}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">{p.amountFcfa.toLocaleString('fr-FR')} FCFA</span>
                  <button
                    onClick={() => handleReview(p.id, 'confirm')}
                    disabled={processingId === p.id}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-mono uppercase font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmer
                  </button>
                  <button
                    onClick={() => handleReview(p.id, 'reject')}
                    disabled={processingId === p.id}
                    className="flex items-center gap-1 bg-slate-100 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 text-slate-600 text-xs font-mono uppercase font-bold py-2 px-3 rounded-lg transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comptes participants réels */}
      <div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 flex items-start gap-2.5 mb-3">
          <Info className="w-4 h-4 text-cyan-700 mt-0.5 shrink-0" />
          <p className="text-xs text-cyan-900">
            Comptes créés via l'espace participant (/investor) — distincts des comptes admin ci-dessus.
          </p>
        </div>
        {participants.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-300 rounded-xl">
            <UserCog className="w-6 h-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aucun compte participant pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Nom</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Téléphone</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Statut</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] uppercase text-slate-500">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {participants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{p.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{p.status}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
