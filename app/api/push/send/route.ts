import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { isAuthenticated } from '@/lib/auth';

// Inisialisasi VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:example@yourdomain.com';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(req: NextRequest) {
  try {
    // Keamanan: Hanya admin yang boleh mengirim notifikasi
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ success: false, message: 'Akses ditolak.' }, { status: 401 });
    }

    const { payload, subscriptions } = await req.json();

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'VAPID keys belum dikonfigurasi di environment variable server.' 
      }, { status: 500 });
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Pesan Baru dari ReyLan',
      body: payload.message || 'Cek informasi terbaru di halaman profil kami.',
      icon: payload.icon || '/icon-192x192.png',
      image: payload.image || undefined,
      badge: payload.badge || undefined,
      data: {
        url: process.env.NEXT_PUBLIC_APP_URL || '/',
      }
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub: any) => 
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh
            }
          },
          notificationPayload
        )
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failCount = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil mengirim ke ${successCount} perangkat. Gagal: ${failCount}.`,
      details: results
    });
  } catch (error: any) {
    console.error('Push Notification Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Terjadi kesalahan sistem saat mengirim notifikasi.' 
    }, { status: 500 });
  }
}
