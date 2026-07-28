// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Types Communs, Notifications et Logs
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  message: string;
}

export type ActivityLogModule =
  | 'Scolarité' | 'Finance' | 'RH' | 'Système' | 'Communication'
  | 'Cantine' | 'Transport' | 'Classes' | 'Élèves' | 'Activités';

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  module: ActivityLogModule;
  user: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete' | 'warning' | 'info';
  oldValue?: string;
  newValue?: string;
  schoolYear?: string;
}
