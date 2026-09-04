// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Constantes Permissions & Rôles (Nouvelle Architecture Domaines Métiers)
// ─────────────────────────────────────────────────────────────────────────────

import { UserRole } from '../types/auth';

// Tous les modules accessibles par rôle
export const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  // 🔑 Directeur / Admin Général — Accès total
  ADMIN_GENERALE: [
    'DASHBOARD',
    'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'ATTENDANCE', 'STAFF_ATTENDANCE', 'TIMETABLE', 'NOTES', 'BULLETINS', 'REPORT_CARDS',
    'FINANCE_PAYMENTS', 'FINANCE_TRACKING',
    'CANTEEN', 'TRANSPORT', 'EXPENSES',
    'REPORTS', 'STATISTICS', 'HISTORY',
    'SETTINGS',
    'SCOLARITY', 'ACTIVITIES',
  ],
  DIRECTEUR: [
    'DASHBOARD',
    'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'ATTENDANCE', 'STAFF_ATTENDANCE', 'TIMETABLE', 'NOTES', 'BULLETINS', 'REPORT_CARDS',
    'FINANCE_PAYMENTS', 'FINANCE_TRACKING',
    'CANTEEN', 'TRANSPORT', 'EXPENSES',
    'REPORTS', 'STATISTICS', 'HISTORY',
    'SETTINGS',
    'SCOLARITY', 'ACTIVITIES',
  ],

  // 💰 Caissier — Finance uniquement
  FINANCE: [
    'DASHBOARD',
    'FINANCE_PAYMENTS',
    'FINANCE_TRACKING',
    'SCOLARITY',
  ],
  CAISSIER: [
    'DASHBOARD',
    'FINANCE_PAYMENTS',
    'FINANCE_TRACKING',
    'SCOLARITY',
  ],

  // 🎓 Enseignant / Secrétaire — Scolarité
  SCOLAIRE_ENSEIGNANT: [
    'DASHBOARD',
    'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'ATTENDANCE', 'STAFF_ATTENDANCE', 'TIMETABLE', 'NOTES', 'BULLETINS', 'REPORT_CARDS',
    'STATISTICS',
    'ACTIVITIES',
  ],
  SECRETAIRE: [
    'DASHBOARD',
    'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'ATTENDANCE', 'STAFF_ATTENDANCE', 'TIMETABLE', 'NOTES', 'BULLETINS', 'REPORT_CARDS',
    'STATISTICS',
    'ACTIVITIES',
  ],
  ENSEIGNANT: [
    'DASHBOARD',
    'STUDENTS', 'PARENTS', 'CLASSES', 'STAFF', 'ATTENDANCE', 'STAFF_ATTENDANCE', 'TIMETABLE', 'NOTES', 'BULLETINS', 'REPORT_CARDS',
    'STATISTICS',
    'ACTIVITIES',
  ],

  // 🏢 Cantine & Transport
  CANTINE_TRANSPORT: [
    'DASHBOARD',
    'CANTEEN', 'TRANSPORT',
  ],
  RESP_CANTINE: [
    'DASHBOARD',
    'CANTEEN',
  ],
  RESP_TRANSPORT: [
    'DASHBOARD',
    'TRANSPORT',
  ],
};

// 🛡️ Support et rétrocompatibilité des alias de rôles
(DEFAULT_PERMISSIONS as any).ADMIN = DEFAULT_PERMISSIONS.ADMIN_GENERALE;
(DEFAULT_PERMISSIONS as any).ADMIN_GENERAL = DEFAULT_PERMISSIONS.ADMIN_GENERALE;
(DEFAULT_PERMISSIONS as any).COMPTABLE = DEFAULT_PERMISSIONS.FINANCE;

export const ROLE_LABELS: Record<string, string> = {
  ADMIN_GENERALE:      'Admin Général',
  DIRECTEUR:           'Directeur (Propriétaire)',
  FINANCE:             'Caissier / Finance',
  CAISSIER:            'Caissier',
  SCOLAIRE_ENSEIGNANT: 'Enseignant',
  ENSEIGNANT:          'Enseignant',
  SECRETAIRE:          'Secrétaire',
  CANTINE_TRANSPORT:   'Cantine & Transport',
  RESP_CANTINE:        'Responsable Cantine',
  RESP_TRANSPORT:      'Responsable Transport',
};

export const ROLE_MODULES: Record<UserRole, string[]> = {
  ADMIN_GENERALE: ['Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Présences', 'Emploi du Temps', 'Notes & Éval.', 'Encaissements', 'Dossiers Financiers', 'Cantine', 'Transport', 'Dépenses', 'Rapports', 'Statistiques', 'Journal d\'Audit', 'Paramètres'],
  DIRECTEUR: ['Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Présences', 'Emploi du Temps', 'Notes & Éval.', 'Encaissements', 'Dossiers Financiers', 'Cantine', 'Transport', 'Dépenses', 'Rapports', 'Statistiques', 'Journal d\'Audit', 'Paramètres'],
  FINANCE: ['Dashboard', 'Encaissements', 'Dossiers Financiers'],
  CAISSIER: ['Dashboard', 'Encaissements', 'Dossiers Financiers'],
  SCOLAIRE_ENSEIGNANT: ['Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Présences', 'Emploi du Temps', 'Notes & Éval.', 'Bulletins', 'Statistiques'],
  SECRETAIRE: ['Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Présences', 'Emploi du Temps', 'Notes & Éval.', 'Bulletins', 'Statistiques'],
  ENSEIGNANT: ['Dashboard', 'Élèves', 'Parents', 'Classes', 'Personnel', 'Présences', 'Emploi du Temps', 'Notes & Éval.', 'Bulletins', 'Statistiques'],
  CANTINE_TRANSPORT: ['Dashboard', 'Cantine', 'Transport'],
  RESP_CANTINE: ['Dashboard', 'Cantine'],
  RESP_TRANSPORT: ['Dashboard', 'Transport'],
};
