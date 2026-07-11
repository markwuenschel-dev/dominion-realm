import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import '@/styles/reading.css';
import '@/styles/map.css';
import { realmMap } from '@/data/realm-map';
import { computeLeyNodes, codexHref } from '@/lib/map-geometry';
import { getRealmMap } from '@/sanity/media';
import { ReadingChrome } from '@/components/reading/ReadingChrome';
import { MapClient } from '@/components/MapClient';
import { SubjectImage } from '@/components/SubjectImage';
import { ImageCredit } from '@/components/ImageCredit';

export const metadata: Metadata = {
  title: 'The Map',
  description:
    'A map of the Realm — Eriadne at the convergence of the eight elemental ley lines, the ruins-portal at its edge, and the frontiers the threats come from.',
};

const { hub, ruins, threats, regions = [], routes = [], leyLines, provisional } = realmMap;
const nodes = computeLeyNodes(leyLines);
const landmarks = [hub, ruins, ...threats];

/** The git-tier map artwork, shown unless a Sanity upload overrides it. Lives in
 *  `public/`; the legend below still derives from `realm-map.ts`. */
const GIT_MAP = {
  src: '/eriadne-map.png',
  width: 1536,
  height: 1024,
  alt: 'A map of the Realm — Eriadne at the convergence of the eight ley lines.',
};

export default async function MapPage() {
  const mapImage = await getRealmMap();

  return (
    <ReadingChrome>
      <div className="map-page">
        <header className="map-head">
          <span className="reading-article__kicker">Cartography of the Realm</span>
          <h1 className="reading-article__title">
            The <em>Map</em>
          </h1>
          <p className="reading-article__summary">
            Eriadne at the convergence of the eight ley lines — and what spreads out from it.
          </p>
          <div className="reading-article__rule" />
        </header>

        <figure className="realm-map">
          <div className="realm-map__stage">
            {mapImage ? (
              <SubjectImage
                source={mapImage.source}
                alt={mapImage.alt || GIT_MAP.alt}
                fill={false}
                sizes="(max-width: 980px) 100vw, 980px"
                className="realm-map__png"
              />
            ) : (
              <Image
                src={GIT_MAP.src}
                alt={GIT_MAP.alt}
                width={GIT_MAP.width}
                height={GIT_MAP.height}
                sizes="(max-width: 980px) 100vw, 980px"
                className="realm-map__png"
                priority
              />
            )}
          </div>

          {mapImage?.credit && <ImageCredit credit={mapImage.credit} />}

          <figcaption className="realm-map__cap">
            A cartographer&apos;s rendering of the Realm — Eriadne at the convergence of the eight
            ley lines. The threads and frontiers below name what it holds.
          </figcaption>
        </figure>

        <section className="map-key" aria-label="Map legend">
          <button type="button" className="map-key__toggle" aria-expanded="true">
            Map legend
          </button>
          <div className="map-key__body">
            <h2 className="map-key__title">
              The Eight Threads
              {provisional && (
                <span className="map-key__provisional" title="Thread names are provisional">
                  Provisional
                </span>
              )}
            </h2>
            <ul className="ley-legend">
              {nodes.map((n) => (
                <li
                  key={n.key}
                  className="ley-legend__item"
                  data-key={n.key}
                  style={{ ['--hue']: n.ley.hue } as CSSProperties}
                >
                  <span className="ley-legend__swatch" aria-hidden="true" />
                  <div>
                    <span className="ley-legend__el">{n.ley.element}</span>
                    <span className="ley-legend__name">{n.ley.name}</span>
                    <p className="ley-legend__gloss">{n.ley.gloss}</p>
                  </div>
                </li>
              ))}
            </ul>

            <h2 className="map-key__title">Landmarks &amp; Frontiers</h2>
            <ul className="land-legend">
              {landmarks.map((m, i) => {
                const href = codexHref(m.href);
                return (
                  <li
                    key={`${m.name}-${i}`}
                    className="land-legend__item"
                    style={{ ['--swatch']: m.color ?? 'var(--gold)' } as CSSProperties}
                  >
                    <span className="land-legend__swatch" aria-hidden="true" />
                    <div>
                      <span className="land-legend__name">
                        {href ? <Link href={href}>{m.name}</Link> : m.name}
                      </span>
                      <span className="land-legend__kind">{m.kind}</span>
                      <p className="land-legend__gloss">{m.gloss}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {regions.length > 0 && (
              <>
                <h2 className="map-key__title">Regions</h2>
                <ul className="region-legend land-legend">
                  {regions.map((r) => (
                    <li key={r.id} className="land-legend__item region-legend__item">
                      <span className="land-legend__swatch" aria-hidden="true" />
                      <div>
                        <span className="land-legend__name">{r.label}</span>
                        {r.gloss && <p className="land-legend__gloss">{r.gloss}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {routes.length > 0 && (
              <>
                <h2 className="map-key__title">Routes</h2>
                <ul className="route-legend land-legend">
                  {routes.map((r) => (
                    <li key={r.id} className="land-legend__item route-legend__item">
                      <span className="land-legend__swatch rm-route-swatch" aria-hidden="true" />
                      <div>
                        <span className="land-legend__name">{r.label}</span>
                        {r.gloss && <p className="land-legend__gloss">{r.gloss}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <Link className="reading-back" href="/">
          ← Back to The Dominion Realm
        </Link>
      </div>
      <MapClient />
    </ReadingChrome>
  );
}
