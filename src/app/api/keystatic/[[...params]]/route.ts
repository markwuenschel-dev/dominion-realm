// Keystatic GitHub OAuth + read/write API (ADR-0009/0010). Reads its GitHub App
// credentials from env: KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET,
// KEYSTATIC_SECRET (set these in the deploy env, e.g. env/dominion-realm.env, not committed).
import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../../keystatic.config';
import { SITE_URL } from '@/lib/site';
import { keystaticAuthoringState, keystaticDisabledResponse } from '@/lib/keystaticAccess';

/**
 * Built on first authorized request, never at module load.
 *
 * `makeRouteHandler` validates its configuration eagerly: in `github` storage mode
 * with any OAuth secret missing it THROWS. At module scope that throw happens during
 * module evaluation, so the route module never finishes loading and neither `GET` nor
 * `POST` ever runs — which silently disables the authoring gate below, because the
 * gate lives inside those handlers.
 *
 * That is not hypothetical either. Observed on the production box on 2026-08-24 after
 * the INT-07 containment put storage into `github` mode without secrets: every request
 * to `/api/keystatic/*` returned 500 from a module-evaluation error at `route.js:6:3`,
 * and the 404 this route is supposed to serve never happened. The endpoint failed
 * closed by crashing, which is luck rather than design.
 *
 * Constructing lazily makes the gate genuinely authoritative: a shut gate returns 404
 * without ever touching Keystatic's config validation, so no combination of missing or
 * malformed secrets can change the response. It also keeps the original property that
 * a misconfigured deploy cannot serve the CMS.
 */
let keystaticHandler: ReturnType<typeof makeRouteHandler> | undefined;

const keystatic = () => (keystaticHandler ??= makeRouteHandler({ config }));

/** Hosts that a browser can't reach — the internal bind address Next echoes back. */
const isInternalHost = (host: string) => /^(127\.|0\.0\.0\.0|localhost|\[?::1\]?)/i.test(host);

/**
 * Behind the reverse proxy (Caddy), Next builds the route handler's request URL
 * from the INTERNAL bind address (the container's `localhost`, which Keystatic
 * then normalizes to `127.0.0.1`), so Keystatic's GitHub OAuth `redirect_uri` points at an
 * unreachable host and the browser can't finish sign-in ("127.0.0.1 refused to
 * connect"). Rewrite the request's origin to the real PUBLIC URL before Keystatic
 * reads it.
 *
 * Detection keys off `new URL(req.url).host` — the SAME value Keystatic reads —
 * NOT the `Host` header. Behind the proxy those two disagree: the header arrives
 * as the public domain while the request URL carries the internal address, so a
 * header-only check (the previous bug) saw "public", skipped the rewrite, and let
 * Keystatic emit the internal `redirect_uri` anyway.
 *
 * Public-origin precedence is deploy-time env ONLY, never a request header
 * (audit CAND-23): an explicit `KEYSTATIC_URL` override → the canonical
 * `SITE_URL`. The proxy's `x-forwarded-host` is deliberately NOT consulted for
 * the OAuth origin — it is client-influenceable behind a misconfigured proxy, so
 * sourcing `redirect_uri` from it puts an attacker-settable value on the auth
 * path. The GitHub App callback maps to one canonical host anyway (ADR-0012,
 * where a host cutover updates `NEXT_PUBLIC_SITE_URL`); serving OAuth on a second
 * live host means setting `KEYSTATIC_URL`, not trusting the browser's `Host`.
 * Gated on GitHub storage mode — the only mode that does OAuth — so local dev
 * (local storage) is untouched even without a production build.
 */
export function withPublicOrigin(req: Request): Request {
  if (process.env.NEXT_PUBLIC_KEYSTATIC_GITHUB !== 'true') return req;

  const url = new URL(req.url);

  let base: URL;
  if (process.env.KEYSTATIC_URL) {
    base = new URL(process.env.KEYSTATIC_URL);
  } else if (isInternalHost(url.host)) {
    // No public override and Next echoed its internal bind address: pin to the
    // canonical public origin. We do NOT read x-forwarded-host here (CAND-23).
    base = new URL(SITE_URL);
  } else {
    return req; // request already carries a reachable public origin
  }

  if (url.protocol === base.protocol && url.host === base.host) return req;
  url.protocol = base.protocol;
  // Set hostname and port SEPARATELY. Assigning `url.host = base.host` leaves the
  // existing port in place when `base.host` carries none (WHATWG URL semantics), so
  // the internal `:8080` would leak into the redirect_uri as
  // `dominionrealm.44-198-76-44.nip.io:8080` — which GitHub rejects
  // ("redirect_uri is not associated"). `base.port` is '' for a default-port URL,
  // and assigning '' clears the port.
  url.hostname = base.hostname;
  url.port = base.port;

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

/**
 * Every verb passes the authoring gate before Keystatic sees the request.
 *
 * The gate runs FIRST and covers the whole handler, `tree` included. Keystatic's
 * own path restriction (`getIsPathValid`) bounds the blob and update endpoints to
 * the six content directories, but `tree` carries no such restriction: it walks and
 * hashes every file under the working directory. A read-only inventory API with no
 * credential is not something a path allow-list makes acceptable, so nothing is
 * served rather than some of it (campaign decision Q22).
 *
 * Note what is NOT the gate: `withPublicOrigin` below returns the request untouched
 * whenever the public flag is not `'true'` — it is OAuth plumbing, and it is inert
 * in exactly the misconfigured state that opens the unauthenticated handler. It was
 * never authorization and must not be mistaken for it.
 */
export function GET(req: Request) {
  if (!keystaticAuthoringState().enabled) return keystaticDisabledResponse();
  return keystatic().GET(withPublicOrigin(req));
}
export function POST(req: Request) {
  if (!keystaticAuthoringState().enabled) return keystaticDisabledResponse();
  return keystatic().POST(withPublicOrigin(req));
}
