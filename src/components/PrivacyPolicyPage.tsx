import React from 'react';
import { LegalPage } from './LegalPage';

export const PrivacyPolicyPage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalPage title="Politique de Confidentialité" onClose={onClose}>
    <p>
      Cette politique explique quelles données ELECTRO MEN collecte, pourquoi, et comment elles sont protégées,
      que vous soyez client de la boutique ou participant de l'espace investisseur.
    </p>

    <h2>1. Données collectées</h2>
    <p>Boutique : nom, téléphone, email (optionnel), adresse de livraison, historique de commandes.</p>
    <p>
      Espace investisseur : nom complet, téléphone, email, mot de passe (chiffré, jamais stocké en clair),
      historique de participations, transactions et retraits.
    </p>

    <h2>2. Utilisation des données</h2>
    <ul>
      <li>Traiter vos commandes et livraisons.</li>
      <li>Gérer votre compte participant, vos participations et vos retraits.</li>
      <li>Vous contacter concernant une commande ou une participation en cours.</li>
      <li>Respecter nos obligations légales et de traçabilité (journal d'audit).</li>
    </ul>

    <h2>3. Conservation et sécurité</h2>
    <p>
      Les données sont stockées de façon sécurisée (base de données hébergée, accès protégé). Les documents
      financiers (factures, justificatifs) sont stockés dans un espace privé, accessible uniquement via des liens
      temporaires générés à la demande — jamais publiquement accessibles.
    </p>

    <h2>4. Partage des données</h2>
    <p>
      Vos données ne sont jamais vendues. Elles peuvent être partagées avec des prestataires techniques
      strictement nécessaires au fonctionnement du site (hébergement, base de données), et avec les autorités
      compétentes si la loi l'exige.
    </p>

    <h2>5. Vos droits</h2>
    <p>
      Vous pouvez demander l'accès, la correction ou la suppression de vos données personnelles en nous
      contactant via WhatsApp au +226 65 48 47 38.
    </p>
  </LegalPage>
);
