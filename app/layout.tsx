import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://fabric-061-material-study.rayiz3.chatgpt.site'),
  title: 'Fabric 061 · WebGPU Material Study',
  description: 'An interactive WebGPU material preview built with Three.js and React Three Fiber.',
  openGraph: {
    title: 'Fabric 061 · WebGPU Material Study',
    description: 'Interactive WebGPU material preview',
    url: '/',
    siteName: 'Fabric 061 · WebGPU Material Study',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Fabric 061 woven material sphere' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fabric 061 · WebGPU Material Study',
    description: 'Interactive WebGPU material preview',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
