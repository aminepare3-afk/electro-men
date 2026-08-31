import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';
import { useInvestorAuth } from '../hooks/useInvestorAuth';

interface InvestorAuthScreenProps {
  auth: ReturnType<typeof useInvestorAuth>;
}

export const InvestorAuthScreen: React.FC<InvestorAuthScreenProps> = ({ auth }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await auth.login(email, password);
    } else {
      const ok = await auth.signup(email, password, fullName, phone);
      if (ok) {
        // Connexion automatique juste après l'inscription — pas besoin de retaper
        // ses identifiants une seconde fois.
        await auth.login(email, password);
      }
    }
  };

  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('login')}
          className={`flex-1 py-3.5 rounded-xl text-sm font-mono uppercase font-bold flex items-center justify-center gap-1.5 transition-colors ${
            mode === 'login' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          Connexion
        </button>
        <button
          onClick={() => setMode('signup')}
          className={`flex-1 py-3.5 rounded-xl text-sm font-mono uppercase font-bold flex items-center justify-center gap-1.5 transition-colors ${
            mode === 'signup' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Créer un compte
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === 'signup' && (
          <>
            <div>
              <label className="text-xs font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nom complet
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full mt-1.5 px-4 py-3.5 border border-slate-300 rounded-xl text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Téléphone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+226 ..."
                className="w-full mt-1.5 px-4 py-3.5 border border-slate-300 rounded-xl text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </>
        )}
        <div>
          <label className="text-xs font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mt-1.5 px-4 py-3.5 border border-slate-300 rounded-xl text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>
        <div>
          <label className="text-xs font-mono uppercase text-slate-500 font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full mt-1.5 px-4 py-3.5 border border-slate-300 rounded-xl text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        {auth.error && (
          <div className="flex items-start gap-2 text-red-700 text-xs bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {auth.error}
          </div>
        )}

        <button
          type="submit"
          disabled={auth.loading}
          className="mt-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-50 text-slate-950 font-mono text-sm uppercase font-bold py-4 rounded-xl transition-colors"
        >
          {auth.loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>
    </div>
  );
};
