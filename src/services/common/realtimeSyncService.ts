export interface DataChangeEvent { table: string; action: string; data?: any; timestamp: number; }
type ChangeListener = (event: DataChangeEvent) => void;
const listeners = new Set<ChangeListener>();
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('gesco-data-changes');
function notify(event: DataChangeEvent) {
  listeners.forEach(listener => {
    try { listener(event); } catch (error) { console.error('[GESCO] Synchronisation', error); }
  });
}
if (channel) channel.onmessage = ({ data }) => {
  if (data && typeof data.table === 'string') notify(data);
};
// Send invalidations only, without student or financial information.
export function broadcastDataChange(table: string, action = 'update', _data?: any) {
  const event = { table, action, timestamp: Date.now() };
  notify(event);
  channel?.postMessage(event);
}
export function subscribeToDataChanges(callback: ChangeListener): () => void {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}
