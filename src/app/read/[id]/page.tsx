import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getReadingEntries, getReadingEntry } from '@/lib/reading';
import { ReadingChrome } from '@/components/reading/ReadingChrome';
import { ChapterView } from '@/components/reading/ChapterView';
import { defaultSocialImage, previewMetadata } from '@/sanity/og';

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
  // real title/summary over the default social image.
  return previewMetadata(entry.data.title, entry.data.summary, await defaultSocialImage());
}

export default async function ReadChapter({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = getReadingEntry(id);
  if (!entry) notFound();

  return (
    <ReadingChrome>
      <ChapterView entry={entry} part={1} />
    </ReadingChrome>
  );
}
