import { useEffect, useRef } from 'react';
import { supabase } from '../services/common/supabaseClient';
import { subscribeToDataChanges, DataChangeEvent } from '../services/common/realtimeSyncService';

export interface RealtimeSyncOptions {
  tables: string[];
  onDataChange: (payload: { table: string; eventType: string; newRow?: any; oldRow?: any }) => void;
  enabled?: boolean;
}

/**
 * Hook React permettant de synchroniser en temps réel les données d'une page/composant
 * avec Supabase dès qu'un autre utilisateur modifie la base de données.
 */
export function useRealtimeSync({ tables, onDataChange, enabled = true }: RealtimeSyncOptions) {
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  useEffect(() => {
    if (!enabled || !tables || tables.length === 0) return;

    // 1. Écoute via Broadcast rapide (Multi-utilisateurs instantané)
    const unsubscribeBroadcast = subscribeToDataChanges((event: DataChangeEvent) => {
      if (tables.includes(event.table) || tables.includes('*')) {
        if (onDataChangeRef.current) {
          onDataChangeRef.current({
            table: event.table,
            eventType: event.action,
            newRow: event.data,
          });
        }
      }
    });

    // 2. Écoute via Postgres CDC changes
    const channelName = `realtime-sync-${tables.sort().join('-')}-${Date.now()}`;
    let channel = supabase.channel(channelName);

    for (const table of tables) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: any) => {
          if (onDataChangeRef.current) {
            onDataChangeRef.current({
              table,
              eventType: payload.eventType,
              newRow: payload.new,
              oldRow: payload.old,
            });
          }
        }
      );
    }

    channel.subscribe();

    return () => {
      unsubscribeBroadcast();
      supabase.removeChannel(channel);
    };
  }, [tables.join(','), enabled]);
}
