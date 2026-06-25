import Script from 'next/script';

/**
 * GA4 analytics, gated on NEXT_PUBLIC_GA4_ID (renamed from PUBLIC_GA4_ID in the
 * Astro build). Renders nothing when the id is unset, so dev/preview stay clean.
 */
export function Analytics() {
  const id = process.env.NEXT_PUBLIC_GA4_ID;
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `}
      </Script>
    </>
  );
}
