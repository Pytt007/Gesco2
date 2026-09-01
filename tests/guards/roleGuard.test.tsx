import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGuard } from '../../src/guards';
import * as AuthContextModule from '../../src/context/AuthContext';

describe('RoleGuard & RBAC Route Protection (P2-23)', () => {
  it('hides protected content when no user is logged in', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: null,
      canAccess: () => false,
      userAccounts: [],
      loading: false,
      permissions: [],
      login: vi.fn(),
      logout: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      changePassword: vi.fn(),
      updateUserRole: vi.fn(),
      refreshUserAccounts: vi.fn(),
    });

    render(
      <RoleGuard fallback={<div>Accès Refusé</div>}>
        <div>Contenu Secret Admin</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Contenu Secret Admin')).toBeNull();
    expect(screen.getByText('Accès Refusé')).toBeDefined();
  });

  it('renders content when user has allowed role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { id: 'u1', username: 'admin', role: 'ADMIN_GENERALE', fullName: 'Admin' } as any,
      canAccess: () => true,
      userAccounts: [],
      loading: false,
      permissions: ['DASHBOARD', 'SETTINGS'],
      login: vi.fn(),
      logout: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      changePassword: vi.fn(),
      updateUserRole: vi.fn(),
      refreshUserAccounts: vi.fn(),
    });

    render(
      <RoleGuard allowedRoles={['ADMIN_GENERALE', 'DIRECTEUR']}>
        <div>Panneau d'Administration</div>
      </RoleGuard>
    );

    expect(screen.getByText("Panneau d'Administration")).toBeDefined();
  });

  it('hides content when user role is not in allowedRoles', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { id: 'u2', username: 'caissier', role: 'CAISSIER', fullName: 'Caissier' } as any,
      canAccess: (view) => view === 'FINANCE_PAYMENTS',
      userAccounts: [],
      loading: false,
      permissions: ['FINANCE_PAYMENTS'],
      login: vi.fn(),
      logout: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      changePassword: vi.fn(),
      updateUserRole: vi.fn(),
      refreshUserAccounts: vi.fn(),
    });

    render(
      <RoleGuard allowedRoles={['ADMIN_GENERALE', 'DIRECTEUR']} fallback={<div>Réservé Direction</div>}>
        <div>Configuration Globale</div>
      </RoleGuard>
    );

    expect(screen.queryByText('Configuration Globale')).toBeNull();
    expect(screen.getByText('Réservé Direction')).toBeDefined();
  });

  it('checks requiredView against user permissions', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      currentUser: { id: 'u3', username: 'teacher', role: 'ENSEIGNANT', fullName: 'Enseignant' } as any,
      canAccess: (view) => view === 'NOTES',
      userAccounts: [],
      loading: false,
      permissions: ['NOTES'],
      login: vi.fn(),
      logout: vi.fn(),
      createUser: vi.fn(),
      deleteUser: vi.fn(),
      changePassword: vi.fn(),
      updateUserRole: vi.fn(),
      refreshUserAccounts: vi.fn(),
    });

    render(
      <div>
        <RoleGuard requiredView="NOTES">
          <div>Grille de Saisie des Notes</div>
        </RoleGuard>
        <RoleGuard requiredView="EXPENSES" fallback={<div>Pas accès dépenses</div>}>
          <div>Module Dépenses</div>
        </RoleGuard>
      </div>
    );

    expect(screen.getByText('Grille de Saisie des Notes')).toBeDefined();
    expect(screen.queryByText('Module Dépenses')).toBeNull();
    expect(screen.getByText('Pas accès dépenses')).toBeDefined();
  });
});
