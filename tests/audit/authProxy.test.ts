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
