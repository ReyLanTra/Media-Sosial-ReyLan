import * as React from 'react';
import { getSiteSettings } from '@/lib/db';
import LatarMusikClient from './LatarMusikClient';

export const revalidate = 0;

export default async function LatarMusikPage() {
  const settings = await getSiteSettings();

  return <LatarMusikClient initialSettings={settings} />;
}
