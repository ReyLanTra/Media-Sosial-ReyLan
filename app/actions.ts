'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import {
  getSiteSettings,
  updateSiteSettings,
  getSocialButtons,
  addSocialButton,
  updateSocialButton,
  deleteSocialButton,
  deleteFileFromStorage,
  getBackgroundImages,
  addBackgroundImage,
  deleteBackgroundImage,
  getMusicTracks,
  addMusicTrack,
  updateMusicTrack,
  deleteMusicTrack,
  getAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  savePushSubscription,
  getAllPushSubscriptions,
  updateBackgroundImage,
  getGalleryItems,
  addGalleryItem,
  deleteGalleryItem,
  SiteSettings,
  SocialButton,
  BackgroundImage,
  MusicTrack,
  Announcement,
  GalleryItem,
  PushSubscriptionData,
  getStatusConfig,
} from '@/lib/db';
import { loginAdmin, logoutAdmin, isAuthenticated } from '@/lib/auth';
import webpush from 'web-push';

// --- AUTH ACTIONS ---

export async function login(password: string) {
  try {
    const success = await loginAdmin(password);
    if (success) {
      return { success: true, message: 'Login berhasil!' };
    }
    return { success: false, message: 'Password salah.' };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Terjadi kesalahan sistem.' };
  }
}

export async function logout() {
  await logoutAdmin();
  revalidatePath('/');
  return { success: true };
}

export async function checkAuth() {
  const authed = await isAuthenticated();
  return { authenticated: authed };
}

export async function changeAdminPassword(oldPass: string, newPass: string) {
  const authed = await isAuthenticated();
  if (!authed) {
    throw new Error('Akses ditolak. Anda tidak terautentikasi.');
  }

  const settings = await getSiteSettings();
  const isOldValid = await bcrypt.compare(oldPass, settings.admin_password_hash);
  if (!isOldValid) {
    return { success: false, message: 'Password lama salah.' };
  }

  if (newPass.length < 6) {
    return { success: false, message: 'Password baru minimal harus 6 karakter.' };
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPass, salt);

  await updateSiteSettings({ admin_password_hash: newHash });
  
  // Perbarui cookie sesi admin agar tidak ter-logout setelah ganti password
  await loginAdmin(newPass);

  return { success: true, message: 'Password berhasil diubah!' };
}

// --- SITE CONFIG ACTIONS ---

export async function getSettings() {
  return await getSiteSettings();
}

export async function updateSettings(data: Partial<SiteSettings>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    }

    const updated = await updateSiteSettings(data);
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (err: any) {
    console.error('Error in updateSettings action:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui pengaturan situs.' };
  }
}

// --- SOCIAL BUTTON ACTIONS ---

export async function getButtons() {
  return await getSocialButtons();
}

export async function addBtn(data: { platform_name: string; logo_url: string; target_url: string; display_order: number; is_active: boolean }) {
  const authed = await isAuthenticated();
  if (!authed) {
    throw new Error('Akses ditolak. Anda tidak terautentikasi.');
  }

  const button = await addSocialButton(data);
  revalidatePath('/');
  return button;
}

export async function updateBtn(id: string, data: Partial<SocialButton>) {
  const authed = await isAuthenticated();
  if (!authed) {
    throw new Error('Akses ditolak. Anda tidak terautentikasi.');
  }

  const button = await updateSocialButton(id, data);
  revalidatePath('/');
  return button;
}

export async function deleteBtn(id: string, logoUrlToDelete?: string) {
  const authed = await isAuthenticated();
  if (!authed) {
    throw new Error('Akses ditolak. Anda tidak terautentikasi.');
  }

  // Hapus logo dari storage jika ada
  if (logoUrlToDelete) {
    await deleteFileFromStorage('logo-medsos', logoUrlToDelete);
  }

  const success = await deleteSocialButton(id);
  revalidatePath('/');
  return success;
}

