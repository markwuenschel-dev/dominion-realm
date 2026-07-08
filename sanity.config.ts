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
  schema: { types: schemaTypes },
  plugins: [structureTool({ structure }), visionTool({ defaultApiVersion: apiVersion })],
});
