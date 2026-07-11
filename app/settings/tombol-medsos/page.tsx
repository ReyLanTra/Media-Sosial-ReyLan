import * as React from 'react';
import { getSocialButtons } from '@/lib/db';
import TombolMedsosClient from './TombolMedsosClient';

export const revalidate = 0;

export default async function TombolMedsosPage() {
  const buttons = await getSocialButtons();

  return <TombolMedsosClient initialButtons={buttons} />;
}
