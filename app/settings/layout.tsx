import * as React from 'react';
import { getSiteSettings, getStatusConfig } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import SettingsLayoutClient from './SettingsLayoutClient';

export const revalidate = 0;

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  const settings = await getSiteSettings();
  const dbStatus = await getStatusConfig();

  return (
    <SettingsLayoutClient
      initialSettings={settings}
      isAuthenticated={authed}
      dbStatus={dbStatus}
    >
      {children}
    </SettingsLayoutClient>
  );
}
