import * as React from 'react';
import { getSiteSettings, getSocialButtons } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import SettingsClient from './SettingsClient';

// Menonaktifkan caching penuh agar setiap perpindahan tab/pengisian instan sinkron
export const revalidate = 0;

export default async function SettingsPage() {
  // Mengecek autentikasi sesi admin secara aman di server-side sebelum memuat komponen
  const authed = await isAuthenticated();
  const settings = await getSiteSettings();
  const buttons = await getSocialButtons();

  return (
    <SettingsClient
      initialSettings={settings}
      initialButtons={buttons}
      isAuthenticated={authed}
    />
  );
}
