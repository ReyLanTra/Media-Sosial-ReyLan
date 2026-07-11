import * as React from 'react';
import type { Metadata } from 'next';
import { getSiteSettings, getStatusConfig } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import SettingsLayoutClient from './SettingsLayoutClient';

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getSiteSettings();
    return {
      icons: settings.favicon_url 
        ? [{ rel: 'icon', url: settings.favicon_url }] 
        : [{ rel: 'icon', url: '/favicon.ico' }],
    };
  } catch (error) {
    return {
      icons: [{ rel: 'icon', url: '/favicon.ico' }],
    };
  }
}

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
