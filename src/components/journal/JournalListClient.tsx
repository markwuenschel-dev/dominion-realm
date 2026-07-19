'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { isRevealed, sealedLabel, type RevealTier } from '@/lib/reveal';
import { useReveal } from '@/components/reveal/RevealContext';

/**
 * Journal stream filter (ported from the inline script in journal/index.astro).
 * Every post is rendered up-front (so no-JS readers see all of them); the filter
 * just toggles `.is-hidden` by category and reflects state in the URL hash. The
 * server passes already-serialized items (no Date objects cross the boundary).
 * A post above the reader's reveal level renders as a sealed placeholder that
 * withholds its title/summary/image.
 */

export interface JournalItem {
  id: string;
  href: string;
  category: string;
  kicker: string;
  title: string;
  summary: string;
  image?: string;
  imageAlt?: string;
  reveal: RevealTier;
}

const VALID = ['all', 'field-notes', 'from-the-desk'];

export function JournalListClient({
  items,
  filters,
}: {
  items: JournalItem[];
  filters: { value: string; label: string }[];
}) {
  const [filter, setFilter] = useState('all');
  const { level } = useReveal();

  useEffect(() => {
    const norm = () => {
      const v = location.hash.replace(/^#/, '');
      setFilter(VALID.includes(v) ? v : 'all');
    };
    norm();
    window.addEventListener('hashchange', norm);
    return () => window.removeEventListener('hashchange', norm);
  }, []);

  function pick(value: string) {
    const url = value === 'all' ? location.pathname + location.search : '#' + value;
    history.replaceState(null, '', url);
    setFilter(value);
  }

  return (
    <>
      <div className="journal-controls">
        <div className="journal-filter" role="group" aria-label="Filter by stream">
          {filters.map((f) => (
            <Link
              key={f.value}
              className="journal-filter__btn"
              href={f.value === 'all' ? '/journal' : `/journal#${f.value}`}
              data-filter={f.value}
              aria-pressed={filter === f.value ? 'true' : 'false'}
              onClick={(e) => {
                e.preventDefault();
                pick(f.value);
              }}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- /rss.xml is a static file, not a Next.js page */}
        <a className="journal-feed" href="/rss.xml">
          RSS Feed →
        </a>
      </div>

      {items.length === 0 ? (
        <p className="journal-empty">No entries yet. Check back soon.</p>
      ) : (
        <div className="journal-list" id="journal-list">
          {items.map((p) => {
            const hidden = !(filter === 'all' || p.category === filter);
            const base = `journal-item${hidden ? ' is-hidden' : ''}`;
            if (!isRevealed(p.reveal, level)) {
              return (
                <div
                  key={p.id}
                  className={`${base} journal-item--sealed`}
                  data-category={p.category}
                  aria-label={sealedLabel(p.reveal)}
                >
                  <span className="journal-item__kicker">{sealedLabel(p.reveal)}</span>
                  <p className="journal-item__summary">
                    Raise your reveal level to read this entry.
                  </p>
                </div>
              );
            }
            return (
              <Link key={p.id} className={base} href={p.href} data-category={p.category}>
                {p.image && (
                  <figure className="journal-item__media">
                    {/* oxlint-disable-next-line next/no-img-element -- dynamic content image, dimensions unknown */}
                    <img src={p.image} alt={p.imageAlt ?? p.title} loading="lazy" />
                  </figure>
                )}
                <span className="journal-item__kicker">{p.kicker}</span>
                <h2 className="journal-item__title">{p.title}</h2>
                <p className="journal-item__summary">{p.summary}</p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
