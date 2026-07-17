import Link from 'next/link';
import {
  getReadingEntries,
  getNeighbors,
  readingUrl,
  readingSceneUrl,
  readingKicker,
  readingMinutes,
  splitScenes,
  shouldPaginate,
  type ReadingEntry,
} from '@/lib/reading';
import { MdxBody } from '@/components/MdxBody';
import { ContentImage } from '@/components/ContentImage';
import { Reader } from '@/components/reading/Reader';
import { SceneArt } from '@/components/reading/SceneArt';
import type { SceneMedia } from '@/sanity/media';

/** One prev/next target for the scene pager — a scene within the chapter, or a
 *  neighbouring chapter at its boundary. */
interface PagerLink {
  href: string;
  dir: string;
  title: string;
}

/**
 * Renders a single scene-page of a reading piece. A chapter is split on its
 * thematic breaks into scenes; each scene is its own short page (`/read/<id>`
 * for part 1, `/read/<id>/<n>` after), so a long chapter reads as a sequence of
 * digestible pages instead of one endless scroll. The pager walks scenes first,
 * then spills into the previous/next chapter at the ends. Single-scene pieces
 * (the Prologue) render exactly as before — one page, no pager.
 *
 * `part` must already be a valid 1-based scene index — the `/read/[id]/[part]`
 * route rejects out-of-range parts (404 via `parseLaterScenePart`); the
 * canonical `/read/[id]` route always passes `1`. This view does not re-clamp.
 */
export function ChapterView({
  entry,
  part,
  sceneMedia,
}: {
  entry: ReadingEntry;
  part: number;
  /** Sanity Scene art for this chapter (part 1 only); null falls back to the git
   *  hero, then nothing. Never passed for later scene-pages. */
  sceneMedia?: SceneMedia | null;
}) {
  // Long multi-scene chapters read as paged scenes; short pieces (the Prologue)
  // stay a single page, their scene breaks rendering as in-body dividers.
  const paginated = shouldPaginate(entry);
  const scenes = paginated ? splitScenes(entry.body) : [entry.body];
  const count = scenes.length;
  const p = part;
  const sceneBody = scenes[p - 1];
  const minutes = readingMinutes(sceneBody);

  const { prev: prevChapter, next: nextChapter } = getNeighbors(getReadingEntries(), entry.id);

  const prev: PagerLink | null =
    p > 1
      ? { href: readingSceneUrl(entry.id, p - 1), dir: `← Part ${p - 1}`, title: entry.data.title }
      : prevChapter
        ? { href: readingUrl(prevChapter.id), dir: '← Previous', title: prevChapter.data.title }
        : null;

  const next: PagerLink | null =
    p < count
      ? { href: readingSceneUrl(entry.id, p + 1), dir: `Part ${p + 1} →`, title: entry.data.title }
      : nextChapter
        ? { href: readingUrl(nextChapter.id), dir: 'Next →', title: nextChapter.data.title }
        : null;

  return (
    <>
      <Reader chapterId={entry.id} minutes={minutes} part={p} />
      <article className="reading-article">
        <span className="reading-article__kicker">
          {readingKicker(entry)}
          {paginated && ` · Part ${p} of ${count}`} · ~{minutes} min
        </span>
        <h1 className="reading-article__title">{entry.data.title}</h1>

        {/* The summary + hero belong to the chapter, so they lead part 1 only. */}
        {p === 1 && <p className="reading-article__summary">{entry.data.summary}</p>}
        <div className="reading-article__rule" />

        {/* Opening plate, part 1 only: Sanity Scene art wins, else the git hero,
            else nothing (the Sanity → git → placeholder order). */}
        {p === 1 &&
          (sceneMedia ? (
            <SceneArt images={sceneMedia.images} title={entry.data.title} />
          ) : entry.data.image ? (
            <figure className="reading-article__media">
              <ContentImage src={entry.data.image} alt={entry.data.imageAlt ?? entry.data.title} />
            </figure>
          ) : null)}

        <div className="reading-prose">
          <MdxBody source={sceneBody} />
        </div>
      </article>

      {(prev || next) && (
        <nav className="reading-nav reading-nav--pager" aria-label="Scene navigation">
          {paginated && (
            <span className="reading-nav__part" aria-label={`Part ${p} of ${count}`}>
              Part {p} of {count}
            </span>
          )}
          <div className="reading-nav__row">
            {prev ? (
              <Link className="reading-nav__link reading-nav__link--prev" href={prev.href}>
                <span className="reading-nav__dir">{prev.dir}</span>
                <span className="reading-nav__title">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link className="reading-nav__link reading-nav__link--next" href={next.href}>
                <span className="reading-nav__dir">{next.dir}</span>
                <span className="reading-nav__title">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </div>
        </nav>
      )}

      <Link className="reading-back" href="/read">
        ← All chapters
      </Link>
    </>
  );
}
