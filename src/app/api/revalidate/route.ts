import { revalidateTag } from 'next/cache';
import { parseBody } from 'next-sanity/webhook';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * On-demand revalidation webhook (ADR-0011, Phase 3).
 *
 * Sanity POSTs here whenever a Subject / siteSettings document is published. We
 * verify the request's `sanity-webhook-signature` against SANITY_REVALIDATE_SECRET
 * (set as the webhook's signing secret in the Sanity dashboard AND as a server
 * env var), then bust the single `sanity` cache tag every media read carries — so
 * one edit refreshes the homepage, the codex index, and every detail page on their
 * next request, with no redeploy. Coarse by design: it's structurally impossible
 * to leave a Sanity-fed page stale.
 */
export async function POST(req: NextRequest) {
  // Fail closed before parseBody: next-sanity treats a missing secret as
  // "accept any signature". Unset / empty / whitespace must never revalidate.
  if (!process.env.SANITY_REVALIDATE_SECRET?.trim()) {
    return new NextResponse('Revalidation secret is not configured', { status: 401 });
  }

  try {
    const { isValidSignature, body } = await parseBody<{ _type?: string }>(
      req,
      process.env.SANITY_REVALIDATE_SECRET,
    );

    if (!isValidSignature) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Next 16 requires a cache profile; `{ expire: 0 }` forces immediate
    // expiration so the edit is live on the very next request (paired with the
    // client's `useCdn: false`), rather than 'max' stale-while-revalidate which
    // would serve one more stale response.
    revalidateTag('sanity', { expire: 0 });
    return NextResponse.json({ revalidated: true, tag: 'sanity', type: body?.['_type'] ?? null });
  } catch (err) {
    return new NextResponse((err as Error).message, { status: 500 });
  }
}
