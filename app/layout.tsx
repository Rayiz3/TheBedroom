import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://fabric-061-material-study.rayiz3.chatgpt.site'),
  title: 'The Bedroom · 3D Preview Workspace',
  description: '침실 모델과 텍스타일 소재를 검토하는 인터랙티브 3D 프리뷰 작업 공간입니다.',
  openGraph: {
    title: 'The Bedroom · 3D Preview Workspace',
    description: 'Interactive room and textile preview workspace',
    url: '/',
    siteName: 'The Bedroom',
    images: [{ url: '/og.png', width: 1536, height: 1024, alt: 'Fabric 061 woven material sphere' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Bedroom · 3D Preview Workspace',
    description: 'Interactive room and textile preview workspace',
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
