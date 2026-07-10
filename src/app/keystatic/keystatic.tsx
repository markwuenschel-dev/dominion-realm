'use client';

// The Keystatic admin UI (ADR-0009, amended by ADR-0010). `makePage` builds the
// client-side editor from the shared config. On the EC2 deploy (a Node server) this
// runs on the MAIN deploy — it is no longer Netlify-only, because the GitHub
// OAuth handshake the admin needs is served by the route handler under
// /api/keystatic. The config lives at the repo root.
import { makePage } from '@keystatic/next/ui/app';
import config from '../../../keystatic.config';

export default makePage(config);
