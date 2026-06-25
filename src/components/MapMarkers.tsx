'use client';

import { selectVisibleMarkers, type PlaceMarker } from '@/lib/map';
import { useReveal } from '@/components/reveal/RevealContext';

/**
 * Interactive, reveal-gated marker overlay for /map (content-depth backlog #4).
 *
 * Sits absolutely over the decorative SVG (which stays the no-JS fallback) and
 * positions each place by its `mapX`/`mapY` percent. Markers the reader may see
 * are links to the codex with a name label and a hover/focus tooltip; markers
 * gated above the reader's reveal level render as a nameless sealed pin (see
 * `selectVisibleMarkers`) — so raising the reveal toggle un-seals them live,
 * and no spoiler place name is ever in the rendered DOM at a lower tier.
 *
 * The container is `pointer-events: none` so SVG ley-thread hovers pass through;
 * only the markers themselves re-enable pointer events.
 */
export function MapMarkers({ markers }: { markers: PlaceMarker[] }) {
  const { level } = useReveal();
  if (markers.length === 0) return null;

  const visible = selectVisibleMarkers(markers, level);

  return (
    <ul className="map-markers" aria-label="Marked places">
      {visible.map((m) => {
        const style = { left: `${m.x}%`, top: `${m.y}%` } as const;

        if (m.status === 'sealed') {
          return (
            <li key={m.id} className="map-marker map-marker--sealed" style={style}>
              <span
                className="map-marker__hit"
                tabIndex={0}
                role="img"
                aria-label={`${m.label} — raise your reveal level to read this place.`}
              >
                <span className="map-marker__dot" aria-hidden="true" />
                <span className="map-marker__tip" aria-hidden="true">
                  <span className="map-marker__tip-name">{m.label}</span>
                  <span className="map-marker__tip-kind">Raise your reveal level</span>
                </span>
              </span>
            </li>
          );
        }

        return (
          <li key={m.id} className="map-marker" style={style}>
            <a
              className="map-marker__hit"
              href={m.href}
              aria-label={`${m.name} — ${m.kind}. Open in codex.`}
            >
              <span className="map-marker__dot" aria-hidden="true" />
              <span className="map-marker__name" aria-hidden="true">
                {m.name}
              </span>
              <span className="map-marker__tip" aria-hidden="true">
                <span className="map-marker__tip-name">{m.name}</span>
                <span className="map-marker__tip-kind">{m.kind}</span>
                <span className="map-marker__tip-sum">{m.summary}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
