// Keystatic GitHub OAuth + read/write API (ADR-0009/0010). Reads its GitHub App
// credentials from env: KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET,
// KEYSTATIC_SECRET (set these in the Railway service env, not committed).
import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../../keystatic.config';

const keystatic = makeRouteHandler({ config });

/**
 * Behind Railway's proxy the Next server sees its INTERNAL address as the request
 * host (e.g. `127.0.0.1:8080`), so Keystatic builds a GitHub OAuth `redirect_uri`
 * from that — which GitHub rejects ("redirect_uri is not associated with this
 * application"). Rewrite the request's origin to the real public URL before
 * Keystatic reads it. Precedence: an explicit `KEYSTATIC_URL` env override → the
 * proxy's `x-forwarded-host` → the known deploy URL. Only rewrites when the host
 * looks internal, and never in local dev (which uses local storage, not OAuth).
 */
function withPublicOrigin(req: Request): Request {
  if (process.env.NODE_ENV !== 'production') return req;

  const host = req.headers.get('host') ?? new URL(req.url).host;
  const hostIsInternal = /^(127\.|0\.0\.0\.0|localhost|\[?::1\]?)/i.test(host);

  let base: URL | null = null;
  if (process.env.KEYSTATIC_URL) {
    base = new URL(process.env.KEYSTATIC_URL);
  } else if (hostIsInternal) {
    const xfHost = req.headers.get('x-forwarded-host');
    const xfProto = req.headers.get('x-forwarded-proto') ?? 'https';
    base = xfHost
      ? new URL(`${xfProto}://${xfHost}`)
      : new URL('https://dominion-realm-production.up.railway.app');
  }
  if (!base) return req;

  const url = new URL(req.url);
  url.protocol = base.protocol;
  url.host = base.host;

  const headers = new Headers(req.headers);
  headers.set('host', base.host);
  headers.set('x-forwarded-host', base.host);
  headers.set('x-forwarded-proto', base.protocol.replace(':', ''));

  const init: RequestInit & { duplex?: 'half' } = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    init.duplex = 'half';
  }
  return new Request(url.toString(), init);
}

export function GET(req: Request) {
  return keystatic.GET(withPublicOrigin(req));
}
export function POST(req: Request) {
  return keystatic.POST(withPublicOrigin(req));
}
