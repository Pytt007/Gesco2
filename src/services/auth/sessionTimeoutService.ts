/**
 * GESCO — Service de Surveillance et Timeout de Session
 * Gère l'expiration d'inactivité et la synchronisation multi-onglets de session.
 */

import { auditLogService } from '../common/auditLogService';

export const SESSION_STORAGE_ACTIVITY_KEY = 'gesco_last_activity';

// 30 minutes d'inactivité par défaut (en millisecondes)
export const DEFAULT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// Avertissement affiché 2 minutes avant déconnexion automatique (en millisecondes)
export const DEFAULT_WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000;

class SessionTimeoutService {
  private timeoutMs: number = DEFAULT_INACTIVITY_TIMEOUT_MS;
  private warningMs: number = DEFAULT_WARNING_BEFORE_TIMEOUT_MS;
  private lastActivityCache: number = Date.now();

  constructor() {
    this.initActivityFromStorage();
  }

  private initActivityFromStorage(): void {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_ACTIVITY_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          this.lastActivityCache = parsed;
        }
      }
    } catch {}
  }

  /**
   * Enregistre une interaction utilisateur (rafraîchit le timestamp d'activité).
   */
  public recordUserActivity(): void {
    const now = Date.now();
    this.lastActivityCache = now;
    try {
      localStorage.setItem(SESSION_STORAGE_ACTIVITY_KEY, now.toString());
    } catch {}
  }

  /**
   * Récupère le timestamp de la dernière activité enregistrée (inter-onglets).
   */
  public getLastActivity(): number {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_ACTIVITY_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          this.lastActivityCache = parsed;
          return parsed;
        }
      }
    } catch {}
    return this.lastActivityCache;
  }

  /**
   * Vérifie si la session est expirée pour cause d'inactivité.
   */
  public isSessionExpired(): boolean {
    const last = this.getLastActivity();
    const elapsed = Date.now() - last;
    return elapsed >= this.timeoutMs;
  }

  /**
   * Calcule le temps restant en millisecondes avant la déconnexion automatique.
   */
  public getRemainingSessionTime(): number {
    const last = this.getLastActivity();
    const elapsed = Date.now() - last;
    const remaining = this.timeoutMs - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Indique si l'application doit afficher la modale d'alerte avant expiration.
   */
  public isWarningThresholdReached(): boolean {
    const remaining = this.getRemainingSessionTime();
    return remaining > 0 && remaining <= this.warningMs;
  }

  /**
   * Journalise la fin de session par inactivité dans les logs d'audit.
   */
  public logSessionTimeout(username?: string): void {
    auditLogService.log({
      action: 'DECONNEXION_INACTIVITE',
      module: 'AUTH',
      details: `Session de l'utilisateur "${username || 'Session courante'}" clôturée automatiquement après ${Math.round(this.timeoutMs / 60000)} minutes d'inactivité.`,
      severity: 'INFO',
    });
  }

  /**
   * Nettoie les données de session lors d'une déconnexion explicite.
   */
  public clearSessionActivity(): void {
    this.lastActivityCache = 0;
    try {
      localStorage.removeItem(SESSION_STORAGE_ACTIVITY_KEY);
    } catch {}
  }

  /**
   * Configure les durées de timeout (pour tests ou configuration établissement).
   */
  public configureTimeouts(timeoutMs: number, warningMs: number): void {
    this.timeoutMs = timeoutMs;
    this.warningMs = warningMs;
  }
}

export const sessionTimeoutService = new SessionTimeoutService();
