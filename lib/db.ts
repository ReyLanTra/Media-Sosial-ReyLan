import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Tipe data sesuai dengan skema SQL Supabase
export interface SiteSettings {
  id?: string;
  account_name: string;
  is_verified: boolean;
  bio: string;
  profile_photo_url: string | null;
  favicon_url: string | null;
  og_title: string;
  og_description: string;
  og_image_url: string | null;
  background_url: string | null;
  background_type: 'image' | 'gif' | 'video';
  backsound_url: string | null;
  backsound_volume: number;
  backsound_enabled: boolean;
  footer_text: string;
  admin_password_hash: string;
  created_at?: string;
  updated_at?: string;
}

export interface SocialButton {
  id: string;
  platform_name: string;
  logo_url: string;
  target_url: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Cek ketersediaan variabel lingkungan Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const isSupabaseConfigured = (): boolean => {
  return (
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes('MY_SUPABASE_URL') &&
    supabaseAnonKey.length > 0 &&
    !supabaseAnonKey.includes('MY_SUPABASE_ANON')
  );
};

// Inisialisasi klien Supabase secara malas (lazy) untuk menghindari crash saat startup
let supabaseAdminClient: SupabaseClient | null = null;
let supabasePublicClient: SupabaseClient | null = null;

const getSupabaseAdmin = (): SupabaseClient => {
  if (!supabaseAdminClient) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase tidak dikonfigurasi.');
    }
    // Gunakan service role key jika ada untuk bypass RLS pada aksi admin (server-side)
    if (!supabaseServiceKey) {
      console.warn('PERINGATAN: SUPABASE_SERVICE_ROLE_KEY atau SUPABASE_SERVICE_KEY tidak ditemukan. Mencoba menggunakan anon key (bisa gagal jika kebijakan RLS pada tabel/storage diaktifkan secara ketat).');
    }
    const key = supabaseServiceKey || supabaseAnonKey;
    supabaseAdminClient = createClient(supabaseUrl, key, {
      auth: { persistSession: false }
    });
  }
  return supabaseAdminClient;
};

const getSupabasePublic = (): SupabaseClient => {
  if (!supabasePublicClient) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase tidak dikonfigurasi.');
    }
    supabasePublicClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
  }
  return supabasePublicClient;
};

// --- LOGIKA DATABASE LOKAL (FALLBACK) ---
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Pastikan direktori lokal ada
const ensureLocalDirs = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn('Gagal membuat direktori lokal (lingkungan read-only):', error);
  }
};

// Default password hash: "admin123" -> bcrypt hash
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('admin123', 10);

const DEFAULT_SETTINGS: SiteSettings = {
  id: '00000000-0000-0000-0000-000000000000',
  account_name: 'Media Sosial ReyLan',
  is_verified: true,
  bio: 'Selamat datang di halaman profil resmi ReyLan. Hubungkan diri Anda dengan saya melalui media sosial di bawah!',
  profile_photo_url: 'https://picsum.photos/seed/reylan_profile/150/150',
  favicon_url: null,
  og_title: 'Media Sosial ReyLan',
  og_description: 'Temukan semua tautan media sosial resmi ReyLan di satu halaman profil ringkas.',
  og_image_url: 'https://picsum.photos/seed/reylan_og/1200/630',
  background_url: 'https://picsum.photos/seed/reylan_bg/1920/1080',
  background_type: 'image',
  backsound_url: null,
  backsound_volume: 50,
  backsound_enabled: true,
  footer_text: '© 2026 ReyLan. All rights reserved.',
  admin_password_hash: DEFAULT_PASSWORD_HASH,
};

const DEFAULT_BUTTONS: SocialButton[] = [
  {
    id: '1',
    platform_name: 'WhatsApp',
    logo_url: 'https://picsum.photos/seed/whatsapp/100/100',
    target_url: 'https://wa.me/6281234567890',
    display_order: 1,
    is_active: true,
  },
  {
    id: '2',
    platform_name: 'Instagram',
    logo_url: 'https://picsum.photos/seed/instagram/100/100',
    target_url: 'https://instagram.com/reylan',
    display_order: 2,
    is_active: true,
  },
  {
    id: '3',
    platform_name: 'TikTok',
    logo_url: 'https://picsum.photos/seed/tiktok/100/100',
    target_url: 'https://tiktok.com/@reylan',
    display_order: 3,
    is_active: true,
  },
];

