import { useEffect, useRef } from 'react';
import { subscribeToDataChanges } from '../services/common/realtimeSyncService';
export interface RealtimeSyncOptions {
  tables: string[];
  onDataChange: (payload: { table: string; eventType: string; newRow?: any; oldRow?: any }) => void;
  enabled?: boolean;
}
/** Local invalidation and periodic refresh for changes on other devices. */
export function useRealtimeSync({ tables, onDataChange, enabled = true }: RealtimeSyncOptions) {
  const callback = useRef(onDataChange);
  callback.current = onDataChange;
  const tableKey = tables.join(',');
  useEffect(() => {
    if (!enabled || !tableKey) return;
    const watched = tableKey.split(',');
    const refresh = () => {
      if (document.visibilityState === 'visible') callback.current({ table: watched[0], eventType: 'refresh' });
    };
    const unsubscribe = subscribeToDataChanges(event => {
      if (watched.includes(event.table) || watched.includes('*')) callback.current({ table: event.table, eventType: event.action });
    });
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      unsubscribe(); clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [tableKey, enabled]);
}
