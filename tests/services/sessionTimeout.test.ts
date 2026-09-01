import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sessionTimeoutService,
  SESSION_STORAGE_ACTIVITY_KEY,
  DEFAULT_INACTIVITY_TIMEOUT_MS,
  DEFAULT_WARNING_BEFORE_TIMEOUT_MS,
} from '../../src/services/auth/sessionTimeoutService';

describe('sessionTimeoutService Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionTimeoutService.configureTimeouts(DEFAULT_INACTIVITY_TIMEOUT_MS, DEFAULT_WARNING_BEFORE_TIMEOUT_MS);
    sessionTimeoutService.clearSessionActivity();
  });

  it('records user activity and updates localStorage timestamp', () => {
    const before = Date.now();
    sessionTimeoutService.recordUserActivity();
    const after = Date.now();

    const last = sessionTimeoutService.getLastActivity();
    expect(last).toBeGreaterThanOrEqual(before);
    expect(last).toBeLessThanOrEqual(after);

    const stored = localStorage.getItem(SESSION_STORAGE_ACTIVITY_KEY);
    expect(stored).toBe(last.toString());
  });

  it('calculates remaining session time correctly', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    sessionTimeoutService.recordUserActivity();
    expect(sessionTimeoutService.getRemainingSessionTime()).toBe(DEFAULT_INACTIVITY_TIMEOUT_MS);

    // Avancer de 10 minutes
    vi.spyOn(Date, 'now').mockReturnValue(now + 10 * 60 * 1000);
    expect(sessionTimeoutService.getRemainingSessionTime()).toBe(20 * 60 * 1000);

    vi.restoreAllMocks();
  });

  it('detects when session is active vs expired', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    sessionTimeoutService.recordUserActivity();
    expect(sessionTimeoutService.isSessionExpired()).toBe(false);

    // Avancer au-delà du timeout (31 minutes)
    vi.spyOn(Date, 'now').mockReturnValue(now + 31 * 60 * 1000);
    expect(sessionTimeoutService.isSessionExpired()).toBe(true);

    vi.restoreAllMocks();
  });

  it('detects warning threshold when approaching expiration (2 minutes remaining)', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    sessionTimeoutService.recordUserActivity();
    expect(sessionTimeoutService.isWarningThresholdReached()).toBe(false);

    // Avancer à 28 min 30 s (1 min 30 s restantes)
    vi.spyOn(Date, 'now').mockReturnValue(now + 28.5 * 60 * 1000);
    expect(sessionTimeoutService.isWarningThresholdReached()).toBe(true);

    // Avancer au-delà de l'expiration (0 ms restante)
    vi.spyOn(Date, 'now').mockReturnValue(now + 30.1 * 60 * 1000);
    expect(sessionTimeoutService.isWarningThresholdReached()).toBe(false);

    vi.restoreAllMocks();
  });

  it('clears session activity on logout', () => {
    sessionTimeoutService.recordUserActivity();
    expect(localStorage.getItem(SESSION_STORAGE_ACTIVITY_KEY)).toBeTruthy();

    sessionTimeoutService.clearSessionActivity();
    expect(localStorage.getItem(SESSION_STORAGE_ACTIVITY_KEY)).toBeNull();
  });

  it('supports custom timeout configurations', () => {
    sessionTimeoutService.configureTimeouts(60000, 10000); // 1 minute timeout, 10s warning
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    sessionTimeoutService.recordUserActivity();
    expect(sessionTimeoutService.getRemainingSessionTime()).toBe(60000);

    // 55 secondes passées (5s restantes -> dans la zone d'alerte de 10s)
    vi.spyOn(Date, 'now').mockReturnValue(now + 55000);
    expect(sessionTimeoutService.isWarningThresholdReached()).toBe(true);
    expect(sessionTimeoutService.isSessionExpired()).toBe(false);

    // 61 secondes passées -> expiré
    vi.spyOn(Date, 'now').mockReturnValue(now + 61000);
    expect(sessionTimeoutService.isSessionExpired()).toBe(true);

    vi.restoreAllMocks();
  });
});
