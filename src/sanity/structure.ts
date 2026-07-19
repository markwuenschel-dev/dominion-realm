import type { StructureResolver } from 'sanity/structure';
import { READING_BEATS, TIMELINE_BEATS } from './content-manifest';

/**
 * Studio desk layout (ADR-0011). Pins Site settings as a single editable
 * document (not a create-many list) and lists Subjects + Scene art. Subjects
 * carry their own kind, so we keep one flat list rather than a folder per kind.
 *
 * Scene art is a **coverage map**: one row per reading chapter and timeline
 * beat (from the git `content-manifest`, since Studio can't read the content
 * tree), each opening to that beat's Scene doc or an empty "No documents" pane
 * that reads as *needs art*. New docs created inside a beat's pane are
 * pre-filled with its beat + beatRef.
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
              S.listItem()
                .title('Reading')
                .id('sceneArt-reading')
                .child(
                  S.list()
                    .title('Reading chapters')
                    .items(
                      READING_BEATS.map((beatRef) =>
                        S.listItem()
                          .id(`scene-reading-${beatRef}`)
                          .title(beatRef)
                          .child(
                            S.documentList()
                              .title(beatRef)
                              .schemaType('scene')
                              .filter(
                                '_type == "scene" && beat == "reading" && beatRef == $beatRef',
                              )
                              .params({ beatRef })
                              .initialValueTemplates([
                                S.initialValueTemplateItem('scene-for-beat', {
                                  beat: 'reading',
                                  beatRef,
                                }),
                              ]),
                          ),
                      ),
                    ),
                ),
              S.listItem()
                .title('Timeline')
                .id('sceneArt-timeline')
                .child(
                  S.list()
                    .title('Timeline events')
                    .items(
                      TIMELINE_BEATS.map((beatRef) =>
                        S.listItem()
                          .id(`scene-timeline-${beatRef}`)
                          .title(beatRef)
                          .child(
                            S.documentList()
                              .title(beatRef)
                              .schemaType('scene')
                              .filter(
                                '_type == "scene" && beat == "timeline" && beatRef == $beatRef',
                              )
                              .params({ beatRef })
                              .initialValueTemplates([
                                S.initialValueTemplateItem('scene-for-beat', {
                                  beat: 'timeline',
                                  beatRef,
                                }),
                              ]),
                          ),
                      ),
                    ),
                ),
            ]),
        ),
    ]);
