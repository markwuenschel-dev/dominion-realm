import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { projectId, dataset, apiVersion } from './src/sanity/env';
import { schemaTypes } from './src/sanity/schema';
import { structure } from './src/sanity/structure';

/**
 * Sanity Studio config for the media layer (ADR-0011). The Studio is embedded in
 * this Next app at `/studio` (basePath), mirroring how Keystatic lives at
 * `/keystatic` — one door, own domain. It manages ONLY media (Subjects, Scene
 * art, the cover); prose stays in git/Keystatic.
 */
export default defineConfig({
  name: 'dominion-realm-media',
  title: 'The Dominion Realm — Media',
  basePath: '/studio',
  projectId,
  dataset,
  schema: {
    types: schemaTypes,
    // A Scene created from a chapter's coverage pane (see `structure.ts`) is
    // pre-filled with that chapter's beat + beatRef, so the git↔Sanity join
    // can't be typo'd at the point it's created (ADR-0014).
    templates: (prev) => [
      ...prev,
      {
        id: 'scene-for-beat',
        title: 'Scene art for a beat',
        schemaType: 'scene',
        parameters: [
          { name: 'beat', type: 'string' },
          { name: 'beatRef', type: 'string' },
        ],
        value: ({ beat, beatRef }: { beat: string; beatRef: string }) => ({
          beat,
          beatRef,
          title: beatRef,
        }),
      },
    ],
  },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
});
