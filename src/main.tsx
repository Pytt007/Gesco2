import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Gestion globale des exceptions non interceptées
window.addEventListener('unhandledrejection', (event) => {
  console.warn('[GESCO System] Rejet de promesse asynchrone intercepté:', event.reason);
});

window.addEventListener('error', (event) => {
  console.warn('[GESCO System] Erreur d\'exécution interceptée:', event.message);
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