// Memperbarui urutan semua tombol sekaligus
export async function reorderButtons(buttons: { id: string; display_order: number }[]) {
  const authed = await isAuthenticated();
  if (!authed) {
    throw new Error('Akses ditolak. Anda tidak terautentikasi.');
  }

  for (const item of buttons) {
    await updateSocialButton(item.id, { display_order: item.display_order });
  }

  revalidatePath('/');
  return true;
}

export async function getConfigStatus() {
  return getStatusConfig();
}

// --- BACKGROUND IMAGES ---

export async function getBgImages(deviceType: 'mobile' | 'desktop') {
  return await getBackgroundImages(deviceType);
}

export async function addBgImage(data: Omit<BackgroundImage, 'id'>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    const item = await addBackgroundImage(data);
    revalidatePath('/');
    return { success: true, data: item };
  } catch (err: any) {
    console.error('Error in addBgImage action:', err);
    return { success: false, error: err?.message || 'Gagal menambahkan gambar latar.' };
  }
}

export async function deleteBgImage(id: string, urlToDelete: string, deviceType: 'mobile' | 'desktop') {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    const bucket = deviceType === 'mobile' ? 'background' : 'background-desktop';
    await deleteFileFromStorage(bucket, urlToDelete);
    const success = await deleteBackgroundImage(id);
    revalidatePath('/');
    return { success: true, data: success };
  } catch (err: any) {
    console.error('Error in deleteBgImage action:', err);
    return { success: false, error: err?.message || 'Gagal menghapus gambar latar.' };
  }
}

export async function updateBgImage(id: string, data: Partial<BackgroundImage>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    const item = await updateBackgroundImage(id, data);
    revalidatePath('/');
    return { success: true, data: item };
  } catch (err: any) {
    console.error('Error in updateBgImage action:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui gambar latar.' };
  }
}

export async function reorderBgImages(images: { id: string; display_order: number }[]) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    for (const item of images) {
      await updateBackgroundImage(item.id, { display_order: item.display_order });
    }
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Error in reorderBgImages action:', err);
    return { success: false, error: err?.message || 'Gagal menyusun ulang urutan gambar latar.' };
  }
}

// --- MUSIC PLAYLIST ---

export async function getTracks() {
  return await getMusicTracks();
}

export async function addTrack(data: Omit<MusicTrack, 'id'>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    const item = await addMusicTrack(data);
    revalidatePath('/');
    return { success: true, data: item };
  } catch (err: any) {
    console.error('Error in addTrack action:', err);
    return { success: false, error: err?.message || 'Gagal menambahkan lagu.' };
  }
}

export async function updateTrack(id: string, data: Partial<MusicTrack>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    const item = await updateMusicTrack(id, data);
    revalidatePath('/');
    return { success: true, data: item };
  } catch (err: any) {
    console.error('Error in updateTrack action:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui lagu.' };
  }
}

export async function updateMusicTrackAction(id: string, data: Partial<MusicTrack>) {
  return await updateTrack(id, data);
}

export async function deleteTrack(id: string, urlToDelete: string) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    await deleteFileFromStorage('backsound', urlToDelete);
    const success = await deleteMusicTrack(id);
    revalidatePath('/');
    return { success: true, data: success };
  } catch (err: any) {
    console.error('Error in deleteTrack action:', err);
    return { success: false, error: err?.message || 'Gagal menghapus lagu.' };
  }
}

export async function reorderTracks(tracks: { id: string; display_order: number }[]) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    for (const item of tracks) {
      await updateMusicTrack(item.id, { display_order: item.display_order });
    }
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Error in reorderTracks action:', err);
    return { success: false, error: err?.message || 'Gagal menyusun ulang urutan lagu.' };
  }
}

// --- ANNOUNCEMENTS ---

export async function fetchAnnouncements() {
  try {
    const list = await getAnnouncements();
    return { success: true, data: list };
  } catch (err: any) {
    console.error('Error in fetchAnnouncements action:', err);
    return { success: false, error: err?.message || 'Gagal mengambil daftar pengumuman.' };
  }
}

