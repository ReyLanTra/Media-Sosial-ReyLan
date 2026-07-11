import * as React from 'react';
import { Metadata } from 'next';
import { getSiteSettings, getSocialButtons, getBackgroundImages, getMusicTracks } from '@/lib/db';
import ProfileView from '@/components/ProfileView';

// Menghasilkan meta-data Open Graph dan Favicon dinamis secara real-time dari database
export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    return {
      title: settings.og_title || settings.account_name,
      description: settings.og_description || settings.bio,
      openGraph: {
        title: settings.og_title || settings.account_name,
        description: settings.og_description || settings.bio,
        images: settings.og_image_url ? [{ url: settings.og_image_url }] : [],
        type: 'website',
      },
      icons: settings.favicon_url 
        ? [{ rel: 'icon', url: settings.favicon_url }] 
        : [{ rel: 'icon', url: '/favicon.ico' }],
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

  return (
    <ProfileView 
      settings={settings} 
      buttons={buttons} 
      mobileBgImages={mobileBgImages}
      desktopBgImages={desktopBgImages}
      tracks={tracks}
    />
  );
}
