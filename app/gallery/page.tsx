import * as React from 'react';
import { Metadata } from 'next';
import { 
  getSiteSettings, 
  getBackgroundImages, 
  getMusicTracks, 
  getGalleryItems 
} from '@/lib/db';
import GalleryView from '@/components/GalleryView';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.reylan.my.id';
    const appUrl = rawAppUrl.endsWith('/') ? rawAppUrl : `${rawAppUrl}/`;

    return {
      title: `Galeri Foto & Video - ${settings.account_name}`,
      description: `Koleksi foto dan video kenangan resmi ${settings.account_name}.`,
      metadataBase: new URL(appUrl),
      openGraph: {
        title: `Galeri Foto & Video - ${settings.account_name}`,
        description: `Koleksi foto dan video kenangan resmi ${settings.account_name}.`,
        url: `${appUrl}gallery`,
        siteName: settings.account_name,
        type: 'website',
      },
      icons: settings.favicon_url 
        ? [
            { rel: 'icon', url: settings.favicon_url },
            { rel: 'shortcut icon', url: settings.favicon_url },
            { rel: 'apple-touch-icon', url: settings.favicon_url }
          ] 
        : [{ rel: 'icon', url: '/favicon.ico' }],
    };
  } catch (e) {
    return {
      title: 'Galeri Foto & Video',
      description: 'Halaman Galeri Foto & Video',
    };
  }
}

export const revalidate = 0;

export default async function GalleryPage() {
  const settings = await getSiteSettings();
  const mobileBgImages = await getBackgroundImages('mobile');
  const desktopBgImages = await getBackgroundImages('desktop');
  const tracks = await getMusicTracks();
  const galleryItems = await getGalleryItems();

  return (
    <GalleryView
      settings={settings}
      mobileBgImages={mobileBgImages}
      desktopBgImages={desktopBgImages}
      tracks={tracks}
      galleryItems={galleryItems}
    />
  );
}
