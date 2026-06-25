import Image from 'next/image';

interface ContentImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
}

/**
 * Single seam for codex/reading content art. These come from the content loader
 * as `/content-media/...` paths with no intrinsic dimensions, so next/image
 * (which needs known width+height, or `fill` over a sized container the
 * per-figure CSS doesn't establish) can't safely optimize them yet. When an
 * entry supplies explicit width+height we hand off to next/image; otherwise we
 * render a raw <img>. Upgrade path: record dimensions in the loader/frontmatter
 * and they flow straight through to optimization with no call-site change.
 */
export function ContentImage({ src, alt, width, height, loading }: ContentImageProps) {
  if (width && height) {
    return <Image src={src} alt={alt} width={width} height={height} loading={loading} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={loading} />;
}
