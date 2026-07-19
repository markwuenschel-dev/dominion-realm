import { describe, it, expect } from 'vitest';
import { structure } from './structure';
import { READING_BEATS, TIMELINE_BEATS } from './content-manifest';

/**
 * The Studio desk "Scene art coverage map" (audit CAND-28, ADR-0011).
 *
 * The desk must surface one filtered list item per reading chapter and per
 * timeline beat, each scoped to that beat's Scene doc — so an author sees exactly
 * which beats still need art. Rather than a live Studio, we drive the resolver
 * with a recording stub of the structure builder and assert the tree it emits:
 * every git-manifest beat gets its own list item and a `beat`/`beatRef`-scoped
 * documentList filter.
 */

interface Call {
  method: string;
  args: unknown[];
}

// Every builder node records the chained calls made against it and returns
// itself, so `.title().filter().params()` all land on one record. Factory
// methods on `S` mint a fresh recording node; the flat `nodes` registry lets a
// test inspect any node without walking the tree.
const nodes: Call[][] = [];

function makeNode(): Record<string, (...args: unknown[]) => unknown> {
  const record: Call[] = [];
  nodes.push(record);
  const node = new Proxy({} as Record<string, (...args: unknown[]) => unknown>, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return (...args: unknown[]) => {
        record.push({ method: prop, args });
        return node;
      };
    },
  });
  return node;
}

const S = {
  list: makeNode,
  listItem: makeNode,
  document: makeNode,
  documentList: makeNode,
  documentTypeListItem: makeNode,
  divider: makeNode,
  initialValueTemplateItem: makeNode,
};

// Drive the real resolver once with the recording stub. The resolver ignores the
// second (context) argument for the Scene-art coverage map, so a stub suffices.
structure(
  S as unknown as Parameters<typeof structure>[0],
  {} as unknown as Parameters<typeof structure>[1],
);

/** The recording node that carries a beat/beatRef-scoped Scene documentList. */
function beatListNode(kind: 'reading' | 'timeline', beatRef: string): Call[] | undefined {
  return nodes.find(
    (rec) =>
      rec.some(
        (c) =>
          c.method === 'filter' &&
          typeof c.args[0] === 'string' &&
          c.args[0].includes(`beat == "${kind}"`),
      ) &&
      rec.some(
        (c) => c.method === 'params' && (c.args[0] as { beatRef?: string })?.beatRef === beatRef,
      ),
  );
}

const idCalls = nodes.flatMap((rec) => rec.filter((c) => c.method === 'id').map((c) => c.args[0]));

/** Audit one beat kind: the list-item ids it should emit, and which beats are
 *  missing a scoped documentList or its new-doc pre-fill (empty ⇒ full coverage).
 *  Returning the *misses* as arrays gives a readable diff naming the failing beat
 *  without an `expect` message argument (unsupported by vitest). */
function auditKind(kind: 'reading' | 'timeline', beatRefs: readonly string[]) {
  return {
    ids: beatRefs.map((b) => `scene-${kind}-${b}`),
    missingScoped: beatRefs.filter((b) => !beatListNode(kind, b)),
    missingTemplate: beatRefs.filter((b) => {
      const node = beatListNode(kind, b);
      return !node || !node.some((c) => c.method === 'initialValueTemplates');
    }),
  };
}

describe('Studio Scene-art desk structure', () => {
  it('yields one beatRef-scoped list item per reading chapter', () => {
    expect(READING_BEATS.length).toBeGreaterThan(0);
    const { ids, missingScoped, missingTemplate } = auditKind('reading', READING_BEATS);
    expect(idCalls).toEqual(expect.arrayContaining(ids));
    expect(missingScoped).toEqual([]);
    expect(missingTemplate).toEqual([]);
  });

  it('yields one beatRef-scoped list item per timeline beat', () => {
    expect(TIMELINE_BEATS.length).toBeGreaterThan(0);
    const { ids, missingScoped, missingTemplate } = auditKind('timeline', TIMELINE_BEATS);
    expect(idCalls).toEqual(expect.arrayContaining(ids));
    expect(missingScoped).toEqual([]);
    expect(missingTemplate).toEqual([]);
  });

  it('scopes each documentList to a single Scene beat (no cross-beat leakage)', () => {
    const readingFilters = nodes
      .flatMap((rec) => rec.filter((c) => c.method === 'filter'))
      .map((c) => c.args[0])
      .filter((f): f is string => typeof f === 'string' && f.includes('beat == "reading"'));
    const timelineFilters = nodes
      .flatMap((rec) => rec.filter((c) => c.method === 'filter'))
      .map((c) => c.args[0])
      .filter((f): f is string => typeof f === 'string' && f.includes('beat == "timeline"'));

    // One filtered list per beat — a coverage map, not a single flat list.
    expect(readingFilters).toHaveLength(READING_BEATS.length);
    expect(timelineFilters).toHaveLength(TIMELINE_BEATS.length);
    // Every per-beat filter also pins beatRef, so a beat only claims its own art.
    for (const f of [...readingFilters, ...timelineFilters]) {
      expect(f).toContain('beatRef == $beatRef');
    }
  });
});