export async function createAnnouncement(data: Omit<Announcement, 'id'>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    const item = await addAnnouncement(data);
    revalidatePath('/');
    return { success: true, data: item };
  } catch (err: any) {
    console.error('Error in createAnnouncement action:', err);
    return { success: false, error: err?.message || 'Gagal menambahkan pengumuman baru.' };
  }
}

export async function updateAnnouncementAction(id: string, data: Partial<Announcement>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    const item = await updateAnnouncement(id, data);
    revalidatePath('/');
    return { success: true, data: item };
  } catch (err: any) {
    console.error('Error in updateAnnouncementAction:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui pengumuman.' };
  }
}

export async function removeAnnouncement(id: string, photoUrl?: string, mediaUrl?: string) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };
    
    if (photoUrl) {
      try {
        await deleteFileFromStorage('pengumuman-foto', photoUrl);
      } catch (storageErr) {
        console.warn('Gagal menghapus file foto dari storage:', storageErr);
      }
    }
    if (mediaUrl) {
      try {
        await deleteFileFromStorage('pengumuman-media', mediaUrl);
      } catch (storageErr) {
        console.warn('Gagal menghapus file media dari storage:', storageErr);
      }
    }
    
    const success = await deleteAnnouncement(id);
    revalidatePath('/');
    return { success: true, data: success };
  } catch (err: any) {
    console.error('Error in removeAnnouncement action:', err);
    return { success: false, error: err?.message || 'Gagal menghapus pengumuman.' };
  }
}

// --- PUSH NOTIFICATIONS ---

export async function saveSubscription(data: PushSubscriptionData) {
  return await savePushSubscription(data);
}

export async function getSubscriptionsCount() {
  const subs = await getAllPushSubscriptions();
  return subs.length;
}

export async function sendPushNotification(payload: { title: string; message: string; icon?: string; image?: string; badge?: string }) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, message: 'Akses ditolak. Anda tidak terautentikasi.' };

    const subs = await getAllPushSubscriptions();
    if (subs.length === 0) return { success: false, message: 'Tidak ada perangkat pengunjung yang terdaftar.' };

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:example@yourdomain.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { 
        success: false, 
        message: 'VAPID keys belum dikonfigurasi di environment variable server (VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY).' 
      };
    }

    // Inisialisasi web-push details
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

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
      subs.map((sub: any) => 
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

    return { 
      success: true, 
      message: `Berhasil mengirim ke ${successCount} perangkat. Gagal: ${failCount}.`
    };
  } catch (error: any) {
    console.error('Error in sendPushNotification:', error);
    return { 
      success: false, 
      message: error?.message || 'Terjadi kesalahan sistem saat mengirim notifikasi.' 
    };
  }
}

// --- GALLERY ACTIONS ---

export async function fetchGallery() {
  try {
    const list = await getGalleryItems();
    return { success: true, data: list };
  } catch (err: any) {
    console.error('Error in fetchGallery:', err);
    return { success: false, error: err?.message || 'Gagal mengambil item galeri.' };
  }
}

export async function createGalleryMedia(data: Omit<GalleryItem, 'id'>) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };

    const item = await addGalleryItem(data);
    revalidatePath('/gallery');
    revalidatePath('/settings/galeri');
    return { success: true, data: item };
  } catch (err: any) {
    console.error('Error in createGalleryMedia:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan media ke galeri.' };
  }
}

export async function removeGalleryMedia(id: string, mediaUrl?: string) {
  try {
    const authed = await isAuthenticated();
    if (!authed) return { success: false, error: 'Akses ditolak. Anda tidak terautentikasi.' };

    if (mediaUrl) {
      try {
        await deleteFileFromStorage('gallery', mediaUrl);
      } catch (storageErr) {
        console.warn('Gagal menghapus file media galeri dari storage:', storageErr);
      }
    }

    const success = await deleteGalleryItem(id);
    revalidatePath('/gallery');
    revalidatePath('/settings/galeri');
    return { success: true, data: success };
  } catch (err: any) {
    console.error('Error in removeGalleryMedia:', err);
    return { success: false, error: err?.message || 'Gagal menghapus item dari galeri.' };
  }
}