interface LocalDbSchema {
  site_settings: SiteSettings;
  social_buttons: SocialButton[];
}

let inMemoryDb: LocalDbSchema | null = null;

const readLocalDb = (): LocalDbSchema => {
  try {
    ensureLocalDirs();
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Gagal membaca database lokal dari disk, menggunakan memori:', error);
  }

  if (!inMemoryDb) {
    inMemoryDb = {
      site_settings: DEFAULT_SETTINGS,
      social_buttons: DEFAULT_BUTTONS,
    };
  }
  return inMemoryDb;
};

const writeLocalDb = (data: LocalDbSchema) => {
  inMemoryDb = data;
  try {
    ensureLocalDirs();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Gagal menulis database lokal ke disk (lingkungan read-only):', error);
  }
};

// --- ANTARMUKA OPERASI LAYANAN (DATABASE & STORAGE) ---

export const getStatusConfig = () => {
  return {
    isSupabase: isSupabaseConfigured(),
    supabaseUrl: supabaseUrl || null,
  };
};

export const getSiteSettings = async (): Promise<SiteSettings> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabasePublic();
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Supabase get settings error (mungkin tabel belum dibuat):', error.message);
        return DEFAULT_SETTINGS;
      }
      if (data) return data as SiteSettings;

      // Jika kosong (tabel ada tapi tidak ada data), inisialisasi baris pertama menggunakan admin client
      try {
        const adminSupabase = getSupabaseAdmin();
        const { data: inserted, error: insertError } = await adminSupabase
          .from('site_settings')
          .insert([DEFAULT_SETTINGS])
          .select()
          .single();

        if (insertError) throw insertError;
        return inserted as SiteSettings;
      } catch (insertErr: any) {
        console.error('Gagal menginisialisasi settings di Supabase:', insertErr?.message);
        return DEFAULT_SETTINGS;
      }
    } catch (err: any) {
      console.error('Supabase error on get settings, returning default:', err?.message);
      return DEFAULT_SETTINGS;
    }
  } else {
    return readLocalDb().site_settings;
  }
};

export const updateSiteSettings = async (settings: Partial<SiteSettings>): Promise<SiteSettings> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      // Dapatkan baris pertama untuk diupdate
      const current = await getSiteSettings();
      const { data, error } = await supabase
        .from('site_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id)
        .select()
        .single();

      if (error) throw error;
      return data as SiteSettings;
    } catch (err) {
      console.error('Supabase error on update settings, falling back to local:', err);
      const db = readLocalDb();
      db.site_settings = { ...db.site_settings, ...settings };
      writeLocalDb(db);
      return db.site_settings;
    }
  } else {
    const db = readLocalDb();
    db.site_settings = { ...db.site_settings, ...settings };
    writeLocalDb(db);
    return db.site_settings;
  }
};

export const getSocialButtons = async (): Promise<SocialButton[]> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabasePublic();
      const { data, error } = await supabase
        .from('social_buttons')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        // Jika tabel belum dibuat atau ada error, kembalikan array kosong sesuai keinginan pengguna
        console.warn('Supabase get buttons error (mungkin tabel belum dibuat):', error.message);
        return [];
      }
      return (data as SocialButton[]) || [];
    } catch (err: any) {
      console.error('Supabase error on get buttons, returning empty array:', err?.message);
      return [];
    }
  } else {
    return readLocalDb().social_buttons.sort((a, b) => a.display_order - b.display_order);
  }
};

export const addSocialButton = async (button: Omit<SocialButton, 'id'>): Promise<SocialButton> => {
  const newId = crypto.randomUUID();
  const newBtn: SocialButton = {
    ...button,
    id: newId,
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('social_buttons')
        .insert([newBtn])
        .select()
        .single();

      if (error) throw error;
      return data as SocialButton;
    } catch (err) {
      console.error('Supabase error on add button, falling back to local:', err);
      const db = readLocalDb();
      db.social_buttons.push(newBtn);
      writeLocalDb(db);
      return newBtn;
    }
  } else {
    const db = readLocalDb();
    db.social_buttons.push(newBtn);
    writeLocalDb(db);
    return newBtn;
  }
};

