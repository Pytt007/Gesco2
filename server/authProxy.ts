import { handleAuthProxyRequest } from '@neondatabase/neon-js/auth/server';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type AuthEnvironment = { NEON_AUTH_URL?: string; NEON_AUTH_COOKIE_SECRET?: string; GESCO_ADMIN_EMAIL?: string };
const allowedPaths = new Set(['sign-in/email', 'sign-up/email', 'sign-out', 'get-session', 'get-user', 'token', 'jwks', 'update-user', 'change-password', 'request-password-reset', 'reset-password', 'verify-email', 'send-verification-email', 'list-sessions', 'revoke-session', 'revoke-other-sessions']);
const jsonError = (status: number, message: string) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });

/** The username alias stays on the server; no recovery address or cookie secret enters the browser bundle. */
export async function proxyAuth(request: Request, env: AuthEnvironment): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/auth\/?/, '');
  if (!allowedPaths.has(path)) return jsonError(404, 'Route inconnue.');
  if (!['GET', 'POST'].includes(request.method)) return jsonError(405, 'Méthode refusée.');
  if (!env.NEON_AUTH_URL || !env.NEON_AUTH_COOKIE_SECRET || env.NEON_AUTH_COOKIE_SECRET.length < 32) return jsonError(503, 'Authentification non configurée.');
  if (request.method === 'POST' && request.headers.get('origin') !== url.origin) return jsonError(403, 'Origine refusée.');
  if (request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return jsonError(415, 'Format JSON requis.');
    const text = await request.text();
    if (text.length > 32768) return jsonError(413, 'Requête trop volumineuse.');
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { return jsonError(400, 'Requête invalide.'); }
    if (!body || Array.isArray(body) || typeof body !== 'object') return jsonError(400, 'Requête invalide.');
    if (['sign-in/email', 'request-password-reset'].includes(path) && typeof body.email === 'string' && body.email.toLowerCase() === 'admin@gesco-v1.local') {
      body.email = env.GESCO_ADMIN_EMAIL || body.email;
    }
    for (const field of ['redirectTo', 'callbackURL']) {
      if (typeof body[field] === 'string') {
        try { if (new URL(body[field], url.origin).origin !== url.origin) return jsonError(400, 'Adresse de retour refusée.'); }
        catch { return jsonError(400, 'Adresse de retour invalide.'); }
      }
    }
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    request = new Request(request.url, { method: 'POST', headers, body: JSON.stringify(body) });
  }
  const response = await handleAuthProxyRequest({ request, path, baseUrl: env.NEON_AUTH_URL, cookieSecret: env.NEON_AUTH_COOKIE_SECRET, sessionDataTtl: 60, sameSite: 'lax' });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function nodeAuthHandler(req: IncomingMessage & { body?: unknown }, res: ServerResponse, env: AuthEnvironment) {
  try {
    const host = req.headers.host;
    if (!host) { res.writeHead(400).end(); return; }
    const protocol = host.startsWith('localhost:') || host.startsWith('127.0.0.1:') ? 'http' : 'https';
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body !== undefined) body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      else {
        const chunks: Buffer[] = []; let size = 0;
        for await (const chunk of req) {
          const bytes = Buffer.from(chunk); size += bytes.length;
          if (size > 32768) { res.writeHead(413).end(); return; }
          chunks.push(bytes);
        }
        body = Buffer.concat(chunks).toString('utf8');
      }
    }
    const response = await proxyAuth(new Request(`${protocol}://${host}${req.url}`, { method: req.method, headers, body }), env);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => { if (key !== 'set-cookie') res.setHeader(key, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    // Never log request bodies, tokens, passwords or upstream authentication responses.
    res.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ message: 'Service de connexion temporairement indisponible.' }));
  }
}
