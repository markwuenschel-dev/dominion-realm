import type { StructureResolver } from 'sanity/structure';
import { READING_BEATS } from './content-manifest';

/**
 * Studio desk layout (ADR-0011). Pins Site settings as a single editable
 * document (not a create-many list) and lists Subjects + Scene art. Subjects
 * carry their own kind, so we keep one flat list rather than a folder per kind.
 *
 * Scene art is dormant until content exists (ADR-0014), and a chapter with no
 * art looks identical to one you simply haven't reached — so the "Scene art"
 * pane doubles as a **coverage map**: one row per reading chapter (from the git
 * `content-manifest`, since Studio can't read the content tree), each opening to
 * that chapter's Scene doc or an empty "No documents" pane that reads as *needs
 * art*. New docs created inside a chapter's pane are pre-filled with its beat.
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
      S.listItem()
        .title('Scene art')
        .id('sceneArt')
        .child(
          S.list()
            .title('Scene art')
            .items([
              S.documentTypeListItem('scene').title('All scene art'),
              S.divider(),
              // Coverage map: every reading chapter, art or not.
              ...READING_BEATS.map((beatRef) =>
                S.listItem()
                  .id(`scene-reading-${beatRef}`)
                  .title(beatRef)
                  .child(
                    S.documentList()
                      .title(beatRef)
                      .schemaType('scene')
                      .filter('_type == "scene" && beat == "reading" && beatRef == $beatRef')
                      .params({ beatRef })
                      .initialValueTemplates([
                        S.initialValueTemplateItem('scene-for-beat', { beat: 'reading', beatRef }),
                      ]),
                  ),
              ),
            ]),
        ),
    ]);
