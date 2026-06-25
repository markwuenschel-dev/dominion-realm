// Keystatic GitHub OAuth + read/write API (ADR-0009/0010). Reads its GitHub App
// credentials from env: KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET,
// KEYSTATIC_SECRET (set these in the Railway service env, not committed).
import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../../keystatic.config';

export const { GET, POST } = makeRouteHandler({ config });
