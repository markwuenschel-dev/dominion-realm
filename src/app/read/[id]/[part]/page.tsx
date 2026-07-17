import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getReadingEntries,
  getReadingEntry,
  sceneCount,
  shouldPaginate,
  parseLaterScenePart,
} from '@/lib/reading';
import { ReadingChrome } from '@/components/reading/ReadingChrome';
import { ChapterView } from '@/components/reading/ChapterView';
import { defaultSocialImage, previewMetadata } from '@/sanity/og';

/** Later scene-pages of paginated chapters only (part 1 is the canonical
 *  `/read/<id>` route; short/single-scene pieces have no scene pages). */
export function generateStaticParams() {
  return getReadingEntries().flatMap((e) => {
    if (!shouldPaginate(e)) return [];
    const count = sceneCount(e);
    const params: { id: string; part: string }[] = [];
    for (let n = 2; n <= count; n++) params.push({ id: e.id, part: String(n) });
    return params;
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; part: string }>;
}): Promise<Metadata> {
  const { id, part } = await params;
  const entry = getReadingEntry(id);
  if (!entry || !shouldPaginate(entry)) return {};
  const count = sceneCount(entry);
  const n = parseLaterScenePart(part, count);
  if (!n) return {};
  const title = `${entry.data.title} — Part ${n} of ${count}`;
  return previewMetadata(title, entry.data.summary, await defaultSocialImage());
}

export default async function ReadChapterScene({
  params,
}: {
  params: Promise<{ id: string; part: string }>;
}) {
  const { id, part } = await params;
  const entry = getReadingEntry(id);
  if (!entry || !shouldPaginate(entry)) notFound();
  const n = parseLaterScenePart(part, sceneCount(entry));
  if (!n) notFound();

  return (
    <ReadingChrome>
      <ChapterView entry={entry} part={n} />
    </ReadingChrome>
  );
}
