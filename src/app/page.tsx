// TEMPORARY foundation smoke page — Fork C replaces this with the real homepage.
import { getCodexEntries } from '@/lib/content';
import { MdxBody } from '@/components/MdxBody';

export default function Home() {
  const entries = getCodexEntries();
  const first = entries[0];
  return (
    <main style={{ padding: 40 }}>
      <h1>Foundation OK — {entries.length} codex entries loaded</h1>
      {first && (
        <article>
          <h2>{first.data.name}</h2>
          <MdxBody source={first.body} />
        </article>
      )}
    </main>
  );
}
