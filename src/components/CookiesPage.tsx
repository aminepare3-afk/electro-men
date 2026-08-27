import React from 'react';
import { LegalPage } from './LegalPage';

export const CookiesPage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalPage title="Politique de Cookies" onClose={onClose}>
    <p>
      ELECTRO MEN utilise un nombre limité de cookies et de technologies de stockage local, uniquement pour faire
      fonctionner le site correctement.
    </p>

    <h2>1. Cookies strictement nécessaires</h2>
    <ul>
      <li>Maintien de votre session (panier, connexion à l'espace investisseur).</li>
      <li>Mémorisation de vos préférences d'affichage (comparateur de produits, notifications lues).</li>
    </ul>
    <p>Ces éléments sont indispensables au fonctionnement du site et ne peuvent pas être désactivés.</p>

    <h2>2. Ce que nous n'utilisons pas</h2>
    <p>
      ELECTRO MEN n'utilise pas de cookies publicitaires, ni de trackers tiers à des fins de ciblage marketing.
    </p>

    <h2>3. Gestion</h2>
    <p>
      Vous pouvez supprimer les données stockées localement à tout moment via les paramètres de votre navigateur.
      Cela réinitialisera votre panier et vous déconnectera de l'espace investisseur.
    </p>
  </LegalPage>
);
