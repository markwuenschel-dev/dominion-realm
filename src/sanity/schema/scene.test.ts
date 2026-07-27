import { describe, it, expect } from 'vitest';
import studioConfig from '../../../sanity.config';
import { SCENE_BEAT_META, SCENE_BEATS } from '../sceneJoins';

/**
 * The Scene `beat` dropdown, read out of the **real Studio config** — the same
 * `sanity.config.ts` default export the embedded Studio renders at `/studio`
 * (`src/app/studio/[[...tool]]/Studio.tsx`). Nothing else in the suite loads the
 * schema, so a semantic regression here (a renamed field, a re-hardcoded option
 * list) previously passed `tsc`, `next build`, and `pnpm test` alike.
 *
 * The contract: the author's beat choices ARE {@link SCENE_BEAT_META} — one
 * option per canonical kind, in canonical order, carrying that kind's canonical
 * title. Asserting against the constant rather than against `'Reading chapter'`
 * literals is the point: a new beat kind updates this test automatically, and
 * re-hardcoding the list makes it red the moment the two sides disagree.
 */

/** The narrow slice of a Sanity enum field this test reads. Sanity's own field
 *  union is far wider than the string-with-a-list case, so we name what we use. */
interface EnumOption {
  title: string;
  value: string;
}
interface SchemaField {
  name: string;
  options?: { list?: EnumOption[]; layout?: string };
  validation?: unknown;
}
interface SchemaDocType {
  name: string;
  fields: SchemaField[];
}

const types = studioConfig.schema?.types as unknown as SchemaDocType[];
const sceneType = types.find((t) => t.name === 'scene');
const beatField = sceneType?.fields.find((f) => f.name === 'beat');
const options = beatField?.options?.list ?? [];

/** The canonical dropdown, projected from the one authoritative record. */
const canonical = SCENE_BEAT_META.map(({ title, value }) => ({ title, value }));

describe('Scene beat dropdown (real Studio config)', () => {
  it('ships the scene type with a beat field in the production config', () => {
    expect(sceneType).toBeDefined();
    expect(beatField).toBeDefined();
  });

  it('offers exactly the canonical beat kinds, titled from the canonical record', () => {
    expect(options).toEqual(canonical);
  });

  it('offers one option per SCENE_BEATS kind — no missing, no extra, same order', () => {
    expect(options.map((o) => o.value)).toEqual([...SCENE_BEATS]);
  });

  it('gives every kind a distinct, non-empty label', () => {
    const titles = options.map((o) => o.title);
    expect(titles.every((t) => t.trim().length > 0)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('keeps the radio layout and the required rule (no editor regression)', () => {
    expect(beatField?.options?.layout).toBe('radio');
    expect(typeof beatField?.validation).toBe('function');
  });
});
