import type { StructureResolver } from 'sanity/structure';

/**
 * Studio desk layout (ADR-0011). Pins Site settings as a single editable
 * document (not a create-many list) and lists Subjects + Scene art. Subjects
 * carry their own kind, so we keep one flat list rather than a folder per kind.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Media')
    .items([
      S.listItem()
        .title('Site settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.documentTypeListItem('subject').title('Subjects'),
      S.documentTypeListItem('scene').title('Scene art'),
    ]);
