import React from 'react';
import { LegalPage } from './LegalPage';

export const AboutPage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <LegalPage title="À propos d'ELECTRO MEN" onClose={onClose}>
    <p>
      ELECTRO MEN est une boutique basée au Burkina Faso, spécialisée dans la vente de composants électroniques
      (microcontrôleurs, circuits intégrés, capteurs, modules) et le sourcing sur-mesure pour les particuliers,
      étudiants, ateliers et entreprises.
    </p>

    <h2>Notre activité</h2>
    <p>
      Nous proposons un catalogue de composants électroniques originaux, un service de commande sur-mesure pour les
      références non disponibles en stock, ainsi qu'un accompagnement client via WhatsApp.
    </p>

    <h2>Espace Investisseur</h2>
    <p>
      ELECTRO MEN propose également un espace permettant à des participants de financer des opérations
      d'importation spécifiques de composants électroniques, en échange d'une part du résultat (bénéfice ou perte)
      de l'opération concernée. Ce mécanisme est décrit en détail dans nos Conditions d'Utilisation.
    </p>

    <h2>Contact</h2>
    <p>
      WhatsApp : +226 65 48 47 38<br />
      Zone de service : Ouagadougou et expédition dans tout le Burkina Faso.
    </p>
  </LegalPage>
);
