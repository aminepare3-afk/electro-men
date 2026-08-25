import { Participation, ParticipantWallet, WithdrawalRequest, LedgerEntry } from '../types';

/**
 * TODO(backend): tout ce fichier doit être remplacé par de vrais appels API authentifiés
 * (Supabase Auth par compte participant), une fois le système de comptes créé — voir le
 * plan d'étapes. Volontairement, rien n'est stocké ni fabriqué côté client ici : un espace
 * participant sans compte réel ne doit jamais laisser croire qu'il y a de l'argent engagé.
 */

export async function getCurrentParticipantWallet(): Promise<ParticipantWallet | null> {
  // TODO(backend): GET /api/me/wallet (401 si non connecté)
  return null;
}

export async function getMyParticipations(): Promise<Participation[]> {
  // TODO(backend): GET /api/me/participations
  return [];
}

export async function getMyTransactions(): Promise<LedgerEntry[]> {
  // TODO(backend): GET /api/me/transactions
  return [];
}

export async function getMyWithdrawals(): Promise<WithdrawalRequest[]> {
  // TODO(backend): GET /api/me/withdrawals
  return [];
}

export async function requestWithdrawal(_amountFcfa: number, _method: string): Promise<void> {
  // TODO(backend): POST /api/me/withdrawals — le frontend ne valide jamais lui-même
  // qu'un solde est suffisant ; c'est une vérification strictement serveur.
  throw new Error('Compte participant non encore disponible : le backend financement n\'est pas branché.');
}
