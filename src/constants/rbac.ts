// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Matrice RBAC par Défaut (src/constants/rbac.ts)
// 7 Rôles × 14 Modules × Actions granulaires
// Cette matrice est la référence immuable. Elle est copiée dans localStorage
// lors du premier chargement, puis personnalisable par l'admin.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  RoleDefinition, ModuleMeta, ModuleId, RolePermissions,
  ModulePermission, ActionMeta,
} from '../types/permissions';
import type { UserRole } from '../types/auth';

// ─── Métadonnées des Modules ──────────────────────────────────────────────────

export const MODULES_META: ModuleMeta[] = [
  {
    id: 'STUDENTS', label: 'Élèves', emoji: '🎓', color: '#6366f1', viewId: 'STUDENTS',
    actions: [
      { id: 'view',          label: 'Voir la liste' },
      { id: 'create',        label: 'Inscrire / Créer' },
      { id: 'edit',          label: 'Modifier le dossier' },
      { id: 'archive',       label: 'Archiver' },
      { id: 'delete',        label: 'Supprimer', dangerous: true },
      { id: 'restore',       label: 'Restaurer' },
      { id: 'export',        label: 'Exporter' },
      { id: 'import',        label: 'Importer' },
      { id: 'print',         label: 'Imprimer la fiche' },
      { id: 'generate_doc',  label: 'Générer des documents' },
      { id: 'view_history',  label: 'Voir l\'historique' },
      { id: 'change_class',  label: 'Changer de classe' },
      { id: 'transfer',      label: 'Transférer' },
      { id: 'edit_photo',    label: 'Modifier la photo' },
      { id: 'edit_contacts', label: 'Modifier les responsables' },
    ],
  },
  {
    id: 'CLASSES', label: 'Classes', emoji: '🏫', color: '#7c3aed', viewId: 'CLASSES',
    actions: [
      { id: 'view',           label: 'Voir les classes' },
      { id: 'create',         label: 'Créer une classe' },
      { id: 'edit',           label: 'Modifier' },
      { id: 'delete',         label: 'Supprimer', dangerous: true },
      { id: 'assign_teacher', label: 'Affecter un enseignant' },
      { id: 'close',          label: 'Clôturer la classe' },
      { id: 'print',          label: 'Imprimer la liste' },
    ],
  },
  {
    id: 'STAFF', label: 'Personnel', emoji: '👩‍🏫', color: '#0284c7', viewId: 'STAFF',
    actions: [
      { id: 'view',    label: 'Voir le personnel' },
      { id: 'create',  label: 'Ajouter un agent' },
      { id: 'edit',    label: 'Modifier le dossier' },
      { id: 'archive', label: 'Archiver' },
      { id: 'delete',  label: 'Supprimer', dangerous: true },
      { id: 'export',  label: 'Exporter' },
      { id: 'print',   label: 'Imprimer' },
    ],
  },
  {
    id: 'ATTENDANCE', label: 'Présences', emoji: '✅', color: '#16a34a', viewId: 'ATTENDANCE',
    actions: [
      { id: 'view',     label: 'Voir les absences' },
      { id: 'create',   label: 'Saisir une absence' },
      { id: 'edit',     label: 'Modifier' },
      { id: 'validate', label: 'Valider la feuille' },
      { id: 'export',   label: 'Exporter' },
      { id: 'print',    label: 'Imprimer' },
    ],
  },
  {
    id: 'TIMETABLE', label: 'Emploi du Temps', emoji: '📅', color: '#f59e0b', viewId: 'TIMETABLE',
    actions: [
      { id: 'view',   label: 'Voir l\'emploi du temps' },
      { id: 'create', label: 'Créer un créneau' },
      { id: 'edit',   label: 'Modifier' },
      { id: 'delete', label: 'Supprimer', dangerous: true },
      { id: 'print',  label: 'Imprimer' },
    ],
  },
  {
    id: 'FINANCE', label: 'Finance', emoji: '💰', color: '#16a34a', viewId: 'FINANCE_PAYMENTS',
    actions: [
      { id: 'view',           label: 'Voir les paiements' },
      { id: 'collect',        label: 'Encaisser' },
      { id: 'edit_payment',   label: 'Modifier un paiement' },
      { id: 'cancel_payment', label: 'Annuler un paiement', dangerous: true },
      { id: 'delete_payment', label: 'Supprimer un paiement', dangerous: true },
      { id: 'create_discount','label': 'Créer une remise' },
      { id: 'edit_discount',  label: 'Modifier une remise' },
      { id: 'edit_schedule',  label: 'Modifier l\'échéancier' },
      { id: 'print_receipt',  label: 'Imprimer un reçu' },
      { id: 'export',         label: 'Exporter' },
    ],
  },
  {
    id: 'CANTEEN', label: 'Cantine', emoji: '🍽️', color: '#ea580c', viewId: 'CANTEEN',
    actions: [
      { id: 'view',   label: 'Voir la cantine' },
      { id: 'create', label: 'Ajouter un abonné' },
      { id: 'edit',   label: 'Modifier' },
      { id: 'delete', label: 'Supprimer', dangerous: true },
      { id: 'print',  label: 'Imprimer' },
      { id: 'export', label: 'Exporter' },
    ],
  },
  {
    id: 'TRANSPORT', label: 'Transport', emoji: '🚌', color: '#7c3aed', viewId: 'TRANSPORT',
    actions: [
      { id: 'view',   label: 'Voir les circuits' },
      { id: 'create', label: 'Ajouter un abonné' },
      { id: 'edit',   label: 'Modifier' },
      { id: 'delete', label: 'Supprimer', dangerous: true },
      { id: 'print',  label: 'Imprimer' },
      { id: 'export', label: 'Exporter' },
    ],
  },
  {
    id: 'EXPENSES', label: 'Dépenses', emoji: '📉', color: '#dc2626', viewId: 'EXPENSES',
    actions: [
      { id: 'view',     label: 'Voir les dépenses' },
      { id: 'create',   label: 'Enregistrer une dépense' },
      { id: 'edit',     label: 'Modifier' },
      { id: 'delete',   label: 'Supprimer', dangerous: true },
      { id: 'validate', label: 'Valider' },
      { id: 'export',   label: 'Exporter' },
    ],
  },
  {
    id: 'NOTES', label: 'Notes & Évaluations', emoji: '📝', color: '#0284c7', viewId: 'NOTES',
    actions: [
      { id: 'view',        label: 'Voir les notes' },
      { id: 'create_eval', label: 'Créer une évaluation' },
      { id: 'enter',       label: 'Saisir les notes' },
      { id: 'edit',        label: 'Modifier les notes' },
      { id: 'validate',    label: 'Valider' },
      { id: 'publish',     label: 'Publier les bulletins' },
      { id: 'unpublish',   label: 'Dépublier' },
      { id: 'delete',      label: 'Supprimer', dangerous: true },
      { id: 'print',       label: 'Imprimer les bulletins' },
    ],
  },
  {
    id: 'REPORTS', label: 'Rapports', emoji: '📊', color: '#0284c7', viewId: 'REPORTS',
    actions: [
      { id: 'view',     label: 'Voir les rapports' },
      { id: 'generate', label: 'Générer un rapport' },
      { id: 'export',   label: 'Exporter (PDF/Excel)' },
      { id: 'print',    label: 'Imprimer' },
    ],
  },
  {
    id: 'STATISTICS', label: 'Statistiques', emoji: '📈', color: '#0284c7', viewId: 'STATISTICS',
    actions: [
      { id: 'view',   label: 'Voir les statistiques' },
      { id: 'export', label: 'Exporter' },
    ],
  },
  {
    id: 'HISTORY', label: 'Journal d\'Audit', emoji: '🕵️', color: '#475569', viewId: 'HISTORY',
    actions: [
      { id: 'view',   label: 'Consulter le journal' },
      { id: 'export', label: 'Exporter le journal' },
    ],
  },
  {
    id: 'SETTINGS', label: 'Paramètres', emoji: '⚙️', color: '#64748b', viewId: 'SETTINGS',
    actions: [
      { id: 'view',             label: 'Voir les paramètres' },
      { id: 'create',           label: 'Créer (années, config)' },
      { id: 'edit',             label: 'Modifier la configuration' },
      { id: 'delete',           label: 'Supprimer', dangerous: true },
      { id: 'backup',           label: 'Sauvegarder' },
      { id: 'restore',          label: 'Restaurer une sauvegarde' },
      { id: 'change_year',      label: 'Changer l\'année scolaire' },
      { id: 'edit_permissions', label: 'Modifier les habilitations' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_MODULE_IDS: ModuleId[] = MODULES_META.map((m) => m.id as ModuleId);

/** Crée un ModulePermission avec toutes les actions à la valeur donnée */
function makeModule(
  enabled: boolean,
  actions: Record<string, boolean>,
  restrictions?: ModulePermission['restrictions']
): ModulePermission {
  return { enabled, actions, restrictions };
}

/** Active toutes les actions d'un module */
function allOn(moduleId: ModuleId): ModulePermission {
  const meta = MODULES_META.find((m) => m.id === moduleId)!;
  const actions: Record<string, boolean> = {};
  meta.actions.forEach((a) => { actions[a.id] = true; });
  return { enabled: true, actions };
}

/** Désactive toutes les actions d'un module (accès refusé) */
function allOff(moduleId: ModuleId): ModulePermission {
  const meta = MODULES_META.find((m) => m.id === moduleId)!;
  const actions: Record<string, boolean> = {};
  meta.actions.forEach((a) => { actions[a.id] = false; });
  return { enabled: false, actions };
}

/** Crée une matrice partielle en prenant la liste des actions autorisées */
function partial(moduleId: ModuleId, allowedActions: string[], restrictions?: ModulePermission['restrictions']): ModulePermission {
  const meta = MODULES_META.find((m) => m.id === moduleId)!;
  const actions: Record<string, boolean> = {};
  meta.actions.forEach((a) => { actions[a.id] = allowedActions.includes(a.id); });
  return { enabled: allowedActions.length > 0, actions, restrictions };
}

/** Crée une RolePermissions avec toutes les actions activées */
function fullAccess(): RolePermissions {
  const perms = {} as RolePermissions;
  ALL_MODULE_IDS.forEach((id) => { perms[id] = allOn(id); });
  return perms;
}

/** Crée une RolePermissions avec tous les accès refusés */
function noAccess(): RolePermissions {
  const perms = {} as RolePermissions;
  ALL_MODULE_IDS.forEach((id) => { perms[id] = allOff(id); });
  return perms;
}

// ─── 7 Rôles par Défaut ───────────────────────────────────────────────────────

export const DEFAULT_RBAC_ROLES: RoleDefinition[] = [

  // ── 1. DIRECTEUR ──────────────────────────────────────────────────────────
  {
    id: 'DIRECTEUR',
    label: 'Directeur',
    emoji: '👨‍💼',
    description: 'Accès complet à toutes les fonctionnalités. Supervise l\'établissement.',
    isSystem: true,
    color: '#6366f1',
    permissions: fullAccess(),
  },

  // ── 2. SECRÉTAIRE ─────────────────────────────────────────────────────────
  {
    id: 'SECRETAIRE',
    label: 'Secrétaire',
    emoji: '👩‍💼',
    description: 'Gestion administrative : élèves, classes, présences, emploi du temps.',
    isSystem: true,
    color: '#0284c7',
    permissions: {
      ...noAccess(),
      STUDENTS:   partial('STUDENTS',   ['view','create','edit','archive','print','generate_doc','view_history','change_class','edit_photo','edit_contacts']),
      CLASSES:    partial('CLASSES',    ['view','print']),
      STAFF:      partial('STAFF',      ['view','print']),
      ATTENDANCE: partial('ATTENDANCE', ['view','create','edit','validate','export','print']),
      TIMETABLE:  partial('TIMETABLE',  ['view','print']),
      REPORTS:    partial('REPORTS',    ['view','generate','print']),
      STATISTICS: partial('STATISTICS', ['view']),
    },
  },

  // ── 3. CAISSIER ───────────────────────────────────────────────────────────
  {
    id: 'CAISSIER',
    label: 'Caissier',
    emoji: '💰',
    description: 'Encaissements et suivi financier. Accès limité aux paiements.',
    isSystem: true,
    color: '#16a34a',
    permissions: {
      ...noAccess(),
      STUDENTS: partial('STUDENTS', ['view'], { readOnly: true }),
      FINANCE:  partial('FINANCE',  ['view','collect','print_receipt','export'], {
        noTariffEdit: true,
        noPaymentDelete: true,
      }),
      REPORTS:    partial('REPORTS',    ['view','generate','export','print']),
      STATISTICS: partial('STATISTICS', ['view','export']),
    },
  },

  // ── 4. ENSEIGNANT ─────────────────────────────────────────────────────────
  {
    id: 'ENSEIGNANT',
    label: 'Enseignant',
    emoji: '👨‍🏫',
    description: 'Gestion pédagogique : notes, présences et bulletins de ses classes.',
    isSystem: true,
    color: '#f59e0b',
    permissions: {
      ...noAccess(),
      STUDENTS:   partial('STUDENTS',   ['view','print'],            { ownClassOnly: true, ownStudentsOnly: true }),
      CLASSES:    partial('CLASSES',    ['view'],                    { ownClassOnly: true }),
      ATTENDANCE: partial('ATTENDANCE', ['view','create','edit','validate','print'], { ownClassOnly: true }),
      TIMETABLE:  partial('TIMETABLE',  ['view','print'],            { ownClassOnly: true }),
      NOTES:      partial('NOTES',      ['view','create_eval','enter','edit','validate','publish','unpublish','print'], { ownClassOnly: true, ownSubjectOnly: true }),
      REPORTS:    partial('REPORTS',    ['view','generate','print'],  { ownClassOnly: true }),
      STATISTICS: partial('STATISTICS', ['view']),
    },
  },

  // ── 5. RESPONSABLE CANTINE ────────────────────────────────────────────────
  {
    id: 'RESP_CANTINE',
    label: 'Responsable Cantine',
    emoji: '🍽️',
    description: 'Gestion complète du service de cantine et des abonnements.',
    isSystem: true,
    color: '#ea580c',
    permissions: {
      ...noAccess(),
      STUDENTS: partial('STUDENTS', ['view'], { readOnly: true }),
      CANTEEN:  allOn('CANTEEN'),
      REPORTS:  partial('REPORTS',  ['view','generate','print']),
    },
  },

  // ── 6. RESPONSABLE TRANSPORT ──────────────────────────────────────────────
  {
    id: 'RESP_TRANSPORT',
    label: 'Responsable Transport',
    emoji: '🚌',
    description: 'Gestion des circuits de transport et des abonnements élèves.',
    isSystem: true,
    color: '#7c3aed',
    permissions: {
      ...noAccess(),
      STUDENTS:  partial('STUDENTS',  ['view'], { readOnly: true }),
      TRANSPORT: allOn('TRANSPORT'),
      REPORTS:   partial('REPORTS',   ['view','generate','print']),
    },
  },

  // ── 7. ADMINISTRATEUR SYSTÈME ─────────────────────────────────────────────
  {
    id: 'ADMIN_SYSTEME',
    label: 'Administrateur Système',
    emoji: '⚙️',
    description: 'Accès complet incluant la configuration système et les habilitations.',
    isSystem: true,
    color: '#0f172a',
    permissions: fullAccess(),
  },
];

// ─── Mapping UserRole → RBAC RoleId ──────────────────────────────────────────
// Rétrocompatibilité : les comptes existants sont mappés vers les nouveaux rôles

export const USER_ROLE_TO_RBAC: Record<UserRole, string> = {
  ADMIN_GENERALE:      'ADMIN_SYSTEME',
  FINANCE:             'CAISSIER',
  SCOLAIRE_ENSEIGNANT: 'ENSEIGNANT',
  CANTINE_TRANSPORT:   'RESP_CANTINE',
  DIRECTEUR:           'DIRECTEUR',
  SECRETAIRE:          'SECRETAIRE',
  CAISSIER:            'CAISSIER',
  ENSEIGNANT:          'ENSEIGNANT',
  RESP_CANTINE:        'RESP_CANTINE',
  RESP_TRANSPORT:      'RESP_TRANSPORT',
};

// ─── Export flat des modules (pour la sidebar canAccess rétrocompat) ──────────

export const RBAC_MODULE_TO_VIEW: Record<ModuleId, string> = {
  STUDENTS:   'STUDENTS',
  CLASSES:    'CLASSES',
  STAFF:      'STAFF',
  ATTENDANCE: 'ATTENDANCE',
  TIMETABLE:  'TIMETABLE',
  FINANCE:    'FINANCE_PAYMENTS',
  CANTEEN:    'CANTEEN',
  TRANSPORT:  'TRANSPORT',
  EXPENSES:   'EXPENSES',
  NOTES:      'NOTES',
  REPORTS:    'REPORTS',
  STATISTICS: 'STATISTICS',
  HISTORY:    'HISTORY',
  SETTINGS:   'SETTINGS',
};