export const updateSocialButton = async (id: string, button: Partial<SocialButton>): Promise<SocialButton> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from('social_buttons')
        .update({
          ...button,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SocialButton;
    } catch (err) {
      console.error('Supabase error on update button, falling back to local:', err);
      const db = readLocalDb();
      const index = db.social_buttons.findIndex((b) => b.id === id);
      if (index !== -1) {
        db.social_buttons[index] = { ...db.social_buttons[index], ...button };
        writeLocalDb(db);
        return db.social_buttons[index];
      }
      throw new Error('Tombol tidak ditemukan.');
    }
  } else {
    const db = readLocalDb();
    const index = db.social_buttons.findIndex((b) => b.id === id);
    if (index !== -1) {
      db.social_buttons[index] = { ...db.social_buttons[index], ...button };
      writeLocalDb(db);
      return db.social_buttons[index];
    }
    throw new Error('Tombol tidak ditemukan.');
  }
};

export const deleteSocialButton = async (id: string): Promise<boolean> => {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase
        .from('social_buttons')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Supabase error on delete button, falling back to local:', err);
      const db = readLocalDb();
      const filtered = db.social_buttons.filter((b) => b.id !== id);
      if (filtered.length !== db.social_buttons.length) {
        db.social_buttons = filtered;
        writeLocalDb(db);
        return true;
      }
      return false;
    }
  } else {
    const db = readLocalDb();
    const filtered = db.social_buttons.filter((b) => b.id !== id);
    if (filtered.length !== db.social_buttons.length) {
      db.social_buttons = filtered;
      writeLocalDb(db);
      return true;
    }
    return false;
  }
};

// --- LOGIKA STORAGE (UNGGAH & HAPUS FILE) ---

// Menentukan ekstensi asli file
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
};

