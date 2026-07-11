'use client';

import * as React from 'react';
import { useSettingsDraft } from '@/hooks/useSettingsDraft';
import { updateSettings, changeAdminPassword } from '@/app/actions';
import { SiteSettings } from '@/lib/db';
import { 
  RotateCcw, 
  RotateCw, 
  Check, 
  X, 
  Shield, 
  Lock, 
  Info,
  AlertCircle,
  Eye,
  EyeOff,
  Sliders
} from 'lucide-react';

interface KeamananClientProps {
  initialSettings: SiteSettings;
}

export default function KeamananClient({ initialSettings }: KeamananClientProps) {
  // Ganti Password State
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passLoading, setPassLoading] = React.useState(false);
  const [passMessage, setPassMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Hook draft
  const {
    data: settings,
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    isSaving,
    error,
    reset: resetDraft,
    save: saveDraft,
  } = useSettingsDraft<SiteSettings>(initialSettings, async (currentData) => {
    // Simpan semua konfigurasi toggle boolean ke database
    await updateSettings({
      disable_zoom: currentData.disable_zoom,
      disable_scroll: currentData.disable_scroll,
      disable_image_save: currentData.disable_image_save,
      disable_text_select: currentData.disable_text_select,
      disable_pull_refresh: currentData.disable_pull_refresh,
      disable_link_preview: currentData.disable_link_preview,
      allow_desktop_access: currentData.allow_desktop_access,
      allow_mobile_access: currentData.allow_mobile_access,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  });

  const handleSave = () => {
    if (!settings.allow_desktop_access && !settings.allow_mobile_access) {
      alert('Gagal: Minimal satu jenis perangkat (Desktop atau Mobile) harus diizinkan untuk mengakses website.');
      return;
    }
    saveDraft();
  };

  // Set flag kotor pada level sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDirty) {
        sessionStorage.setItem('isSettingsDraftDirty', 'true');
      } else {
        sessionStorage.removeItem('isSettingsDraftDirty');
      }
    }
  }, [isDirty]);

  // Handler ubah password (langsung disimpan karena password action membutuhkan verifikasi tersendiri)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassMessage({ type: 'error', text: 'Harap isi semua bidang password.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMessage({ type: 'error', text: 'Password baru minimal harus 6 karakter.' });
      return;
    }

    setPassLoading(true);
    setPassMessage(null);

    try {
      const res = await changeAdminPassword(oldPassword, newPassword);
      if (res.success) {
        setPassMessage({ type: 'success', text: res.message });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setPassMessage({ type: 'error', text: err?.message || 'Gagal mengubah password.' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
      
      {/* HEADER DENGAN STATUS DRAFT & RIWAYAT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Keamanan
            {isDirty && (
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono py-1 px-2.5 rounded-full animate-pulse">
                Draf Belum Disimpan
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ubah password panel admin dan kelola kontrol keamanan interaksi pengunjung di halaman utama.
          </p>
        </div>

        {/* UNDO / REDO / BATAL / SIMPAN BAR */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo */}
          <button
            onClick={undo}
            disabled={!canUndo || isSaving}
            title="Undo"
            className="p-2 h-10 w-10 rounded-xl border border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4 mx-auto" />
          </button>
          
          {/* Redo */}
          <button
            onClick={redo}
            disabled={!canRedo || isSaving}
            title="Redo"
            className="p-2 h-10 w-10 rounded-xl border border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
          >
            <RotateCw className="w-4 h-4 mx-auto" />
          </button>

          {/* Batal */}
          <button
            onClick={resetDraft}
            disabled={!isDirty || isSaving}
            className="px-4 h-10 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>

          {/* Simpan Perubahan */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className={`px-5 h-10 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 shadow-lg
              ${isDirty 
                ? 'bg-settings-accent hover:opacity-90 text-white shadow-blue-500/10' 
                : 'bg-white/5 text-slate-500 border border-white/5 disabled:pointer-events-none'
              }
            `}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menyimpan...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ERROR PANEL */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* BODY CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        
        {/* FITUR PROTEKSI DAN KONTROL INTERAKSI (DI KIRI) */}
        <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-semibold text-sm text-slate-300">Kontrol Interaksi Pengunjung</h3>
            <Shield className="w-4 h-4 text-slate-500" />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed bg-blue-500/5 border border-blue-500/10 p-3.5 rounded-xl">
            <Info className="w-4 h-4 text-blue-400 inline-block mr-1.5 -translate-y-0.5" />
            Aktifkan beberapa opsi di bawah ini untuk mencegah penyalahgunaan konten atau menyalin gambar/teks di halaman utama Anda.
          </p>

          <div className="space-y-3.5">
            {/* Toggle Akses Desktop */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Izinkan Akses dari Desktop</span>
                <p className="text-[10px] text-slate-500">Mengizinkan pengunjung membuka web via komputer/laptop</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.allow_desktop_access}
                onChange={(e) => updateData(prev => ({ ...prev, allow_desktop_access: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>

            {/* Toggle Akses Mobile */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Izinkan Akses dari Mobile</span>
                <p className="text-[10px] text-slate-500">Mengizinkan pengunjung membuka web via smartphone/tablet</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.allow_mobile_access}
                onChange={(e) => updateData(prev => ({ ...prev, allow_mobile_access: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>

            <div className="h-px bg-white/5 my-2"></div>

            {/* Toggle Zoom */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Kunci Zoom Layar (Pinch to Zoom)</span>
                <p className="text-[10px] text-slate-500">Mencegah pengunjung memperbesar layar di mobile</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.disable_zoom}
                onChange={(e) => updateData(prev => ({ ...prev, disable_zoom: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>

            {/* Toggle Scroll */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Kunci Scroll Layar (Overflow Hidden)</span>
                <p className="text-[10px] text-slate-500">Mengunci layar penuh tanpa bisa digulir</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.disable_scroll}
                onChange={(e) => updateData(prev => ({ ...prev, disable_scroll: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>

            {/* Toggle Klik Kanan Gambar */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Kunci Simpan Gambar (Klik Kanan & Tahan)</span>
                <p className="text-[10px] text-slate-500">Menonaktifkan seret dan menu kontekstual gambar</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.disable_image_save}
                onChange={(e) => updateData(prev => ({ ...prev, disable_image_save: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>

            {/* Toggle Pemilihan Teks */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Kunci Copy Teks (Text Selection)</span>
                <p className="text-[10px] text-slate-500">Mencegah penyorotan atau penyalinan tulisan</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.disable_text_select}
                onChange={(e) => updateData(prev => ({ ...prev, disable_text_select: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>

            {/* Toggle Pull to Refresh */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Matikan Drag-to-Refresh</span>
                <p className="text-[10px] text-slate-500">Mencegah aksi geser bawah browser untuk refresh</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.disable_pull_refresh}
                onChange={(e) => updateData(prev => ({ ...prev, disable_pull_refresh: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>

            {/* Toggle Link Preview */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200">Kunci Preview URL di Tombol (Tahan Lama)</span>
                <p className="text-[10px] text-slate-500">Menonaktifkan menu preview URL di mobile browser</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings.disable_link_preview}
                onChange={(e) => updateData(prev => ({ ...prev, disable_link_preview: e.target.checked }))}
                className="w-4 h-4 rounded accent-settings-accent cursor-pointer shrink-0"
              />
            </div>
          </div>
        </div>

        {/* UBAH PASSWORD ADMIN (DI KANAN) */}
        <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-semibold text-sm text-slate-300">Ganti Password Admin</h3>
            <Lock className="w-4 h-4 text-slate-500" />
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Password Lama */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                PASSWORD LAMA
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Kata sandi lama..."
                className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
              />
            </div>

            {/* Password Baru */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                PASSWORD BARU (MIN 6 KARAKTER)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi baru..."
                className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
              />
            </div>

            {/* Konfirmasi Password Baru */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                KONFIRMASI PASSWORD BARU
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Konfirmasi kata sandi baru..."
                className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
              />
            </div>

            {/* Password Update Feedback */}
            {passMessage && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                passMessage.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {passMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{passMessage.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={passLoading}
              className="w-full h-10 rounded-xl bg-settings-accent hover:opacity-90 text-white text-xs font-bold transition-all duration-300 disabled:opacity-50 shadow-md"
            >
              {passLoading ? 'Mengubah...' : 'Perbarui Password Admin'}
            </button>
          </form>

          {/* Sesuai Keamanan lama */}
          <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] text-slate-500 leading-normal">
            <p className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] mb-1">Informasi:</p>
            <p>Sesi autentikasi admin diatur menggunakan enkripsi cookie yang aman di tingkat server.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
