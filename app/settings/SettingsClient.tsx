'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  LogOut,
  User,
  Share2,
  Sliders,
  Shield,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Upload,
  Link as LinkIcon,
  Music,
  Video,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Eye,
  Info,
  ExternalLink,
} from 'lucide-react';
import { SiteSettings, SocialButton } from '@/lib/db';
import {
  login,
  logout,
  updateSettings,
  addBtn,
  updateBtn,
  deleteBtn,
  reorderButtons,
  uploadMedia,
  changeAdminPassword,
  getConfigStatus,
} from '@/app/actions';
import VerificationBadge from '@/components/VerificationBadge';

interface SettingsClientProps {
  initialSettings: SiteSettings;
  initialButtons: SocialButton[];
  isAuthenticated: boolean;
}

export default function SettingsClient({
  initialSettings,
  initialButtons,
  isAuthenticated: initialAuth,
}: SettingsClientProps) {
  // Autentikasi State
  const [authed, setAuthed] = React.useState(initialAuth);
  const [passwordInput, setPasswordInput] = React.useState('');
  const [authError, setAuthError] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);

  // Status Koneksi Database
  const [dbStatus, setDbStatus] = React.useState<{ isSupabase: boolean; supabaseUrl: string | null } | null>(null);

  // Data State
  const [settings, setSettings] = React.useState<SiteSettings>(initialSettings);
  const [buttons, setButtons] = React.useState<SocialButton[]>(initialButtons);

  // Tab Menu State
  const [activeTab, setActiveTab] = React.useState<'profile' | 'buttons' | 'media' | 'seo' | 'security'>('profile');

  // Notifikasi Aksi State
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingState, setLoadingState] = React.useState<string | null>(null);

  // Form Edit Tombol State
  const [editingBtn, setEditingBtn] = React.useState<Partial<SocialButton> | null>(null);
  const [btnPlatform, setBtnPlatform] = React.useState('');
  const [btnLogoMode, setBtnLogoMode] = React.useState<'url' | 'upload'>('url');
  const [btnLogoUrl, setBtnLogoUrl] = React.useState('');
  const [btnLogoFile, setBtnLogoFile] = React.useState<string | null>(null);
  const [btnLogoFileName, setBtnLogoFileName] = React.useState('');
  const [btnTargetUrl, setBtnTargetUrl] = React.useState('');
  const [btnActive, setBtnActive] = React.useState(true);

  // Keamanan State
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  // Auto-hide notifikasi
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Muat status konfigurasi db saat mount
  React.useEffect(() => {
    getConfigStatus().then(setDbStatus).catch(console.error);
  }, []);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  // --- HANDLER LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await login(passwordInput);
      if (res.success) {
        setAuthed(true);
        showNotify('success', 'Selamat datang kembali, Admin!');
        // Refresh data setelah login
        window.location.reload();
      } else {
        setAuthError(res.message);
      }
    } catch (err) {
      setAuthError('Terjadi kesalahan koneksi.');
    } finally {
      setAuthLoading(false);
    }
  };

  // --- HANDLER LOGOUT ---
  const handleLogout = async () => {
    await logout();
    setAuthed(false);
    setPasswordInput('');
    showNotify('success', 'Anda telah keluar dari sesi admin.');
    window.location.reload();
  };

  // --- UTILIY UNTUK BROWSER FILE TO BASE64 ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // --- HANDLER UNGGAH MEDIA LANGSUNG ---
  const handleMediaUpload = async (
    bucketName: string,
    file: File,
    onSuccess: (url: string) => void,
    customId?: string
  ) => {
    setLoadingState(`Mengunggah file ke bucket ${bucketName}...`);
    try {
      const base64 = await fileToBase64(file);
      const url = await uploadMedia(bucketName, base64, file.name, customId);
      onSuccess(url);
      showNotify('success', `File berhasil diunggah ke ${bucketName}!`);
    } catch (err: any) {
      console.error(err);
      showNotify('error', err?.message || 'Gagal mengunggah file.');
    } finally {
      setLoadingState(null);
    }
  };

  // --- HANDLER UPDATE SITE SETTINGS ---
  const handleUpdateSettings = async (updates: Partial<SiteSettings>) => {
    setLoadingState('Menyimpan pengaturan...');
    try {
      const updated = await updateSettings(updates);
      setSettings(updated);
      showNotify('success', 'Pengaturan berhasil diperbarui!');
    } catch (err: any) {
      showNotify('error', err?.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setLoadingState(null);
    }
  };

  // --- HANDLER KELOLA TOMBOL MEDSOS ---
  const resetBtnForm = () => {
    setEditingBtn(null);
    setBtnPlatform('');
    setBtnLogoMode('url');
    setBtnLogoUrl('');
    setBtnLogoFile(null);
    setBtnLogoFileName('');
    setBtnTargetUrl('');
    setBtnActive(true);
  };

  const startEditBtn = (btn: SocialButton) => {
    setEditingBtn(btn);
    setBtnPlatform(btn.platform_name);
    setBtnLogoMode('url');
    setBtnLogoUrl(btn.logo_url);
    setBtnTargetUrl(btn.target_url);
    setBtnActive(btn.is_active);
  };

  const handleSaveButton = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!btnPlatform || !btnTargetUrl) {
      showNotify('error', 'Platform dan URL Tujuan wajib diisi.');
      return;
    }

    setLoadingState('Menyimpan tombol media sosial...');
    try {
      let finalLogoUrl = btnLogoUrl;

      // Jika menggunakan file upload kustom
      if (btnLogoMode === 'upload' && btnLogoFile) {
        // Tentukan ID tombol (buat baru jika tambah, pakai yang ada jika edit)
        const customId = editingBtn?.id || crypto.randomUUID();
        finalLogoUrl = await uploadMedia('logo-medsos', btnLogoFile, btnLogoFileName, customId);
      }

      if (!finalLogoUrl) {
        showNotify('error', 'Logo media sosial (URL atau Upload) wajib ditentukan.');
        setLoadingState(null);
        return;
      }

      if (editingBtn && editingBtn.id) {
        // Edit tombol yang ada
        const updated = await updateBtn(editingBtn.id, {
          platform_name: btnPlatform,
          logo_url: finalLogoUrl,
          target_url: btnTargetUrl,
          is_active: btnActive,
        });
        setButtons((prev) => prev.map((b) => (b.id === editingBtn.id ? updated : b)));
        showNotify('success', `Tombol ${btnPlatform} berhasil diperbarui!`);
      } else {
        // Tambah tombol baru
        const maxOrder = buttons.reduce((max, b) => (b.display_order > max ? b.display_order : max), 0);
        const added = await addBtn({
          platform_name: btnPlatform,
          logo_url: finalLogoUrl,
          target_url: btnTargetUrl,
          display_order: maxOrder + 1,
          is_active: btnActive,
        });
        setButtons((prev) => [...prev, added]);
        showNotify('success', `Tombol ${btnPlatform} berhasil ditambahkan!`);
      }
      resetBtnForm();
    } catch (err: any) {
      showNotify('error', err?.message || 'Gagal menyimpan tombol.');
    } finally {
      setLoadingState(null);
    }
  };

  const handleDeleteButton = async (id: string, logoUrl: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus tombol "${name}"?`)) return;

    setLoadingState('Menghapus tombol...');
    try {
      await deleteBtn(id, logoUrl);
      setButtons((prev) => prev.filter((b) => b.id !== id));
      showNotify('success', `Tombol ${name} berhasil dihapus!`);
    } catch (err: any) {
      showNotify('error', err?.message || 'Gagal menghapus tombol.');
    } finally {
      setLoadingState(null);
    }
  };

  const handleMoveButton = async (index: number, direction: 'up' | 'down') => {
    const newButtons = [...buttons].sort((a, b) => a.display_order - b.display_order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newButtons.length) return;

    // Tukar display_order
    const temp = newButtons[index].display_order;
    newButtons[index].display_order = newButtons[targetIndex].display_order;
    newButtons[targetIndex].display_order = temp;

    // Urutkan ulang state lokal secara instan untuk UI yang responsif
    setButtons(newButtons.sort((a, b) => a.display_order - b.display_order));

    setLoadingState('Memperbarui urutan...');
    try {
      await reorderButtons(
        newButtons.map((b) => ({
          id: b.id,
          display_order: b.display_order,
        }))
      );
      showNotify('success', 'Urutan tombol berhasil diperbarui!');
    } catch (err: any) {
      showNotify('error', err?.message || 'Gagal menyimpan urutan baru.');
    } finally {
      setLoadingState(null);
    }
  };

  // --- HANDLER GANTI PASSWORD ADMIN ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showNotify('error', 'Harap isi semua kolom password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotify('error', 'Konfirmasi password baru tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      showNotify('error', 'Password baru minimal harus 6 karakter.');
      return;
    }

    setLoadingState('Mengubah password...');
    try {
      const res = await changeAdminPassword(oldPassword, newPassword);
      if (res.success) {
        showNotify('success', res.message);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showNotify('error', res.message);
      }
    } catch (err: any) {
      showNotify('error', err?.message || 'Gagal mengubah password.');
    } finally {
      setLoadingState(null);
    }
  };

  // RENDER LAYAR LOGIN (JIKA BELUM LOGIN)
  if (!authed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-radial from-slate-950 via-slate-900 to-black overflow-y-auto">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-sm p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl space-y-6 text-center"
        >
          <div className="space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight text-white">
              Sesi Admin Terkunci
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Masukkan password admin untuk mengakses konfigurasi dinamis Media Sosial ReyLan.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                PASSWORD AKSES
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-900/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {authLoading ? 'Memverifikasi...' : 'Buka Pengaturan'}
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-slate-500">
            <p>Password bawaan: <span className="text-blue-400 font-semibold">admin123</span></p>
            <p className="mt-1">Silakan langsung diubah di menu Keamanan demi keselamatan.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // RENDER UTAMA PANEL PENGATURAN (ADMIN DASHBOARD)
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-slate-900/40 backdrop-blur-md flex flex-col justify-between shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2.5 pb-5 border-b border-white/10 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              RL
            </div>
            <div>
              <h2 className="font-display font-bold text-sm leading-tight text-white">ReyLan Admin</h2>
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-wider">Dashboard V1.0</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profil & Konten</span>
            </button>
            <button
              onClick={() => setActiveTab('buttons')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'buttons'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>Tombol Medsos</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'media'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Latar & Musik</span>
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'seo'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>Optimasi SEO (OG)</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === 'security'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Keamanan</span>
            </button>
          </nav>
        </div>

        {/* LOGOUT & BOTTOM NOTICE */}
        <div className="p-6 border-t border-white/5 bg-black/20 space-y-4">
          {dbStatus && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] space-y-1 font-mono text-slate-500">
              <span className="font-semibold block text-slate-400 uppercase tracking-wider text-[9px]">Status Database:</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.isSupabase ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <span>{dbStatus.isSupabase ? 'Koneksi Supabase' : 'Database Lokal'}</span>
              </div>
              {!dbStatus.isSupabase && (
                <p className="text-[9px] text-amber-500/80 leading-normal mt-1">
                  Supabase belum disinkronisasi. Data Anda disimpan aman di database lokal.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold"
            >
              <span>Lihat Live</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs transition-all duration-300"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 max-w-4xl overflow-y-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Pengaturan Situs
              <span className="text-xs font-mono font-normal text-slate-500 py-1 px-2.5 rounded-full bg-white/5 border border-white/10">
                {activeTab === 'profile' && 'Profil & Konten'}
                {activeTab === 'buttons' && 'Tombol Media Sosial'}
                {activeTab === 'media' && 'Latar & Musik'}
                {activeTab === 'seo' && 'Optimasi SEO'}
                {activeTab === 'security' && 'Keamanan Password'}
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Kelola seluruh data bio link Anda secara dinamis tanpa perlu mengubah kode.
            </p>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xl ${
                notification.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-semibold">{notification.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LOADING OVERLAY SCREEN */}
        {loadingState && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/90 text-center space-y-4 max-w-sm">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-mono text-slate-300">{loadingState}</p>
            </div>
          </div>
        )}

        {/* TAB PANELS */}
        <div className="space-y-6">
          
          {/* TAB 1: PROFIL & KONTEN */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
              
              {/* Box Foto Profil & Favicon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Profil Photo */}
                <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-semibold text-sm text-slate-300">Foto Profil Utama</h3>
                    <User className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-slate-950 flex-shrink-0">
                      {settings.profile_photo_url ? (
                        <img
                          src={settings.profile_photo_url}
                          alt="Profil"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                          Kosong
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">Unggah foto baru atau masukkan URL</p>
                      <p>Format gambar: PNG, JPG, WEBP.</p>
                      <p>Rasio persegi 1:1 direkomendasikan.</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                        URL FOTO LANGSUNG
                      </label>
                      <input
                        type="url"
                        value={settings.profile_photo_url || ''}
                        onChange={(e) => setSettings({ ...settings, profile_photo_url: e.target.value })}
                        placeholder="https://example.com/foto.jpg"
                        className="w-full px-3 py-2 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500/40"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                        ATAU UNGGAH FILE KUSTOM
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleMediaUpload('foto-profil', file, (url) => {
                              setSettings((prev) => ({ ...prev, profile_photo_url: url }));
                              handleUpdateSettings({ profile_photo_url: url });
                            });
                          }
                        }}
                        className="hidden"
                        id="upload-profile"
                      />
                      <label
                        htmlFor="upload-profile"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Pilih Gambar dari Perangkat</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Favicon */}
                <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="font-semibold text-sm text-slate-300">Favicon Website (.ico/.png)</h3>
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl border border-white/20 bg-slate-950 flex items-center justify-center flex-shrink-0">
                      {settings.favicon_url ? (
                        <img
                          src={settings.favicon_url}
                          alt="Favicon"
                          className="w-8 h-8 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">Default</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">Favicon adalah ikon tab browser</p>
                      <p>Format yang disarankan: .ico atau .png.</p>
                      <p>Ukuran standar: 32x32px.</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                        URL FAVICON LANGSUNG
                      </label>
                      <input
                        type="url"
                        value={settings.favicon_url || ''}
                        onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                        placeholder="https://example.com/favicon.png"
                        className="w-full px-3 py-2 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500/40"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                        ATAU UNGGAH FAVICON
                      </label>
                      <input
                        type="file"
                        accept="image/png, image/x-icon, image/vnd.microsoft.icon"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleMediaUpload('favicon', file, (url) => {
                              setSettings((prev) => ({ ...prev, favicon_url: url }));
                              handleUpdateSettings({ favicon_url: url });
                            });
                          }
                        }}
                        className="hidden"
                        id="upload-favicon"
                      />
                      <label
                        htmlFor="upload-favicon"
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Pilih Favicon (.png / .ico)</span>
                      </label>
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Nama Akun, Centang Verifikasi, Bio, Footer */}
              <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
                <h3 className="font-semibold text-sm text-slate-300 border-b border-white/5 pb-3">
                  Informasi Profil & Teks Konten
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Nama Akun */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      NAMA AKUN UTAMA
                    </label>
                    <input
                      type="text"
                      value={settings.account_name}
                      onChange={(e) => setSettings({ ...settings, account_name: e.target.value })}
                      placeholder="Masukkan nama profil..."
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/40"
                    />
                  </div>

                  {/* Centang Verifikasi */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      BADGE CENTANG BIRU
                    </label>
                    <div className="flex items-center h-12 px-4 rounded-xl border border-white/10 bg-neutral-950">
                      <label className="flex items-center gap-3 cursor-pointer w-full justify-between">
                        <div className="flex items-center gap-2">
                          <VerificationBadge className="w-5 h-5" />
                          <span className="text-xs font-semibold text-slate-300">Aktifkan Badge</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.is_verified}
                          onChange={(e) => setSettings({ ...settings, is_verified: e.target.checked })}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Deskripsi Bio */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    DESKRIPSI BIO / TAGLINE
                  </label>
                  <textarea
                    rows={4}
                    value={settings.bio}
                    onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
                    placeholder="Tulis bio singkat profil Anda di sini..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/40 resize-none leading-relaxed"
                  />
                </div>

                {/* Teks Footer */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    TEKS FOOTER / COPYRIGHT
                  </label>
                  <input
                    type="text"
                    value={settings.footer_text}
                    onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                    placeholder="© 2026 Media Sosial ReyLan. All rights reserved."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/40"
                  />
                </div>

                {/* Tombol Simpan Tab 1 */}
                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      handleUpdateSettings({
                        account_name: settings.account_name,
                        is_verified: settings.is_verified,
                        bio: settings.bio,
                        profile_photo_url: settings.profile_photo_url,
                        favicon_url: settings.favicon_url,
                        footer_text: settings.footer_text,
                      });
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-300 shadow-lg shadow-blue-600/15"
                  >
                    Simpan Semua Perubahan Profil
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TOMBOL MEDIA SOSIAL */}
          {activeTab === 'buttons' && (
            <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
              
              {/* Form Input Tambah / Edit Tombol */}
              <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-semibold text-sm text-slate-300">
                    {editingBtn ? `Ubah Tombol: ${btnPlatform}` : 'Tambah Tombol Media Sosial Baru'}
                  </h3>
                  {editingBtn && (
                    <button
                      onClick={resetBtnForm}
                      className="px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-slate-400 hover:text-white"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                <form onSubmit={handleSaveButton} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Nama Platform */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        NAMA PLATFORM MEDIA SOSIAL
                      </label>
                      <input
                        type="text"
                        required
                        value={btnPlatform}
                        onChange={(e) => setBtnPlatform(e.target.value)}
                        placeholder="WhatsApp, Instagram, TikTok, dll."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500/40"
                      />
                    </div>

                    {/* URL Link Tujuan */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        LINK / URL TUJUAN TOMBOL
                      </label>
                      <input
                        type="url"
                        required
                        value={btnTargetUrl}
                        onChange={(e) => setBtnTargetUrl(e.target.value)}
                        placeholder="https://wa.me/... atau https://instagram.com/..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500/40"
                      />
                    </div>
                  </div>

                  {/* Logo Media Sosial PNG */}
                  <div className="space-y-3.5 p-4 rounded-xl border border-white/5 bg-black/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        METODE LOGO PLATFORM (WAJIB FILE GAMBAR/PNG/JPG)
                      </span>
                      
                      <div className="flex rounded-lg border border-white/10 overflow-hidden bg-neutral-950 p-0.5">
                        <button
                          type="button"
                          onClick={() => setBtnLogoMode('url')}
                          className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${
                            btnLogoMode === 'url' ? 'bg-blue-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          INPUT URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setBtnLogoMode('upload')}
                          className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${
                            btnLogoMode === 'upload' ? 'bg-blue-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          UPLOAD PNG
                        </button>
                      </div>
                    </div>

                    {btnLogoMode === 'url' ? (
                      <div>
                        <input
                          type="url"
                          value={btnLogoUrl}
                          onChange={(e) => setBtnLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo-whatsapp.png"
                          className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500/40"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setBtnLogoFileName(file.name);
                              const b64 = await fileToBase64(file);
                              setBtnLogoFile(b64);
                            }
                          }}
                          className="hidden"
                          id="btn-logo-upload"
                        />
                        <label
                          htmlFor="btn-logo-upload"
                          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                        >
                          <Upload className="w-4 h-4" />
                          <span>
                            {btnLogoFileName ? `Logo Terpilih: ${btnLogoFileName}` : 'Pilih Logo PNG/JPG'}
                          </span>
                        </label>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500">
                      *Sesuai ketentuan, dilarang menggunakan library ikon (Lucide/FA). Logo harus berupa file gambar asli.
                    </p>
                  </div>

                  {/* Pengaturan Tambahan */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={btnActive}
                        onChange={(e) => setBtnActive(e.target.checked)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <span>Tampilkan tombol ini di profil (Aktif)</span>
                    </label>
                  </div>

                  {/* Submit Form */}
                  <div className="flex justify-end pt-3 border-t border-white/5">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-300 shadow-lg shadow-blue-600/15"
                    >
                      {editingBtn ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Simpan Perubahan Tombol</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Tambah Tombol Baru</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Daftar Tombol yang Ada (Urutkan, Edit, Hapus) */}
              <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4">
                <h3 className="font-semibold text-sm text-slate-300 border-b border-white/5 pb-3">
                  Kelola Urutan & Tampilan Tombol ({buttons.length} Terdaftar)
                </h3>

                {buttons.length > 0 ? (
                  <div className="space-y-3.5">
                    {buttons
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((btn, index) => (
                        <div
                          key={btn.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-slate-950/40 hover:bg-slate-950/80 transition-all ${
                            !btn.is_active ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Logo */}
                            <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-white/10 p-0.5 overflow-hidden shrink-0">
                              <img
                                src={btn.logo_url}
                                alt={btn.platform_name}
                                className="w-full h-full object-cover rounded-md"
                              />
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-white">{btn.platform_name}</span>
                                {!btn.is_active && (
                                  <span className="text-[9px] font-mono bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">
                                    Nonaktif
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 max-w-[150px] sm:max-w-xs block overflow-hidden text-ellipsis whitespace-nowrap">
                                {btn.target_url}
                              </span>
                            </div>
                          </div>

                          {/* Aksi & Urutan */}
                          <div className="flex items-center gap-1.5">
                            {/* Move Up */}
                            <button
                              disabled={index === 0}
                              onClick={() => handleMoveButton(index, 'up')}
                              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20"
                              title="Pindahkan ke atas"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Move Down */}
                            <button
                              disabled={index === buttons.length - 1}
                              onClick={() => handleMoveButton(index, 'down')}
                              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20"
                              title="Pindahkan ke bawah"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => startEditBtn(btn)}
                              className="p-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                              title="Ubah Tombol"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteButton(btn.id, btn.logo_url, btn.platform_name)}
                              className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              title="Hapus Tombol"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed border-white/10 rounded-xl text-slate-500 text-xs">
                    Belum ada tombol media sosial yang dibuat. Silakan tambahkan pada form di atas.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: LATAR & MUSIK */}
          {activeTab === 'media' && (
            <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
              
              {/* 1. Pengaturan Latar Belakang (Background) */}
              <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-semibold text-sm text-slate-300">Konfigurasi Latar Belakang Website</h3>
                  <Video className="w-4 h-4 text-slate-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Pilihan Format Tipe */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      TIPE FORMAT LATAR
                    </label>
                    <select
                      value={settings.background_type}
                      onChange={(e) => setSettings({ ...settings, background_type: e.target.value as any })}
                      className="w-full h-11 px-3 py-1.5 rounded-xl border border-white/10 bg-neutral-950 text-white text-xs focus:outline-none"
                    >
                      <option value="image">Gambar Statis (PNG/JPG)</option>
                      <option value="gif">GIF Animasi</option>
                      <option value="video">Video MP4 (Autoplay Muted Loop)</option>
                    </select>
                  </div>

                  {/* URL Input */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      URL FILE LATAR BELAKANG
                    </label>
                    <input
                      type="url"
                      value={settings.background_url || ''}
                      onChange={(e) => setSettings({ ...settings, background_url: e.target.value })}
                      placeholder="https://example.com/background.mp4"
                      className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload Latar Belakang */}
                <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    ATAU UNGGAH FILE LATAR BELAKANG KUSTOM (BUKET &quot;BACKGROUND&quot;)
                  </label>
                  <input
                    type="file"
                    accept="image/*, video/mp4"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleMediaUpload('background', file, (url) => {
                          setSettings((prev) => ({ ...prev, background_url: url }));
                          handleUpdateSettings({ background_url: url });
                        });
                      }
                    }}
                    className="hidden"
                    id="upload-bg-media"
                  />
                  <label
                    htmlFor="upload-bg-media"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Unggah Gambar / GIF / Video MP4</span>
                  </label>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    *Jika mengunggah MP4 kustom, video akan ter-render di lapisan paling belakang secara penuh tanpa suara, loop otomatis, dan bebas kontrol sesuai standard.
                  </p>
                </div>

                {/* Submit Background Settings */}
                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      handleUpdateSettings({
                        background_type: settings.background_type,
                        background_url: settings.background_url,
                      });
                    }}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-300 shadow-lg"
                  >
                    Terapkan Latar Belakang
                  </button>
                </div>
              </div>

              {/* 2. Pengaturan Audio Musik Latar (Backsound MP3) */}
              <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="font-semibold text-sm text-slate-300">Konfigurasi Musik Latar Belakang (MP3)</h3>
                  <Music className="w-4 h-4 text-slate-500" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* URL Musik Latar */}
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      URL FILE MUSIK (MP3)
                    </label>
                    <input
                      type="url"
                      value={settings.backsound_url || ''}
                      onChange={(e) => setSettings({ ...settings, backsound_url: e.target.value })}
                      placeholder="https://example.com/backsound.mp3"
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/40"
                    />
                  </div>

                  {/* Toggle Aktif Backsound */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      STATUS BACKSOUND GLOBAL
                    </label>
                    <div className="flex items-center h-12 px-4 rounded-xl border border-white/10 bg-neutral-950">
                      <label className="flex items-center gap-3 cursor-pointer w-full justify-between">
                        <span className="text-xs font-semibold text-slate-300">Aktifkan Musik</span>
                        <input
                          type="checkbox"
                          checked={settings.backsound_enabled}
                          onChange={(e) => setSettings({ ...settings, backsound_enabled: e.target.checked })}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Pengaturan Volume Slider */}
                <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
                  <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                    <span>VOLUME MUSIK BAWAAN</span>
                    <span className="font-mono text-blue-400">{settings.backsound_volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.backsound_volume}
                    onChange={(e) => setSettings({ ...settings, backsound_volume: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>MUTE (0%)</span>
                    <span>50%</span>
                    <span>MAKSIMAL (100%)</span>
                  </div>
                </div>

                {/* Upload File MP3 */}
                <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    ATAU UNGGAH FILE MP3 KUSTOM (BUKET &quot;BACKSOUND&quot;)
                  </label>
                  <input
                    type="file"
                    accept="audio/mp3, audio/mpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleMediaUpload('backsound', file, (url) => {
                          setSettings((prev) => ({ ...prev, backsound_url: url }));
                          handleUpdateSettings({ backsound_url: url });
                        });
                      }
                    }}
                    className="hidden"
                    id="upload-audio-mp3"
                  />
                  <label
                    htmlFor="upload-audio-mp3"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Unggah File Audio (.mp3)</span>
                  </label>
                </div>

                {/* Submit Audio Settings */}
                <div className="flex justify-end pt-2 border-t border-white/5">
                  <button
                    onClick={() => {
                      handleUpdateSettings({
                        backsound_url: settings.backsound_url,
                        backsound_volume: settings.backsound_volume,
                        backsound_enabled: settings.backsound_enabled,
                      });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-300 shadow-lg"
                  >
                    Simpan Konfigurasi Audio
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: OPTIMASI SEO & OPEN GRAPH */}
          {activeTab === 'seo' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-semibold text-sm text-slate-300">Optimasi SEO & Pratinjau Tautan (Open Graph)</h3>
                <Share2 className="w-4 h-4 text-slate-500" />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl">
                <Info className="w-4 h-4 text-blue-400 inline-block mr-1.5 -translate-y-0.5" />
                Data di bawah ini digunakan saat tautan profil dibagikan ke platform perpesanan seperti WhatsApp, Telegram, LINE, Discord, atau media sosial seperti Facebook dan Twitter.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* OG Title */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    JUDUL OPEN GRAPH (OG:TITLE)
                  </label>
                  <input
                    type="text"
                    value={settings.og_title}
                    onChange={(e) => setSettings({ ...settings, og_title: e.target.value })}
                    placeholder="Contoh: Media Sosial Resmi ReyLan"
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/40"
                  />
                </div>

                {/* OG Description */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    DESKRIPSI OPEN GRAPH (OG:DESCRIPTION)
                  </label>
                  <input
                    type="text"
                    value={settings.og_description}
                    onChange={(e) => setSettings({ ...settings, og_description: e.target.value })}
                    placeholder="Tulis ringkasan info saat dibagikan..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/40"
                  />
                </div>
              </div>

              {/* OG Image */}
              <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-black/10">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-24 h-16 rounded-lg overflow-hidden border border-white/10 bg-slate-950 shrink-0 flex items-center justify-center">
                    {settings.og_image_url ? (
                      <img
                        src={settings.og_image_url}
                        alt="SEO Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">No Image</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 space-y-1 my-auto">
                    <p className="font-semibold text-slate-300">Gambar Preview Open Graph (og:image)</p>
                    <p>Rekomendasi ukuran: 1200x630px untuk visual media sosial terbaik.</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      URL GAMBAR OG LANGSUNG
                    </label>
                    <input
                      type="url"
                      value={settings.og_image_url || ''}
                      onChange={(e) => setSettings({ ...settings, og_image_url: e.target.value })}
                      placeholder="https://example.com/banner-seo.png"
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-blue-500/40"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                      ATAU UNGGAH BANNER BARU (BUKET &quot;OG-IMAGE&quot;)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleMediaUpload('og-image', file, (url) => {
                            setSettings((prev) => ({ ...prev, og_image_url: url }));
                            handleUpdateSettings({ og_image_url: url });
                          });
                        }
                      }}
                      className="hidden"
                      id="upload-og-banner"
                    />
                    <label
                      htmlFor="upload-og-banner"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Pilih Gambar Banner (.png / .jpg)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit SEO Settings */}
              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    handleUpdateSettings({
                      og_title: settings.og_title,
                      og_description: settings.og_description,
                      og_image_url: settings.og_image_url,
                    });
                  }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-300 shadow-lg"
                >
                  Terapkan Optimasi SEO
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: KEAMANAN & PASSWORD */}
          {activeTab === 'security' && (
            <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-semibold text-sm text-slate-300">Ganti Password Akses Dashboard</h3>
                <Shield className="w-4 h-4 text-slate-500" />
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                {/* Password Lama */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    PASSWORD SEBELUMNYA / LAMA
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password lama..."
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Password Baru */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      PASSWORD BARU
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter..."
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none"
                    />
                  </div>

                  {/* Konfirmasi Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      KONFIRMASI PASSWORD BARU
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru..."
                      className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all duration-300 shadow-lg"
                  >
                    Ubah Password Admin
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
