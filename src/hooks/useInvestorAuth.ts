import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'electro-men-investor-token-v1';

interface ParticipantProfile {
  id: string;
  full_name: string;
  phone?: string;
  status: string;
  created_at: string;
}

interface AuthState {
  token: string | null;
  profile: ParticipantProfile | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook d'authentification participant. Le token vient de Supabase Auth
 * (via /api/investor/login) et est envoyé en Bearer sur les routes /api/me/*.
 */
export function useInvestorAuth() {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem(TOKEN_KEY),
    profile: null,
    loading: true,
    error: null,
  });

  const loadProfile = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/investor/me', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Session invalide.');
      setState({ token, profile: json.data, loading: false, error: null });
    } catch (e: any) {
      localStorage.removeItem(TOKEN_KEY);
      setState({ token: null, profile: null, loading: false, error: null });
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      loadProfile(token);
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [loadProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch('/api/investor/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Connexion impossible.');
        localStorage.setItem(TOKEN_KEY, json.accessToken);
        await loadProfile(json.accessToken);
      } catch (e: any) {
        setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    },
    [loadProfile]
  );

  const signup = useCallback(async (email: string, password: string, fullName: string, phone: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch('/api/investor/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Inscription impossible.');
      setState((s) => ({ ...s, loading: false, error: null }));
      return true;
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ token: null, profile: null, loading: false, error: null });
  }, []);

  return { ...state, login, signup, logout };
}
