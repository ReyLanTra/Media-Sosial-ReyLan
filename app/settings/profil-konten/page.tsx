import * as React from 'react';
import { getSiteSettings } from '@/lib/db';
import ProfilKontenClient from './ProfilKontenClient';

export const revalidate = 0;

export default async function ProfilKontenPage() {
  const settings = await getSiteSettings();

  return <ProfilKontenClient initialSettings={settings} />;
}
