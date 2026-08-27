import React from 'react';
import { LegalPage } from './LegalPage';

export const TermsPage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalPage title="Conditions Générales d'Utilisation" onClose={onClose}>
    <h2>1. Boutique</h2>
    <p>
      Les commandes passées sur ELECTRO MEN sont soumises à disponibilité du stock. Le paiement s'effectue par
      mobile money (Orange Money, Moov Money) ou en espèces à la livraison, selon les modalités affichées lors de
      la commande. Toute commande est confirmée manuellement par notre équipe avant expédition.
    </p>

    <h2>2. Espace Investisseur — financement d'opérations d'importation</h2>
    <p>
      L'espace investisseur permet à un participant de proposer un financement pour une opération d'importation
      de composants électroniques identifiée sur la plateforme, en échange d'une part proportionnelle du résultat
      (bénéfice ou perte) de cette opération.
    </p>
    <ul>
      <li>
        Une demande de participation n'est prise en compte qu'après vérification manuelle, par ELECTRO MEN, de la
        réception effective du paiement envoyé par le participant.
      </li>
      <li>
        Le résultat d'une opération (bénéfice ou perte) est déterminé par ELECTRO MEN à la clôture de l'opération
        et réparti entre les participants au prorata de leur participation confirmée.
      </li>
      <li>
        <strong>Aucun rendement n'est garanti.</strong> Une opération peut générer une perte partielle ou totale
        du capital engagé. Le participant reconnaît prendre cette décision en connaissance de cause.
      </li>
      <li>
        Les retraits de solde disponible sont traités après vérification manuelle par ELECTRO MEN et peuvent
        prendre un délai raisonnable de traitement.
      </li>
    </ul>

    <h2>3. Compte utilisateur</h2>
    <p>
      Chaque participant est responsable de la confidentialité de ses identifiants de connexion. ELECTRO MEN se
      réserve le droit de suspendre un compte en cas d'usage frauduleux suspecté.
    </p>

    <h2>4. Modification des conditions</h2>
    <p>
      ELECTRO MEN peut modifier ces conditions à tout moment. Les participants seront informés de tout changement
      substantiel affectant les opérations en cours.
    </p>

    <h2>5. Contact</h2>
    <p>Pour toute question relative à ces conditions, contactez-nous via WhatsApp au +226 65 48 47 38.</p>
  </LegalPage>
);
