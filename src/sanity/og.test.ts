import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Social/OG image resolution (ADR-0011, Phase 4). We assert the externally
 * observable rule: a teaser entry's Primary becomes its OG image; a sealed entry,
 * an entry with no Primary, and the site default all fall back to
 * `siteSettings.socialImage`, then the static `og-default.png`. The Sanity read
 * (`getSocialImage`) and the CDN URL builder (`urlFor`) are mocked so we can
 * assert *which* source gets cropped, and to the 1200×630 social frame.
 */

const getSocialImage = vi.fn<() => Promise<{ source: unknown; alt: string } | null>>();
vi.mock('./media', () => ({ getSocialImage }));

// The fixed-crop seam, mocked to record which source it crops and to what frame,
// without hitting the real Sanity CDN builder.
const imageUrl = vi.fn<(source: unknown, opts: Record<string, unknown>) => string>(
  () => 'https://cdn.sanity.io/crop.jpg',
);
vi.mock('./image', () => ({ imageUrl }));

async function loadOg() {
  vi.resetModules();
  return import('./og');
}

const primary = {
  source: { asset: { _ref: 'image-primary-800x1000-jpg' } },
  alt: 'Portrait',
  credit: null,
};
const social = {
  source: { asset: { _ref: 'image-social-1200x630-jpg' } },
  alt: '',
  credit: null,
};

beforeEach(() => {
  getSocialImage.mockReset();
  imageUrl.mockClear();
});

describe('defaultSocialImage', () => {
  it('crops siteSettings.socialImage to the 1200×630 social frame', async () => {
    getSocialImage.mockResolvedValue(social);
    const { defaultSocialImage } = await loadOg();

    expect(await defaultSocialImage()).toBe('https://cdn.sanity.io/crop.jpg');
    expect(imageUrl).toHaveBeenCalledWith(
      social.source,
      // 1200x630 social frame, scraper-safe jpg (not webp/avif).
      expect.objectContaining({ width: 1200, height: 630, fit: 'crop', format: 'jpg' }),
    );
  });

  it('falls back to the static og-default when no social image is set', async () => {
    getSocialImage.mockResolvedValue(null);
    const { defaultSocialImage, OG_DEFAULT } = await loadOg();

    expect(await defaultSocialImage()).toBe(OG_DEFAULT);
    expect(imageUrl).not.toHaveBeenCalled();
  });
});

describe('entrySocialImage', () => {
  it('uses a teaser entry’s Primary, cropped to the social frame', async () => {
    const { entrySocialImage } = await loadOg();

    expect(await entrySocialImage('teaser', primary)).toBe('https://cdn.sanity.io/crop.jpg');
    expect(imageUrl).toHaveBeenCalledWith(
      primary.source,
      expect.objectContaining({ width: 1200, height: 630, fit: 'crop' }),
    );
    expect(getSocialImage).not.toHaveBeenCalled(); // Primary short-circuits the default
  });

  it('falls back to the default when a teaser entry has no Primary', async () => {
    getSocialImage.mockResolvedValue(social);
    const { entrySocialImage } = await loadOg();

    expect(await entrySocialImage('teaser', null)).toBe('https://cdn.sanity.io/crop.jpg');
    expect(imageUrl).toHaveBeenCalledWith(social.source, expect.objectContaining({ width: 1200 }));
    expect(imageUrl).not.toHaveBeenCalledWith(primary.source, expect.anything());
  });

  it('never uses a sealed entry’s Primary — sealed entries get the default', async () => {
    getSocialImage.mockResolvedValue(null);
    const { entrySocialImage, OG_DEFAULT } = await loadOg();

    for (const tier of ['reader', 'deep', 'beyond'] as const) {
      expect(await entrySocialImage(tier, primary)).toBe(OG_DEFAULT);
    }
    expect(imageUrl).not.toHaveBeenCalled(); // the sealed Primary is never cropped
  });
});

describe('previewMetadata', () => {
  it('mirrors title/description/image into OG and a large Twitter card', async () => {
    const { previewMetadata } = await loadOg();
    const meta = previewMetadata('Marcus Vye', 'A gamer in a real Realm.', '/img.jpg');

    expect(meta.title).toBe('Marcus Vye');
    expect(meta.description).toBe('A gamer in a real Realm.');
    expect(meta.openGraph).toMatchObject({
      title: 'Marcus Vye',
      description: 'A gamer in a real Realm.',
      images: ['/img.jpg'],
    });
    // Self-contained twitter block: re-declares the card so the shallow metadata
    // merge doesn't drop it back to a small summary.
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: ['/img.jpg'] });
  });
});
