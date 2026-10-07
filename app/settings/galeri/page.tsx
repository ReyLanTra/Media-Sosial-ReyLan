import * as React from 'react';
import { getGalleryItems } from '@/lib/db';
import GallerySettingsClient from './GallerySettingsClient';

export const revalidate = 0;

export default async function GallerySettingsPage() {
  const initialItems = await getGalleryItems();

  return <GallerySettingsClient initialItems={initialItems} />;
}
