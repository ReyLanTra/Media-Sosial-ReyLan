import * as React from 'react';
import { getSubscriptionsCount } from '@/app/actions';
import NotifikasiClient from './NotifikasiClient';

export const revalidate = 0;

export default async function NotifikasiPage() {
  const count = await getSubscriptionsCount();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">Push Notifikasi</h1>
        <p className="text-sm text-slate-400">
          Kirim notifikasi langsung ke perangkat pengunjung yang telah memberikan izin.
        </p>
      </div>

      <NotifikasiClient initialSubscriberCount={count} />
    </div>
  );
}
