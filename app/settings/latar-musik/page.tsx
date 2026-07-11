import * as React from 'react';
import { getSiteSettings, getBackgroundImages, getMusicTracks } from '@/lib/db';
import LatarMusikClient from './LatarMusikClient';

export const revalidate = 0;

export default async function LatarMusikPage() {
  const settings = await getSiteSettings();
  const mobileBgImages = await getBackgroundImages('mobile');
  const desktopBgImages = await getBackgroundImages('desktop');
  const tracks = await getMusicTracks();

  return (
    <LatarMusikClient 
      initialSettings={settings} 
      initialMobileBgImages={mobileBgImages}
      initialDesktopBgImages={desktopBgImages}
      initialTracks={tracks}
    />
  );
}
