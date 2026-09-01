import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionTimeoutService } from '../../services/auth/sessionTimeoutService';

interface UseSessionTimeoutOptions {
  enabled: boolean;
  onLogout: () => void;
  username?: string;
  checkIntervalMs?: number;
}

export function useSessionTimeout({
  enabled,
  onLogout,
  username,
  checkIntervalMs = 5000,
}: UseSessionTimeoutOptions) {
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Throttling pour éviter d'écrire en localStorage à chaque milliseconde
  const lastWriteRef = useRef<number>(Date.now());
  const THROTTLE_WRITE_MS = 10000; // 10 secondes entre deux mises à jour d'activité

  const recordActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastWriteRef.current > THROTTLE_WRITE_MS) {
      lastWriteRef.current = now;
      sessionTimeoutService.recordUserActivity();
    }
  }, []);

  const handleStayConnected = useCallback(() => {
    lastWriteRef.current = Date.now();
    sessionTimeoutService.recordUserActivity();
    setShowWarningModal(false);
  }, []);

  const handleManualLogout = useCallback(() => {
    setShowWarningModal(false);
    sessionTimeoutService.clearSessionActivity();
    onLogout();
  }, [onLogout]);

  useEffect(() => {
    if (!enabled) {
      setShowWarningModal(false);
      return;
    }

    // Initialiser le timestamp d'activité au montage
    sessionTimeoutService.recordUserActivity();

    // Événements utilisateurs à écouter
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    const onUserInteraction = () => {
      // Si la modale est affichée, l'utilisateur doit cliquer explicitement sur "Rester connecté"
      if (!showWarningModal) {
        recordActivity();
      }
    };

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, onUserInteraction, { passive: true });
    });

    // Écouteur pour synchroniser les activités entre onglets du même navigateur
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === 'gesco_last_activity') {
        const remaining = sessionTimeoutService.getRemainingSessionTime();
        if (remaining > 120000 && showWarningModal) {
          setShowWarningModal(false);
        }
      }
    };
    window.addEventListener('storage', onStorageChange);

    // Intervalle de vérification du temps restant
    const interval = setInterval(() => {
      if (sessionTimeoutService.isSessionExpired()) {
        sessionTimeoutService.logSessionTimeout(username);
        sessionTimeoutService.clearSessionActivity();
        setShowWarningModal(false);
        onLogout();
      } else if (sessionTimeoutService.isWarningThresholdReached()) {
        const remMs = sessionTimeoutService.getRemainingSessionTime();
        setRemainingSeconds(Math.max(1, Math.ceil(remMs / 1000)));
        setShowWarningModal(true);
      } else {
        if (showWarningModal) {
          setShowWarningModal(false);
        }
      }
    }, checkIntervalMs);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, onUserInteraction);
      });
      window.removeEventListener('storage', onStorageChange);
    };
  }, [enabled, onLogout, username, checkIntervalMs, recordActivity, showWarningModal]);

  return {
    showWarningModal,
    remainingSeconds,
    handleStayConnected,
    handleManualLogout,
  };
}

export default useSessionTimeout;
