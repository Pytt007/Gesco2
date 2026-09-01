import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export interface RoleGuardProps {
  allowedRoles?: UserRole[];
  requiredView?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Garde d'affichage déclaratif basé sur le rôle et les permissions RBAC
 */
export function RoleGuard({
  allowedRoles,
  requiredView,
  fallback = null,
  children,
}: RoleGuardProps) {
  const { currentUser, canAccess } = useAuth();

  // Utilisateur non connecté -> accès refusé
  if (!currentUser) {
    return <>{fallback}</>;
  }

  // Filtrage par rôles autorisés
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    return <>{fallback}</>;
  }

  // Filtrage par identifiant de vue accessible
  if (requiredView && !canAccess(requiredView)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
