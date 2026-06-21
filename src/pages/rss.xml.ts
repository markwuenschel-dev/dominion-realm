import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getJournalPosts, journalUrl, CATEGORY_LABELS } from '../lib/journal';

/**
 * RSS feed for the Author Journal (ADR-0003). Includes every non-draft post
 * from both streams — the feed carries only spoiler-safe summaries (never the
 * gated body), so it stays safe regardless of a post's reveal tier.
 */
export async function GET(context: APIContext) {
  const base = import.meta.env.BASE_URL;
  const posts = await getJournalPosts();

  return rss({
    title: 'The Dominion Realm — Author Journal',
    description:
      'Dispatches from inside the Realm and notes from the author’s desk, from the world of The Dominion Realm.',
    // context.site is the configured `site`; @astrojs/rss resolves each item's
    // relative `link` against it. journalUrl() carries the base path.
    site: context.site ?? 'https://dominion-realm.netlify.app',
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.summary,
      link: journalUrl(base, post.id),
      categories: [CATEGORY_LABELS[post.data.category]],
    })),
  });
}
