import * as React from 'react';
import { fetchAnnouncements } from '@/app/actions';
import PengumumanClient from './PengumumanClient';

export const revalidate = 0;

export default async function PengumumanPage() {
  const res = await fetchAnnouncements();
  const announcements = res.success && res.data ? res.data : [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Papan Pengumuman</h1>
        <p className="text-sm text-slate-400">
          Kelola informasi atau pengumuman penting yang akan muncul di atas daftar media sosial Anda.
        </p>
      </div>

      <PengumumanClient initialAnnouncements={announcements} />
    </div>
  );
}
