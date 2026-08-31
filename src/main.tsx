import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import { errorTelemetryService } from './services/monitoring/errorTelemetryService';

// Gestion globale des exceptions non interceptées
window.addEventListener('unhandledrejection', (event) => {
  console.warn('[GESCO System] Rejet de promesse asynchrone intercepté:', event.reason);
  errorTelemetryService.captureException(event.reason || new Error('Unhandled Promise Rejection'), {
    severity: 'ERROR',
  });
});

window.addEventListener('error', (event) => {
  console.warn('[GESCO System] Erreur d\'exécution interceptée:', event.message);
  errorTelemetryService.captureException(event.error || new Error(event.message), {
    severity: 'ERROR',
  });
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
