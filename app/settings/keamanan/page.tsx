import * as React from 'react';
import { getSiteSettings } from '@/lib/db';
import KeamananClient from './KeamananClient';

export const revalidate = 0;

export default async function KeamananPage() {
  const settings = await getSiteSettings();

  return <KeamananClient initialSettings={settings} />;
}
