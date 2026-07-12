import * as React from 'react';
import { Metadata } from 'next';
import { getSiteSettings, getSocialButtons, getBackgroundImages, getMusicTracks, getAnnouncements } from '@/lib/db';
import ProfileView from '@/components/ProfileView';

// Menghasilkan meta-data Open Graph dan Favicon dinamis secara real-time dari database
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.reylan.my.id';
    const appUrl = rawAppUrl.endsWith('/') ? rawAppUrl : `${rawAppUrl}/`;

    // Pastikan URL og:image absolut dan memiliki cache-busting
    let ogImageUrl = settings.og_image_url || '';
    if (ogImageUrl) {
      if (!ogImageUrl.startsWith('http://') && !ogImageUrl.startsWith('https://')) {
        const cleanAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
        const cleanOgPath = ogImageUrl.startsWith('/') ? ogImageUrl : `/${ogImageUrl}`;
        ogImageUrl = `${cleanAppUrl}${cleanOgPath}`;
      }
      
      // Jika belum ada tanda tanya (query param), berikan default versioning v=1
      if (!ogImageUrl.includes('?')) {
        ogImageUrl = `${ogImageUrl}?v=1`;
      }
    }

    const imageType = ogImageUrl.toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';

    return {
      title: settings.og_title || settings.account_name,
      description: settings.og_description || settings.bio,
      metadataBase: new URL(appUrl),
      openGraph: {
        title: settings.og_title || settings.account_name,
        description: settings.og_description || settings.bio,
        url: appUrl,
        siteName: settings.account_name,
        images: ogImageUrl ? [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            type: imageType,
            alt: settings.og_title || settings.account_name,
          }
        ] : [],
        type: 'website',
      },
      icons: settings.favicon_url 
        ? [{ rel: 'icon', url: settings.favicon_url }] 
        : [{ rel: 'icon', url: '/favicon.ico' }],
      other: settings.fb_app_id ? {
        'fb:app_id': settings.fb_app_id
      } : {},
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Media Sosial ReyLan',
      description: 'Halaman Link-in-Bio Resmi ReyLan',
    };
  }
}

// Menonaktifkan caching penuh agar perubahan di halaman pengaturan langsung instan terlihat
export const revalidate = 0;

export default async function HomePage() {
  // Fetch data dari database di sisi server (Sangat cepat dan ramah SEO)
  const settings = await getSiteSettings();
  const buttons = await getSocialButtons();
  const mobileBgImages = await getBackgroundImages('mobile');
  const desktopBgImages = await getBackgroundImages('desktop');
  const tracks = await getMusicTracks();
  const announcements = await getAnnouncements();

  return (
    <ProfileView 
      settings={settings} 
      buttons={buttons} 
      mobileBgImages={mobileBgImages}
      desktopBgImages={desktopBgImages}
      tracks={tracks}
      announcements={announcements}
    />
  );
}
