import React from 'react';
import { UserCog, ShieldAlert } from 'lucide-react';

/**
 * TODO(backend): table `users` + `roles` (Owner/Admin/Manager/Employee) via Supabase Auth,
 * pour remplacer le mot de passe admin partagé actuel. Voir plan d'étapes convenu.
 */
export const UsersPanel: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">Module en attente d'un vrai système de comptes</h3>
          <p className="text-xs text-amber-800/90">
            L'admin utilise aujourd'hui un mot de passe partagé unique, sans comptes individuels ni rôles
            (Owner / Admin / Manager / Employee). C'est la priorité technique la plus importante avant d'ouvrir
            l'accès à plusieurs personnes ou de gérer de l'argent de participants — voir les fondations du plan.
          </p>
        </div>
      </div>
      <div className="text-center py-16 border border-dashed border-slate-300 rounded-xl">
        <UserCog className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Aucun compte utilisateur individuel pour le moment.</p>
      </div>
    </div>
  );
};
