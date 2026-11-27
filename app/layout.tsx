import type { Metadata } from 'next';
import { Oswald, Plus_Jakarta_Sans, JetBrains_Mono, Yellowtail } from 'next/font/google';
import './globals.css';

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const yellowtail = Yellowtail({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-vice',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vice VI · 3D Cloth Gallery',
  description:
    'Interactive Three.js neon bathroom and Canvas UI cloth shower curtain gallery for inspecting high-resolution GTA VI-inspired character textures.',
  openGraph: {
    title: 'Vice VI · 3D Cloth Gallery',
    description:
      'Interactive Three.js neon bathroom and Canvas UI cloth shower curtain gallery for inspecting high-resolution GTA VI-inspired character textures.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vice VI · 3D Cloth Gallery',
    description:
      'Interactive Three.js neon bathroom and Canvas UI cloth shower curtain gallery for inspecting high-resolution GTA VI-inspired character textures.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${yellowtail.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#08070f] text-white antialiased overflow-hidden selection:bg-[#ff4fd8]/30 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
