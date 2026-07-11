'use client';

import * as React from 'react';
import { useSettingsDraft } from '@/hooks/useSettingsDraft';
import { updateSettings } from '@/app/actions';
import { SiteSettings } from '@/lib/db';
import { 
  Upload, 
  RotateCcw, 
  RotateCw, 
  Check, 
  X, 
  Paintbrush, 
  Info,
  CheckCircle,
  Layout,
  Image as ImageIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TampilanClientProps {
  initialSettings: SiteSettings;
}

export default function TampilanClient({ initialSettings }: TampilanClientProps) {
  const router = useRouter();

  // Pending File Upload (menggunakan File murni)
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

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
    let finalData = { ...currentData };

    // 1. Jika ada file logo kustom untuk navbar settings, unggah sekarang
    if (logoFile) {
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('bucket', 'logo-navbar-settings');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengunggah logo navbar settings.');
      finalData.settings_logo_url = data.url;
    }

    // 2. Simpan ke database
    await updateSettings(finalData);

    setLogoFile(null);
    setSaveSuccess(true);
    
    // Refresh router agar layout ikut diperbarui secara real-time
    router.refresh();
    setTimeout(() => setSaveSuccess(false), 3000);
  });

  // Set flag kotor pada level sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dirty = isDirty || !!logoFile;
      if (dirty) {
        sessionStorage.setItem('isSettingsDraftDirty', 'true');
      } else {
        sessionStorage.removeItem('isSettingsDraftDirty');
      }
    }
  }, [isDirty, logoFile]);

  // Batal draf
  const handleCancelAll = () => {
    setLogoFile(null);
    resetDraft();
  };

  // Menangani perubahan file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
  };

  // Helper preview
  const getLogoPreview = () => {
    if (logoFile) return URL.createObjectURL(logoFile);
    return settings.settings_logo_url || '';
  };

  const hasPendingChanges = isDirty || !!logoFile;

  return (
    <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
      
      {/* HEADER DENGAN STATUS DRAFT & RIWAYAT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Tampilan Settings
            {hasPendingChanges && (
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono py-1 px-2.5 rounded-full animate-pulse">
                Draf Belum Disimpan
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Atur tema warna aksen, logo, dan judul teks header yang tampil di seluruh halaman settings admin.
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
            onClick={handleCancelAll}
            disabled={!hasPendingChanges || isSaving}
            className="px-4 h-10 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>

          {/* Simpan Perubahan */}
          <button
            onClick={saveDraft}
            disabled={!hasPendingChanges || isSaving}
            className={`px-5 h-10 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 shadow-lg
              ${hasPendingChanges 
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
        
        {/* WARNA AKSEN & IDENTITAS TAB BROWSER (KIRI) */}
        <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-semibold text-sm text-slate-300">Warna Tema & Identitas</h3>
            <Paintbrush className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-4">
            {/* Pengaturan Warna Aksen Settings */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                WARNA AKSEN TEMPAT SETTINGS
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.settings_accent_color || '#3b82f6'}
                  onChange={(e) => updateData(prev => ({ ...prev, settings_accent_color: e.target.value }))}
                  className="w-10 h-10 border border-white/10 bg-transparent rounded-lg cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={settings.settings_accent_color || '#3b82f6'}
                  onChange={(e) => updateData(prev => ({ ...prev, settings_accent_color: e.target.value }))}
                  className="flex-1 px-3 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white font-mono text-xs focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                *Warna ini diterapkan ke tombol aktif di sidebar, tombol simpan, border fokus input, dan elemen aksen lainnya di seluruh halaman settings.
              </p>
            </div>

            {/* Nama Website / Akun (Tab Browser) */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                NAMA WEBSITE / NAMA TAB BROWSER
              </label>
              <input
                type="text"
                value={settings.og_title || ''}
                onChange={(e) => updateData(prev => ({ ...prev, og_title: e.target.value }))}
                placeholder="Media Sosial ReyLan"
                className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white text-xs focus:outline-none focus:border-settings-accent"
              />
              <p className="text-[10px] text-slate-500">
                *Di dalam halaman settings, judul tab browser otomatis diatur menjadi: <code className="px-1.5 py-0.5 rounded bg-black/40 text-blue-400 font-mono text-[9px]">{settings.og_title || 'Nama'} | Pengaturan</code>
              </p>
            </div>

            {/* Pengaturan Seleksi Teks (Highlight) */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h4 className="text-xs font-semibold text-slate-300">Warna Seleksi Teks (Highlight)</h4>
              <p className="text-[10px] text-slate-500">
                Warna yang muncul ketika pengunjung memilih/mem-blok teks di halaman utama.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Latar Belakang Seleksi */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                    LATAR SELEKSI (BG)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={settings.selection_bg_color || '#3b82f6'}
                      onChange={(e) => updateData(prev => ({ ...prev, selection_bg_color: e.target.value }))}
                      className="w-8 h-8 border border-white/10 bg-transparent rounded-lg cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.selection_bg_color || '#3b82f6'}
                      onChange={(e) => updateData(prev => ({ ...prev, selection_bg_color: e.target.value }))}
                      className="w-full px-2 h-8 rounded-lg border border-white/10 bg-neutral-950 text-white font-mono text-[10px] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Warna Teks Seleksi */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono uppercase tracking-wider text-slate-400">
                    WARNA TEKS (FG)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={settings.selection_text_color || '#ffffff'}
                      onChange={(e) => updateData(prev => ({ ...prev, selection_text_color: e.target.value }))}
                      className="w-8 h-8 border border-white/10 bg-transparent rounded-lg cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={settings.selection_text_color || '#ffffff'}
                      onChange={(e) => updateData(prev => ({ ...prev, selection_text_color: e.target.value }))}
                      className="w-full px-2 h-8 rounded-lg border border-white/10 bg-neutral-950 text-white font-mono text-[10px] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Teks Peringatan Jika Fitur Seleksi Dimatikan */}
              {settings.disable_text_select && (
                <p className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Fitur seleksi teks dinonaktifkan di <strong>Keamanan</strong>. Pengaturan warna ini tidak akan terlihat aktif di halaman utama.
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* LOGO & TEKS NAV BAR (KANAN) */}
        <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-semibold text-sm text-slate-300">Header & Navbar Settings</h3>
            <Layout className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-4">
            {/* Judul Admin Navbar */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                JUDUL NAV BAR SETTINGS (HEADER)
              </label>
              <input
                type="text"
                value={settings.settings_navbar_title || ''}
                onChange={(e) => updateData(prev => ({ ...prev, settings_navbar_title: e.target.value }))}
                placeholder="ReyLan Admin"
                className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white text-xs focus:outline-none"
              />
            </div>

            {/* Subjudul Admin Navbar */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                SUBJUDUL NAV BAR SETTINGS (SMALL TEXT)
              </label>
              <input
                type="text"
                value={settings.settings_navbar_subtitle || ''}
                onChange={(e) => updateData(prev => ({ ...prev, settings_navbar_subtitle: e.target.value }))}
                placeholder="Dashboard V1.0"
                className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white text-xs focus:outline-none"
              />
            </div>

            {/* Logo Navbar Settings */}
            <div className="space-y-4 pt-2 border-t border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-neutral-950 shrink-0 flex items-center justify-center p-2 bg-slate-900">
                  {getLogoPreview() ? (
                    <img
                      src={getLogoPreview()}
                      alt="Pratinjau Logo Navbar"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-settings-accent flex items-center justify-center font-bold text-xs text-white">
                      {(settings.settings_navbar_title || 'RL').substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400 space-y-1 my-auto">
                  <p className="font-semibold text-slate-300">Logo Navbar Admin</p>
                  <p>Akan disimpan di bucket khusus <code className="text-settings-accent">logo-navbar-settings</code>.</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    URL LOGO LANGSUNG
                  </label>
                  <input
                    type="url"
                    value={settings.settings_logo_url || ''}
                    onChange={(e) => updateData(prev => ({ ...prev, settings_logo_url: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="upload-navbar-logo-file"
                  />
                  <label
                    htmlFor="upload-navbar-logo-file"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{logoFile ? `Logo Terpilih: ${logoFile.name.substring(0, 20)}...` : 'Pilih Logo dari Perangkat'}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
