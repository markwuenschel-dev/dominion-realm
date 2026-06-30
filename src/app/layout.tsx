import type { Metadata } from 'next';
import { Cormorant_Garamond, Spectral, Space_Mono } from 'next/font/google';
import '@/styles/global.css';
import { RevealProvider } from '@/components/reveal/RevealContext';
import { Analytics } from '@/components/Analytics';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';

/**
 * Root layout (migrated from Base.astro, ADR-0010). Self-hosts the three Realm
 * faces via next/font and exposes them as the `--font-display|body|mono` CSS
 * variables that tokens.css resolves. Wraps the app in the reveal provider so
 * every page's gates/toggle share one level.
 */

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const body = Spectral({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const DESCRIPTION =
  "An Earth gamer's cybernetic implant translates a real metaphysical world into RPG logic — until he realizes the interface is not the world. It is only his way of surviving contact with it.";

export const metadata: Metadata = {
  metadataBase: new URL('https://dominionrealm.com'),
  title: {
    default: 'The Dominion Realm — An Interface Fantasy Novel',
    template: '%s — The Dominion Realm',
  },
  description: DESCRIPTION,
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    title: 'The Dominion Realm',
    description: DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      {/* Reads localStorage before first paint to avoid theme flash */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var themes={grimoire:'dark',parchment:'light',slate:'light',solstice:'light'};var t=localStorage.getItem('dr-theme');if(t==='dark')t='grimoire';if(t&&t!=='grimoire'&&themes[t]){document.documentElement.dataset.theme=t;document.documentElement.dataset.themeMode=themes[t]}else{document.documentElement.dataset.themeMode='dark'}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <RevealProvider>{children}</RevealProvider>
        <ThemeSwitcher />
        <Analytics />
      </body>
    </html>
  );
}
