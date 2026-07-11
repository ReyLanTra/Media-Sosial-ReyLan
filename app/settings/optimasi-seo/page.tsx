import * as React from 'react';
import { getSiteSettings } from '@/lib/db';
import OptimasiSeoClient from './OptimasiSeoClient';

export const revalidate = 0;

export default async function OptimasiSeoPage() {
  const settings = await getSiteSettings();

  return <OptimasiSeoClient initialSettings={settings} />;
}
