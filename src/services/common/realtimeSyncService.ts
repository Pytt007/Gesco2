import { supabase } from './supabaseClient';

export interface DataChangeEvent {
  table: string;
  action: 'insert' | 'update' | 'delete' | 'upsert' | string;
  data?: any;
  timestamp: number;
}

type ChangeListener = (event: DataChangeEvent) => void;

const listeners = new Set<ChangeListener>();

// Unique global channel for high-speed broadcast synchronization
const globalChannel = typeof supabase?.channel === 'function' ? supabase.channel('gesco-global-sync') : null;

if (globalChannel && typeof globalChannel.on === 'function') {
  globalChannel
    .on('broadcast', { event: 'db_change' }, ({ payload }: { payload: DataChangeEvent }) => {
      if (payload && payload.table) {
        listeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error('[realtimeSyncService] Listener error:', e);
          }
        });
      }
    })
    .subscribe();
}

/**
 * Notifie instantanément tous les autres utilisateurs connectés d'un changement de données.
 */
export function broadcastDataChange(table: string, action: 'insert' | 'update' | 'delete' | 'upsert' | string = 'update', data?: any) {
  try {
    const payload: DataChangeEvent = {
      table,
      action,
      data,
      timestamp: Date.now(),
    };

    if (globalChannel && typeof globalChannel.send === 'function') {
      globalChannel.send({
        type: 'broadcast',
        event: 'db_change',
        payload,
      });
    }
  } catch (err) {
    console.warn('[realtimeSyncService] broadcastDataChange error:', err);
  }
}

/**
 * S'abonne aux notifications de synchronisation temps réel.
 */
export function subscribeToDataChanges(callback: ChangeListener): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
