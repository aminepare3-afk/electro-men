import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Une fois qu'une nouvelle version du site prend le contrôle (Service Worker mis à
// jour), on recharge la page une seule fois pour charger le nouveau code — évite
// d'avoir à actualiser plusieurs fois manuellement pour voir les changements.
if ('serviceWorker' in navigator) {
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
