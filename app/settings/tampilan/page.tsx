import * as React from 'react';
import { getSiteSettings } from '@/lib/db';
import TampilanClient from './TampilanClient';

export const revalidate = 0;

export default async function TampilanPage() {
  const settings = await getSiteSettings();

  return <TampilanClient initialSettings={settings} />;
}
