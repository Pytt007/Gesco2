import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const recovery = vi.hoisted(() => ({ request: vi.fn(), complete: vi.fn() }));
vi.mock('../../src/services/auth/passwordRecoveryService', () => ({
  requestPasswordRecovery: recovery.request, completePasswordRecovery: recovery.complete,
}));
import PasswordRecoveryPage from '../../src/pages/PasswordRecoveryPage';

beforeEach(() => {
  vi.clearAllMocks();
  recovery.request.mockResolvedValue(undefined);
  recovery.complete.mockResolvedValue(undefined);
  window.history.replaceState(null, '', '/reset-password');
});
afterEach(cleanup);
describe('Password recovery page', () => {
  it('requests a link only after submission and uses a non-enumerating confirmation', async () => {
    render(<PasswordRecoveryPage />);
    expect(recovery.request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Identifiant admin ou adresse e-mail'), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le lien de récupération' }));
    await screen.findByRole('status');
    expect(recovery.request).toHaveBeenCalledWith('admin');
    expect(screen.getByRole('status').textContent).toContain('Si ce compte');
  });
  it('removes the token from history and validates confirmation before resetting', async () => {
    window.history.replaceState(null, '', '/reset-password?token=test-only-token');
    render(<PasswordRecoveryPage />);
    expect(window.location.search).toBe('');
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'new-test-password' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'different-test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));
    expect(screen.getByRole('alert').textContent).toContain('ne correspondent pas');
    expect(recovery.complete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'new-test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));
    await screen.findByRole('status');
    expect(recovery.complete).toHaveBeenCalledWith('test-only-token', 'new-test-password');
    expect(screen.queryByLabelText('Nouveau mot de passe')).toBeNull();
    expect(screen.getByRole('link', { name: 'Retour à la connexion' }).getAttribute('href')).toBe('/');
  });
  it('offers a fresh request when the provider returns an expired-link error', () => {
    window.history.replaceState(null, '', '/reset-password?error=INVALID_TOKEN');
    render(<PasswordRecoveryPage />);
    expect(screen.getByRole('alert').textContent).toContain('invalide ou expiré');
    expect(screen.getByRole('button', { name: 'Envoyer le lien de récupération' })).toBeDefined();
    expect(window.location.search).toBe('');
  });
  it('keeps the retry form when reset fails', async () => {
    recovery.complete.mockRejectedValue(new Error('Lien expiré'));
    window.history.replaceState(null, '', '/reset-password?token=expired-test-token');
    render(<PasswordRecoveryPage />);
    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'new-test-password' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'new-test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le nouveau mot de passe' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Lien expiré'));
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Demander un nouveau lien' }));
    expect(screen.getByLabelText('Identifiant admin ou adresse e-mail')).toBeDefined();
  });
});
