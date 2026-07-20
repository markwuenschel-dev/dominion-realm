import { getJournalPosts, journalUrl, CATEGORY_LABELS } from '@/lib/journal';
import { isUngated } from '@/lib/reveal';
import { SITE_URL as SITE } from '@/lib/site';

/**
 * RSS 2.0 feed for the Author Journal (ADR-0003/0010). Replaces @astrojs/rss
 * with a hand-built feed. Served at /rss.xml.
 *
 * This is a public, unauthenticated, `force-static` feed with no per-reader
 * reveal level, so it emits only what is safe at the default Teaser tier:
 * ungated posts (`isUngated`). ADR-0004 requires generic metadata for
 * Reader/Deep/Beyond entries — a sealed post's title/summary is itself a
 * spoiler surface (post OG, the journal list, and search already seal it), so
 * sealed posts are excluded entirely rather than leaked into a firehose no
 * subscriber opted into for spoilers (audit CAND-02).
 */

const TITLE = 'The Dominion Realm — Author Journal';
const DESCRIPTION =
  "Dispatches from inside the Realm and notes from the author's desk, from the world of The Dominion Realm.";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const dynamic = 'force-static';

export function GET() {
  const posts = getJournalPosts().filter((post) => isUngated(post.data.reveal));

  const items = posts
    .map((post) => {
      const link = `${SITE}${journalUrl(post.id)}`;
      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${post.data.pubDate.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.summary)}</description>
      <category>${escapeXml(CATEGORY_LABELS[post.data.category])}</category>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(TITLE)}</title>
    <link>${escapeXml(SITE)}</link>
    <description>${escapeXml(DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(`${SITE}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
