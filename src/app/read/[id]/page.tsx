import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReadingEntries, getReadingEntry } from '@/lib/reading';
import { ReadingChrome } from '@/components/reading/ReadingChrome';
import { ChapterView } from '@/components/reading/ChapterView';
import { getSceneMedia } from '@/sanity/media';
import { previewMetadata, socialImageFor } from '@/sanity/og';

export function generateStaticParams() {
  return getReadingEntries().map((e) => ({ id: e.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = getReadingEntry(id);
  if (!entry) return {};
  // Reading chapters are always public (no reveal gate), so they publish their
  // real title/summary. The chapter's Scene-art hero becomes its social image
  // when present, else the default (the fetch is React-cached with the page).
  const sceneMedia = await getSceneMedia('reading', id);
  const image = await socialImageFor(sceneMedia?.images[0]?.source);
  return previewMetadata(entry.data.title, entry.data.summary, image);
}

export default async function ReadChapter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getReadingEntry(id);
  if (!entry) notFound();
  const sceneMedia = await getSceneMedia('reading', id);

  return (
    <ReadingChrome>
      <ChapterView entry={entry} part={1} sceneMedia={sceneMedia} />
    </ReadingChrome>
  );
}
