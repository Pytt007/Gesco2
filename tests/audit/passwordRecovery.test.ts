import { beforeEach, describe, expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => ({ request: vi.fn(), reset: vi.fn() }));
vi.mock('../../src/services/common/supabaseClient', () => ({
  usernameToEmail: (value: string) => value.includes('@') ? value : value + '@gesco-v1.local',
  supabase: { auth: { resetPasswordForEmail: auth.request, getBetterAuthInstance: () => ({ resetPassword: auth.reset }) } },
}));
import { completePasswordRecovery, requestPasswordRecovery } from '../../src/services/auth/passwordRecoveryService';
beforeEach(() => {
  vi.clearAllMocks();
  auth.request.mockResolvedValue({ error: null });
  auth.reset.mockResolvedValue({ error: null });
});
describe('Password recovery with Neon Auth', () => {
  it('uses the private server-side admin alias and a same-origin callback', async () => {
    await requestPasswordRecovery(' Admin ');
    expect(auth.request).toHaveBeenCalledWith('admin@gesco-v1.local', {
      redirectTo: window.location.origin + '/reset-password',
    });
  });
  it('allows the actual account email', async () => {
    await requestPasswordRecovery(' User@Example.test ');
    expect(auth.request).toHaveBeenCalledWith('user@example.test', expect.any(Object));
  });
  it('does not send unrecoverable internal usernames to a fake mailbox', async () => {
    await expect(requestPasswordRecovery('teacher')).rejects.toThrow('contactez');
    await expect(requestPasswordRecovery('teacher@gesco-v1.local')).rejects.toThrow('contactez');
    expect(auth.request).not.toHaveBeenCalled();
  });
  it('does not expose upstream account information on request errors', async () => {
    auth.request.mockResolvedValue({ error: { message: 'private provider details' } });
    await expect(requestPasswordRecovery('admin')).rejects.toThrow('La demande n’a pas pu être envoyée');
  });
  it('requires a token and the existing password policy', async () => {
    await expect(completePasswordRecovery('', 'new-test-password')).rejects.toThrow('absent');
    await expect(completePasswordRecovery('test-token', 'short')).rejects.toThrow('12 et 128');
    expect(auth.reset).not.toHaveBeenCalled();
  });
  it('submits the one-time token through the supported Better Auth API', async () => {
    await completePasswordRecovery('test-only-token', 'new-test-password');
    expect(auth.reset).toHaveBeenCalledWith({ token: 'test-only-token', newPassword: 'new-test-password' });
  });
  it('reports a rejected token without claiming the password was changed', async () => {
    auth.reset.mockResolvedValue({ error: { code: 'INVALID_TOKEN' } });
    await expect(completePasswordRecovery('test-only-token', 'new-test-password')).rejects.toThrow('n’a pas été modifié');
  });
});
