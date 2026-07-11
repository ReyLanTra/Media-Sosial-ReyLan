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
  SiteSettings,
  SocialButton,
  BackgroundImage,
  MusicTrack,
  getStatusConfig,
} from '@/lib/db';
import { loginAdmin, logoutAdmin, isAuthenticated } from '@/lib/auth';

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
  const authed = await isAuthenticated();
  if (!authed) {
    throw new Error('Akses ditolak. Anda tidak terautentikasi.');
  }

  // Jika admin mengunggah URL profil baru dan URL lama ada,
  // kita bisa menghapusnya, namun kita serahkan ke handleUpload untuk efisiensi.
  const updated = await updateSiteSettings(data);
  revalidatePath('/');
  return updated;
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
  const authed = await isAuthenticated();
  if (!authed) throw new Error('Akses ditolak.');
  const item = await addBackgroundImage(data);
  revalidatePath('/');
  return item;
}

export async function deleteBgImage(id: string, urlToDelete: string, deviceType: 'mobile' | 'desktop') {
  const authed = await isAuthenticated();
  if (!authed) throw new Error('Akses ditolak.');
  const bucket = deviceType === 'mobile' ? 'background' : 'background-desktop';
  await deleteFileFromStorage(bucket, urlToDelete);
  const success = await deleteBackgroundImage(id);
  revalidatePath('/');
  return success;
}

// --- MUSIC PLAYLIST ---

export async function getTracks() {
  return await getMusicTracks();
}

export async function addTrack(data: Omit<MusicTrack, 'id'>) {
  const authed = await isAuthenticated();
  if (!authed) throw new Error('Akses ditolak.');
  const item = await addMusicTrack(data);
  revalidatePath('/');
  return item;
}

export async function updateTrack(id: string, data: Partial<MusicTrack>) {
  const authed = await isAuthenticated();
  if (!authed) throw new Error('Akses ditolak.');
  const item = await updateMusicTrack(id, data);
  revalidatePath('/');
  return item;
}

export async function deleteTrack(id: string, urlToDelete: string) {
  const authed = await isAuthenticated();
  if (!authed) throw new Error('Akses ditolak.');
  await deleteFileFromStorage('backsound', urlToDelete);
  const success = await deleteMusicTrack(id);
  revalidatePath('/');
  return success;
}

export async function reorderTracks(tracks: { id: string; display_order: number }[]) {
  const authed = await isAuthenticated();
  if (!authed) throw new Error('Akses ditolak.');
  for (const item of tracks) {
    await updateMusicTrack(item.id, { display_order: item.display_order });
  }
  revalidatePath('/');
  return true;
}
