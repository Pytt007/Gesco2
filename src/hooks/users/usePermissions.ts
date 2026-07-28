// ─────────────────────────────────────────────────────────────────────────────
// GESCO — Hook usePermissions
// Gestion et contrôle des permissions granulaires des utilisateurs et rôles
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo } from 'react';
import { DEFAULT_PERMISSIONS } from '../../constants/permissions';
import { UserRole } from '../../types';

export interface PermissionItem {
  code: string;
  module: string;
  label: string;
}

const ALL_SYSTEM_PERMISSIONS: PermissionItem[] = [
  { code: 'DASHBOARD', module: 'Navigation', label: 'Accès au Tableau de Bord' },
  { code: 'STUDENTS', module: 'Scolaire', label: 'Gestion des Élèves' },
  { code: 'CLASSES', module: 'Scolaire', label: 'Gestion des Classes' },
  { code: 'STAFF', module: 'Scolaire', label: 'Gestion du Personnel' },
  { code: 'NOTES', module: 'Scolaire', label: 'Gestion des Notes & Évaluations' },
  { code: 'ACTIVITIES', module: 'Scolaire', label: 'Gestion des Activités' },
  { code: 'CANTEEN', module: 'Services', label: 'Gestion de la Cantine' },
  { code: 'TRANSPORT', module: 'Services', label: 'Gestion du Transport' },
  { code: 'SCOLARITY', module: 'Finance', label: 'Gestion des Frais de Scolarité' },
  { code: 'EXPENSES', module: 'Finance', label: 'Gestion des Dépenses' },
  { code: 'REPORTS', module: 'Finance', label: 'Accès aux Rapports Financiers' },
  { code: 'STATISTICS', module: 'Gestion', label: 'Accès aux Statistiques' },
  { code: 'HISTORY', module: 'Gestion', label: 'Accès à l\'Historique' },
  { code: 'SETTINGS', module: 'Gestion', label: 'Paramètres du Système' },
];

export function usePermissions(role?: UserRole) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Exposer les permissions d'un rôle
  const rolePermissions = useMemo(() => {
    if (!role) return [];
    return DEFAULT_PERMISSIONS[role] || [];
  }, [role]);

  // Vérifier si un rôle possède une permission spécifique
  const checkPermission = useCallback((permissionCode: string, targetRole?: UserRole): boolean => {
    const activeRole = targetRole || role;
    if (!activeRole) return false;
    const perms = DEFAULT_PERMISSIONS[activeRole] || [];
    return perms.includes(permissionCode);
  }, [role]);

  // Obtenir les détails de toutes les permissions système
  const getPermissionsForModule = useCallback((moduleName: string): PermissionItem[] => {
    return ALL_SYSTEM_PERMISSIONS.filter((p) => p.module === moduleName);
  }, []);

  return {
    allPermissions: ALL_SYSTEM_PERMISSIONS,
    rolePermissions,
    loading,
    error,
    checkPermission,
    getPermissionsForModule,
  };
}
