/**
 * GESCO — Service de Télémétrie et Monitoring des Erreurs en Production
 * Collecte, anonymise et journalise les anomalies sans exposer de données personnelles.
 */

export interface TelemetryErrorEvent {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  userRole?: string;
  severity: 'FATAL' | 'ERROR' | 'WARNING';
}

const errorBuffer: TelemetryErrorEvent[] = [];
const MAX_BUFFER_SIZE = 50;

/**
 * Anonymise et supprime les informations sensibles d'un texte d'erreur
 */
function sanitizeMessage(message: string): string {
  if (!message) return 'Erreur inconnue';
  return message
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    .replace(/(\+225\s?|\b0[157]\d{8}\b)/g, '[PHONE_REDACTED]')
    .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[JWT_REDACTED]');
}

export const errorTelemetryService = {
  /**
   * Enregistre et traite une exception applicative
   */
  captureException(
    error: Error | any,
    context?: { componentStack?: string; userRole?: string; severity?: 'FATAL' | 'ERROR' | 'WARNING' }
  ): TelemetryErrorEvent {
    const rawMessage = error?.message || (typeof error === 'string' ? error : 'Erreur applicative non identifiée');
    const sanitizedMsg = sanitizeMessage(rawMessage);

    const event: TelemetryErrorEvent = {
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      message: sanitizedMsg,
      stack: error?.stack ? sanitizeMessage(error.stack) : undefined,
      componentStack: context?.componentStack ? sanitizeMessage(context.componentStack) : undefined,
      url: typeof window !== 'undefined' ? window.location.pathname : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      userRole: context?.userRole || 'ANONYMOUS',
      severity: context?.severity || 'ERROR',
    };

    errorBuffer.unshift(event);
    if (errorBuffer.length > MAX_BUFFER_SIZE) {
      errorBuffer.pop();
    }

    if (import.meta.env.DEV) {
      console.error('[GESCO Telemetry Captured]:', event);
    }

    return event;
  },

  /**
   * Récupère le tampon d'erreurs en mémoire pour le diagnostic
   */
  getRecentErrors(): TelemetryErrorEvent[] {
    return [...errorBuffer];
  },

  /**
   * Nettoie le tampon d'erreurs
   */
  clearErrors(): void {
    errorBuffer.length = 0;
  },
};
