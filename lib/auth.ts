import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'reylan_admin_session';

function getAdminPasswordHash(): string {
  const password = (process.env.ADMIN_PASSWORD || 'admin123').trim().replace(/^['"]|['"]$/g, '');
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function loginAdmin(password: string): Promise<boolean> {
  let currentPassword = process.env.ADMIN_PASSWORD || 'admin123';
  currentPassword = currentPassword.trim().replace(/^['"]|['"]$/g, '');
  const isValid = password.trim() === currentPassword;
  if (isValid) {
    const cookieStore = await cookies();
    const sessionHash = getAdminPasswordHash();
    cookieStore.set(SESSION_COOKIE_NAME, sessionHash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // Sesi berlaku 1 minggu
      path: '/',
    });
    return true;
  }
  return false;
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) return false;
  
  const expectedHash = getAdminPasswordHash();
  return sessionToken === expectedHash;
}

