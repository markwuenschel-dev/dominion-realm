import type { Metadata } from 'next';
import { getCodexEntries, COLLECTION_ORDER, COLLECTION_LABELS } from '@/lib/codex';
import { CodexCard } from '@/components/CodexCard';
import { SearchBox } from '@/components/SearchBox';
import { getSearchDocuments } from '@/lib/search';

export const metadata: Metadata = {
  title: 'The World Codex',
  description:
    'Explore the characters, powers, factions, and places of The Dominion Realm — spoiler-gated by your chosen reveal level.',
};

export default function CodexIndex() {
  const entries = getCodexEntries();
  const groups = COLLECTION_ORDER.map((collection) => ({
    collection,
    label: COLLECTION_LABELS[collection],
    items: entries.filter((e) => e.collection === collection),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="codex-head">
        <span className="codex-head__label">The World Codex</span>
        <h1 className="codex-head__title">
          Walk the <em>Realm</em>
        </h1>
        <p className="codex-head__intro">
          Characters, powers, factions, and places drawn from the world of The Dominion Realm. Set
          your reveal level above to unseal deeper lore as you read — everything defaults to
          spoiler-safe.
        </p>
        <div className="codex-rule" />
        <a className="codex-head__map" href="/relationships">
          <span className="codex-head__map-mark">✦</span>
          See the whole codex as a relationship map
          <span className="codex-head__map-arrow">→</span>
        </a>
      </div>

      <div className="codex-search">
        <SearchBox docs={getSearchDocuments()} />
      </div>

      {groups.map((group) => (
        <section className="codex-group" key={group.collection}>
          <div className="codex-group__head">
            <h2 className="codex-group__title">{group.label}</h2>
            <span className="codex-group__count">{group.items.length}</span>
          </div>
          <div className="codex-grid">
            {group.items.map((entry) => (
              <CodexCard entry={entry} key={`${entry.collection}/${entry.id}`} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
