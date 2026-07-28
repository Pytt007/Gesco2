// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Constantes Permissions & Rôles
// ─────────────────────────────────────────────────────────────────────────────

import { UserRole } from '../types/auth';

export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN_GENERALE: [
    'DASHBOARD', 'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'TIMETABLE', 'ATTENDANCE', 'STAFF_ATTENDANCE', 'CANTEEN', 'TRANSPORT',
    'ACTIVITIES', 'SCOLARITY', 'EXPENSES', 'REPORTS', 'HISTORY',
    'STATISTICS', 'SETTINGS', 'NOTES',
  ],
  FINANCE: ['DASHBOARD', 'SCOLARITY', 'EXPENSES', 'REPORTS', 'STATISTICS'],
  SCOLAIRE_ENSEIGNANT: ['DASHBOARD', 'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'TIMETABLE', 'ATTENDANCE', 'STAFF_ATTENDANCE', 'ACTIVITIES', 'STATISTICS', 'NOTES'],
  CANTINE_TRANSPORT: ['DASHBOARD', 'CANTEEN', 'TRANSPORT'],
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN_GENERALE:      'Admin Général',
  FINANCE:             'Finance',
  SCOLAIRE_ENSEIGNANT: 'Scolaire',
  CANTINE_TRANSPORT:   'Cantine & Transport',
};

export const ROLE_MODULES: Record<UserRole, string[]> = {
  ADMIN_GENERALE: ['Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Cantine', 'Transport', 'Activités', 'Scolarité', 'Dépenses', 'Rapports', 'Historique', 'Statistiques', 'Paramètres', 'Notes'],
  FINANCE: ['Dashboard', 'Scolarité', 'Dépenses', 'Rapports', 'Statistiques'],
  SCOLAIRE_ENSEIGNANT: ['Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Activités', 'Statistiques', 'Notes'],
  CANTINE_TRANSPORT: ['Dashboard', 'Cantine', 'Transport'],
};
