import type { Metadata } from 'next';
import Link from 'next/link';
import { getTimelineEntries, resolveTimelineLink } from '@/lib/timeline';
import { getCodexEntries } from '@/lib/codex';
import { CodexChrome } from '@/components/CodexChrome';
import { RevealGate } from '@/components/reveal/RevealGate';
import { SceneArt } from '@/components/reading/SceneArt';
import { getSceneMediaMap, sceneKey } from '@/sanity/media';
import '@/styles/reading.css';
import '@/styles/timeline.css';

export const metadata: Metadata = {
  title: 'The Timeline of the Realm',
  description:
    'A chronological spine of The Dominion Realm — the beats of the story and the world, revealed to the depth you have earned.',
};

export default async function TimelinePage() {
  const entries = getTimelineEntries();
  const codex = getCodexEntries();
  // One batched read for every beat's Scene art (Sanity → absent). Graceful miss
  // by design — a missing or mistyped beatRef simply leaves the beat text-only —
  // and a single query instead of one per beat (the former N+1 fan-out).
  const sceneMap = await getSceneMediaMap(
    entries.map((entry) => ({ beat: 'timeline' as const, beatRef: entry.id })),
  );

  return (
    <CodexChrome>
      <div className="timeline-head">
        <span className="timeline-head__label">The Timeline</span>
        <h1 className="timeline-head__title">
          The spine of the <em>Realm</em>
        </h1>
        <p className="timeline-head__intro">
          The order of things — story and world, set along one thread. Later beats stay sealed until
          you raise your reveal level; nothing here shows more than you have earned.
        </p>
        <div className="timeline-rule" />
      </div>

      {entries.length === 0 ? (
        <p className="timeline-empty">The thread is still being drawn.</p>
      ) : (
        <ol className="timeline-track">
          {entries.map((entry) => {
            const link = resolveTimelineLink(entry, codex);
            const sceneMedia = sceneMap.get(sceneKey('timeline', entry.id));
            return (
              <li className="timeline-beat" key={entry.id} id={entry.id}>
                <span className="timeline-beat__node" aria-hidden="true" />
                <div className="timeline-beat__body">
                  <RevealGate
                    tier={entry.data.reveal}
                    label="This beat lies further along the thread."
                  >
                    <span className="timeline-beat__when">{entry.data.when}</span>
                    <h2 className="timeline-beat__title">{entry.data.title}</h2>
                    <p className="timeline-beat__summary">{entry.data.summary}</p>
                    {sceneMedia && (
                      <div className="timeline-beat__art">
                        <SceneArt
                          images={sceneMedia.images}
                          title={entry.data.title}
                          priority={false}
                        />
                      </div>
                    )}
                    {link && (
                      <Link className="timeline-beat__link" href={link.url}>
                        {link.label ? `${link.label} — ` : ''}
                        {link.name}
                        <span className="timeline-beat__arrow" aria-hidden="true">
                          {' '}
                          →
                        </span>
                      </Link>
                    )}
                  </RevealGate>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </CodexChrome>
  );
}