// Fungsi menghapus file lama dari storage (lokal atau Supabase)
export const deleteFileFromStorage = async (bucketName: string, fileUrl: string | null): Promise<boolean> => {
  if (!fileUrl) return false;

  if (isSupabaseConfigured()) {
    try {
      // Dapatkan path relatif dari URL publik Supabase
      // Contoh URL: https://xyz.supabase.co/storage/v1/object/public/bucketName/fileName.png
      const supabase = getSupabaseAdmin();
      const matchPattern = `/storage/v1/object/public/${bucketName}/`;
      const index = fileUrl.indexOf(matchPattern);
      if (index !== -1) {
        const filePath = fileUrl.substring(index + matchPattern.length);
        const { error } = await supabase.storage.from(bucketName).remove([filePath]);
        if (error) throw error;
        return true;
      }
      return false;
    } catch (err) {
      console.error(`Gagal menghapus file lama dari bucket Supabase "${bucketName}":`, err);
      return false;
    }
  } else {
    // Lokal fallback
    try {
      const matchPattern = `/uploads/`;
      const index = fileUrl.indexOf(matchPattern);
      if (index !== -1) {
        const fileName = fileUrl.substring(index + matchPattern.length);
        const fullPath = path.join(UPLOADS_DIR, fileName);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error(`Gagal menghapus file lokal lama:`, err);
      return false;
    }
  }
};

// Fungsi pembantu menebak tipe MIME berdasarkan ekstensi file
const getMimeType = (ext: string): string => {
  const mimeTypes: { [key: string]: string } = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
};

// Fungsi mengunggah file ke storage (lokal atau Supabase)
export const uploadFileToStorage = async (
  bucketName: string,
  fileBase64: string, // format data:image/png;base64,xxxx atau biner terenkripsi
  originalName: string,
  customId?: string
): Promise<string> => {
  ensureLocalDirs();

  // Bersihkan data URL base64 jika ada
  const matches = fileBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  let buffer: Buffer;
  let ext = getFileExtension(originalName);

  if (matches && matches.length === 3) {
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    // Jika dikirim plain base64 tanpa prefix
    buffer = Buffer.from(fileBase64, 'base64');
  }

  // Tentukan nama file yang diunggah sesuai aturan spesifik dari bucket
  // Bucket "foto-profil" disimpan dengan nama "foto-profil.{ext}"
  // Bucket "favicon" disimpan dengan nama "favicon.{ext}"
  // Bucket "background" disimpan dengan nama "background.{ext}"
  // Bucket "backsound" disimpan dengan nama "backsound.{ext}"
  // Bucket "og-image" disimpan dengan nama "og-image.{ext}"
  // Bucket "logo-medsos" disimpan dengan nama "logo-medsos-{id}.{ext}"
  let fileName = '';
  if (bucketName === 'foto-profil') {
    fileName = `foto-profil${ext}`;
  } else if (bucketName === 'favicon') {
    fileName = `favicon${ext}`;
  } else if (bucketName === 'background') {
    fileName = `background${ext}`;
  } else if (bucketName === 'backsound') {
    fileName = `backsound${ext}`;
  } else if (bucketName === 'og-image') {
    fileName = `og-image${ext}`;
  } else if (bucketName === 'logo-medsos') {
    const id = customId || crypto.randomUUID();
    fileName = `logo-medsos-${id}${ext}`;
  } else {
    fileName = `${bucketName}-${Date.now()}${ext}`;
  }

  let supabaseUploadError: any = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();

      // Coba buat bucket jika belum ada di Supabase
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === bucketName);
        if (!exists) {
          await supabase.storage.createBucket(bucketName, { public: true });
        }
      } catch (bucketErr) {
        console.warn(`Gagal memeriksa/membuat bucket "${bucketName}":`, bucketErr);
      }
      
      // Hapus file lama di bucket ini jika ada, agar tidak menumpuk
      // Khusus untuk bucket non-logo-medsos yang filenya tunggal, atau jika kita tahu URL lamanya.
      try {
        const { data: list } = await supabase.storage.from(bucketName).list();
        if (list && list.length > 0) {
          // Jika ini bukan logo-medsos atau nama file sama, hapus file dengan nama persis atau semua file di bucket tunggal
          if (bucketName !== 'logo-medsos') {
            const filesToRemove = list.map(f => f.name);
            await supabase.storage.from(bucketName).remove(filesToRemove);
          } else if (customId) {
            // Untuk logo-medsos, hapus logo dengan ID tombol yang sama jika ada sebelumnya
            const targetPrefix = `logo-medsos-${customId}`;
            const filesToRemove = list.filter(f => f.name.startsWith(targetPrefix)).map(f => f.name);
            if (filesToRemove.length > 0) {
              await supabase.storage.from(bucketName).remove(filesToRemove);
            }
          }
        }
      } catch (err) {
        console.warn('Error clearing old storage files:', err);
      }

      const contentType = (matches && matches[1]) ? matches[1] : getMimeType(ext);

      // Unggah file baru ke Supabase
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: contentType,
          upsert: true,
        });

      if (error) throw error;

      // Dapatkan URL publik file
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error(`Gagal unggah file ke Supabase Storage "${bucketName}":`, err);
      supabaseUploadError = err;
      // Lanjutkan ke fallback lokal jika Supabase gagal
    }
  }

  // --- FALLBACK LOKAL ---
  // Hapus file lama di folder lokal sesuai skema yang sama
  try {
    if (bucketName !== 'logo-medsos') {
      const files = fs.readdirSync(UPLOADS_DIR);
      const oldFiles = files.filter(f => f.startsWith(bucketName));
      for (const file of oldFiles) {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      }
    } else if (customId) {
      const files = fs.readdirSync(UPLOADS_DIR);
      const targetPrefix = `logo-medsos-${customId}`;
      const oldFiles = files.filter(f => f.startsWith(targetPrefix));
      for (const file of oldFiles) {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      }
    }
  } catch (err) {
    console.warn('Error clearing old local files:', err);
  }

  // Tulis file lokal
  try {
    const localFilePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(localFilePath, buffer);
    // Kembalikan URL publik lokal yang bisa diakses
    return `/uploads/${fileName}`;
  } catch (err) {
    console.error('Gagal menulis file lokal:', err);
    // Jika gagal menulis ke disk lokal (karena lingkungan read-only di server produksi)
    // dan sebelumnya Supabase gagal, kita harus melempar error deskriptif yang jelas ke klien.
    if (isSupabaseConfigured()) {
      const detailMsg = supabaseUploadError?.message || 'Access Denied.';
      throw new Error(
        `Gagal mengunggah file ke Supabase Storage (bucket: "${bucketName}"). ` +
        `Detail: "${detailMsg}". Pastikan Anda telah mengonfigurasi variabel lingkungan SUPABASE_SERVICE_ROLE_KEY ` +
        `di Settings Dashboard atau file .env Anda agar unggahan file melewati (bypass) kebijakan keamanan RLS.`
      );
    } else {
      throw new Error(
        `Gagal menyimpan file secara lokal karena direktori penyimpanan bersifat Read-Only (hanya-baca) dan Supabase belum terkonfigurasi.`
      );
    }
  }
};
