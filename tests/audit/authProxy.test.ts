// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const upstream = vi.hoisted(() => vi.fn());
vi.mock('@neondatabase/neon-js/auth/server', () => ({ handleAuthProxyRequest: upstream }));
import { proxyAuth } from '../../server/authProxy';
const env = { NEON_AUTH_URL: 'https://auth.example.test/auth', NEON_AUTH_COOKIE_SECRET: 'test-only-cookie-secret-at-least-32-characters' };
beforeEach(() => {
  upstream.mockReset();
  upstream.mockImplementation(async ({ request }) => request.url.includes('disableCookieCache=true')
    ? Response.json({ session: { token: 'opaque-session' } }, { headers: { 'set-auth-jwt': 'signed.jwt.value' } })
    : Response.json({ session: { token: 'opaque-session' } }));
});
describe('Neon JWT session proxy', () => {
  it('resolves the admin recovery alias without exposing the recovery email to the client', async () => {
    const response = await proxyAuth(new Request('http://localhost:5173/api/auth/request-password-reset', {
      method: 'POST', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gesco-v1.local', redirectTo: 'http://localhost:5173/reset-password' }),
    }), { ...env, GESCO_ADMIN_EMAIL: 'recovery@example.test' });
    expect(response.status).toBe(200);
    expect(await upstream.mock.calls[0][0].request.json()).toEqual({
      email: 'recovery@example.test', redirectTo: 'http://localhost:5173/reset-password',
    });
    expect(await response.text()).not.toContain('recovery@example.test');
  });
  it('rejects an external recovery callback', async () => {
    const response = await proxyAuth(new Request('http://localhost:5173/api/auth/request-password-reset', {
      method: 'POST', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gesco-v1.local', redirectTo: 'https://untrusted.example/reset-password' }),
    }), env);
    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('enforces the password minimum on the server before forwarding a reset', async () => {
    const response = await proxyAuth(new Request('http://localhost:5173/api/auth/reset-password', {
      method: 'POST', headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'test-only-token', newPassword: 'short' }),
    }), env);
    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('bypasses the opaque cookie cache and preserves the upstream Data API JWT', async () => {
    const response = await proxyAuth(new Request('http://localhost:5173/api/auth/get-session'), env);
    expect(response.headers.get('set-auth-jwt')).toBe('signed.jwt.value');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects cross-origin sign-in before forwarding credentials', async () => {
    const response = await proxyAuth(new Request('http://localhost:5173/api/auth/sign-in/email', {
      method: 'POST', headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' }, body: '{}',
    }), env);
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });
});
