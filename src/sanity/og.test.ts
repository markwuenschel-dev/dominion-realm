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

// Chainable urlFor builder that records the source it was handed and the crop.
type Builder = {
  width: (n: number) => Builder;
  height: (n: number) => Builder;
  fit: (s: string) => Builder;
  format: (s: string) => Builder;
  quality: (n: number) => Builder;
  url: () => string;
};
const chain: Builder = {
  width: vi.fn<Builder['width']>(() => chain),
  height: vi.fn<Builder['height']>(() => chain),
  fit: vi.fn<Builder['fit']>(() => chain),
  format: vi.fn<Builder['format']>(() => chain),
  quality: vi.fn<Builder['quality']>(() => chain),
  url: vi.fn<Builder['url']>(() => 'https://cdn.sanity.io/crop.jpg'),
};
const urlFor = vi.fn<(source: unknown) => Builder>(() => chain);
vi.mock('./image', () => ({ urlFor }));

async function loadOg() {
  vi.resetModules();
  return import('./og');
}

const primary = { source: { asset: { _ref: 'image-primary-800x1000-jpg' } }, alt: 'Portrait' };
const social = { source: { asset: { _ref: 'image-social-1200x630-jpg' } }, alt: '' };

beforeEach(() => {
  getSocialImage.mockReset();
  urlFor.mockClear();
  Object.values(chain).forEach((fn) => (fn as unknown as { mockClear(): void }).mockClear());
});

describe('defaultSocialImage', () => {
  it('crops siteSettings.socialImage to the 1200×630 social frame', async () => {
    getSocialImage.mockResolvedValue(social);
    const { defaultSocialImage } = await loadOg();

    expect(await defaultSocialImage()).toBe('https://cdn.sanity.io/crop.jpg');
    expect(urlFor).toHaveBeenCalledWith(social.source);
    expect(chain.width).toHaveBeenCalledWith(1200);
    expect(chain.height).toHaveBeenCalledWith(630);
    expect(chain.format).toHaveBeenCalledWith('jpg'); // scraper-safe, not webp/avif
  });

  it('falls back to the static og-default when no social image is set', async () => {
    getSocialImage.mockResolvedValue(null);
    const { defaultSocialImage, OG_DEFAULT } = await loadOg();

    expect(await defaultSocialImage()).toBe(OG_DEFAULT);
    expect(urlFor).not.toHaveBeenCalled();
  });
});

describe('entrySocialImage', () => {
  it('uses a teaser entry’s Primary, cropped to the social frame', async () => {
    const { entrySocialImage } = await loadOg();

    expect(await entrySocialImage('teaser', primary)).toBe('https://cdn.sanity.io/crop.jpg');
    expect(urlFor).toHaveBeenCalledWith(primary.source);
    expect(getSocialImage).not.toHaveBeenCalled(); // Primary short-circuits the default
  });

  it('falls back to the default when a teaser entry has no Primary', async () => {
    getSocialImage.mockResolvedValue(social);
    const { entrySocialImage } = await loadOg();

    expect(await entrySocialImage('teaser', null)).toBe('https://cdn.sanity.io/crop.jpg');
    expect(urlFor).toHaveBeenCalledWith(social.source);
    expect(urlFor).not.toHaveBeenCalledWith(primary.source);
  });

  it('never uses a sealed entry’s Primary — sealed entries get the default', async () => {
    getSocialImage.mockResolvedValue(null);
    const { entrySocialImage, OG_DEFAULT } = await loadOg();

    for (const tier of ['reader', 'deep', 'beyond'] as const) {
      expect(await entrySocialImage(tier, primary)).toBe(OG_DEFAULT);
    }
    expect(urlFor).not.toHaveBeenCalled(); // the sealed Primary is never cropped
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
