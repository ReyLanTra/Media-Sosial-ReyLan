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
  User, 
  FileText, 
  Sparkles,
  Info,
  BadgeCheck,
  Code
} from 'lucide-react';
import { motion } from 'motion/react';
import DOMPurify from 'isomorphic-dompurify';

interface ProfilKontenClientProps {
  initialSettings: SiteSettings;
}

export default function ProfilKontenClient({ initialSettings }: ProfilKontenClientProps) {
  // Simpan file asli yang diunggah sementara di sisi klien
  const [profilePhotoFile, setProfilePhotoFile] = React.useState<File | null>(null);
  const [faviconFile, setFaviconFile] = React.useState<File | null>(null);
  const [badgeFile, setBadgeFile] = React.useState<File | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Hook untuk draft, undo, redo, batal, dsb.
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

    // 1. Jika ada unggahan foto profil kustom yang tertunda, unggah sekarang
    if (profilePhotoFile) {
      const formData = new FormData();
      formData.append('file', profilePhotoFile);
      formData.append('bucket', 'foto-profil');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengunggah foto profil.');
      
      let baseUrl = data.url;
      const qIdx = baseUrl.indexOf('?');
      if (qIdx !== -1) {
        baseUrl = baseUrl.substring(0, qIdx);
      }
      finalData.profile_photo_url = `${baseUrl}?updated=${Date.now()}`;
    }

    // 2. Jika ada unggahan favicon kustom yang tertunda, unggah sekarang
    if (faviconFile) {
      const formData = new FormData();
      formData.append('file', faviconFile);
      formData.append('bucket', 'favicon');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengunggah favicon.');
      
      let baseUrl = data.url;
      const qIdx = baseUrl.indexOf('?');
      if (qIdx !== -1) {
        baseUrl = baseUrl.substring(0, qIdx);
      }
      finalData.favicon_url = `${baseUrl}?updated=${Date.now()}`;
    }

    // 3. Jika ada unggahan badge kustom yang tertunda
    if (badgeFile) {
      const formData = new FormData();
      formData.append('file', badgeFile);
      formData.append('bucket', 'badge-centang');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengunggah badge.');
      
      let baseUrl = data.url;
      const qIdx = baseUrl.indexOf('?');
      if (qIdx !== -1) {
        baseUrl = baseUrl.substring(0, qIdx);
      }
      finalData.badge_image_url = `${baseUrl}?updated=${Date.now()}`;
    }

    // Sanitasi kode SVG jika tipenya svg_code
    if (finalData.badge_type === 'svg_code' && finalData.badge_svg_code) {
      finalData.badge_svg_code = DOMPurify.sanitize(finalData.badge_svg_code, {
        USE_PROFILES: { svg: true },
        FORBID_TAGS: ['script', 'foreignObject'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror']
      });
    }

    // 4. Simpan seluruh konfigurasi ke database
    const saveResult = await updateSettings(finalData);
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Gagal menyimpan profil & konten.');
    }
    
    // Reset file temporer setelah sukses menyimpan
    setProfilePhotoFile(null);
    setFaviconFile(null);
    setBadgeFile(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    return finalData;
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dirty = isDirty || !!profilePhotoFile || !!faviconFile || !!badgeFile;
      if (dirty) {
        sessionStorage.setItem('isSettingsDraftDirty', 'true');
      } else {
        sessionStorage.removeItem('isSettingsDraftDirty');
      }
    }
  }, [isDirty, profilePhotoFile, faviconFile, badgeFile]);

  // Batal semua perubahan draf
  const handleCancelAll = () => {
    setProfilePhotoFile(null);
    setFaviconFile(null);
    setBadgeFile(null);
    resetDraft();
  };

  // Menangani perubahan file
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'profile_photo' | 'favicon' | 'badge'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'profile_photo') {
      setProfilePhotoFile(file);
    } else if (type === 'favicon') {
      setFaviconFile(file);
    } else {
      setBadgeFile(file);
    }
  };

  // Preview Image URL Helper
  const getProfilePreview = () => {
    if (profilePhotoFile) return URL.createObjectURL(profilePhotoFile);
    return settings.profile_photo_url || '';
  };

  const getFaviconPreview = () => {
    if (faviconFile) return URL.createObjectURL(faviconFile);
    return settings.favicon_url || '';
  };

  const hasPendingChanges = isDirty || !!profilePhotoFile || !!faviconFile;

  return (
    <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
      
      {/* HEADER DENGAN STATUS DRAFT & RIWAYAT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Profil & Konten
            {hasPendingChanges && (
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono py-1 px-2.5 rounded-full animate-pulse">
                Draf Belum Disimpan
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ubah foto profil, nama, bio, tagline, dan konfigurasi glow foto profil.
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

      {/* ERROR MESSAGE PANEL */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* FORM BODY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: VISUAL MEDIA (PROFILE PHOTO & FAVICON) */}
        <div className="space-y-6">
          
          {/* FOTO PROFIL UTAMA */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <h2 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span>Foto Profil Utama</span>
            </h2>

            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-neutral-950 shrink-0">
                {getProfilePreview() ? (
                  <img
                    src={getProfilePreview()}
                    alt="Pratinjau Profil"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-mono">
                    Kosong
                  </div>
                )}
              </div>
              <div className="text-xs text-slate-400 space-y-1 my-auto">
                <p className="font-semibold text-slate-300">Format gambar: PNG, JPG, WEBP.</p>
                <p>Rasio persegi 1:1 sangat direkomendasikan.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  URL FOTO LANGSUNG
                </label>
                <input
                  type="url"
                  value={settings.profile_photo_url || ''}
                  onChange={(e) => updateData(prev => ({ ...prev, profile_photo_url: e.target.value }))}
                  placeholder="https://example.com/foto.png"
                  className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                />
              </div>

              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'profile_photo')}
                  className="hidden"
                  id="upload-profile-file"
                />
                <label
                  htmlFor="upload-profile-file"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                >
                  <Upload className="w-4 h-4" />
                  <span>{profilePhotoFile ? `File Terpilih: ${profilePhotoFile.name.substring(0, 20)}...` : 'Pilih Gambar dari Perangkat'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* FAVICON WEBSITE */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <h2 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span>Favicon Website (.ico/.png)</span>
            </h2>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-neutral-950 shrink-0 flex items-center justify-center p-2 bg-slate-900">
                {getFaviconPreview() ? (
                  <img
                    src={getFaviconPreview()}
                    alt="Pratinjau Favicon"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">No Fav</span>
                )}
              </div>
              <div className="text-xs text-slate-400 space-y-1 my-auto">
                <p className="font-semibold text-slate-300">Favicon adalah ikon tab browser</p>
                <p>Format: .ico atau .png. Ukuran standar: 32x32px.</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  URL FAVICON LANGSUNG
                </label>
                <input
                  type="url"
                  value={settings.favicon_url || ''}
                  onChange={(e) => updateData(prev => ({ ...prev, favicon_url: e.target.value }))}
                  placeholder="https://example.com/favicon.ico"
                  className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                />
              </div>

              <div>
                <input
                  type="file"
                  accept="image/x-icon, image/png, image/jpeg"
                  onChange={(e) => handleFileChange(e, 'favicon')}
                  className="hidden"
                  id="upload-favicon-file"
                />
                <label
                  htmlFor="upload-favicon-file"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                >
                  <Upload className="w-4 h-4" />
                  <span>{faviconFile ? `File Terpilih: ${faviconFile.name.substring(0, 20)}...` : 'Pilih Favicon (.png / .ico)'}</span>
                </label>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: TEXT CONTENT & PROFILE GLOW CONFIG */}
        <div className="space-y-6">
          
          {/* TEXT INFORMATIONS */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <h2 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Informasi Profil & Teks Konten</span>
            </h2>

            <div className="space-y-4">
              {/* Nama Akun Utama */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  NAMA AKUN UTAMA
                </label>
                <input
                  type="text"
                  required
                  value={settings.account_name}
                  onChange={(e) => updateData(prev => ({ ...prev, account_name: e.target.value }))}
                  placeholder="Nama Akun"
                  className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                />
              </div>

              {/* Tagline Teks */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  TAGLINE HALAMAN UTAMA (DI BAWAH NAMA AKUN)
                </label>
                <input
                  type="text"
                  value={settings.tagline_text || ''}
                  onChange={(e) => updateData(prev => ({ ...prev, tagline_text: e.target.value }))}
                  placeholder="Kosongkan untuk menyembunyikan. Contoh: OFFICIAL LINK-IN-BIO"
                  className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                />
              </div>

              {/* Bio Deskripsi */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  BIO DESKRIPSI SINGKAT
                </label>
                <textarea
                  value={settings.bio}
                  onChange={(e) => updateData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tulis deskripsi singkat profil Anda di sini..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent resize-none"
                />
              </div>

              {/* Footer Teks */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  TEKS KAKI HALAMAN (FOOTER)
                </label>
                <input
                  type="text"
                  value={settings.footer_text}
                  onChange={(e) => updateData(prev => ({ ...prev, footer_text: e.target.value }))}
                  placeholder="© 2026. Hak cipta dilindungi."
                  className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                />
              </div>

              {/* Toggle Centang Verifikasi */}
              <div className="space-y-4">
                <div className="flex items-center h-12 px-4 rounded-xl border border-white/10 bg-neutral-950">
                  <label className="flex items-center gap-3 cursor-pointer w-full justify-between">
                    <span className="text-xs font-semibold text-slate-300">Tampilkan Badge Terverifikasi (Centang)</span>
                    <input
                      type="checkbox"
                      checked={settings.is_verified}
                      onChange={(e) => updateData(prev => ({ ...prev, is_verified: e.target.checked }))}
                      className="w-4 h-4 rounded accent-settings-accent cursor-pointer"
                    />
                  </label>
                </div>

                {settings.is_verified && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        TIPE BADGE CENTANG
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'png', label: 'Gambar PNG' },
                          { id: 'svg_file', label: 'File SVG' },
                          { id: 'svg_code', label: 'Kode SVG' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateData(prev => ({ ...prev, badge_type: opt.id as any }))}
                            className={`px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                              settings.badge_type === opt.id
                                ? 'bg-settings-accent/20 border-settings-accent text-settings-accent'
                                : 'bg-neutral-950 border-white/10 text-slate-500 hover:border-white/20'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {settings.badge_type === 'svg_code' ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 flex justify-between items-center">
                            <span>MARKUP KODE SVG</span>
                            <Code className="w-3 h-3" />
                          </label>
                          <div className="flex gap-3">
                            <textarea
                              value={settings.badge_svg_code || ''}
                              onChange={(e) => updateData(prev => ({ ...prev, badge_svg_code: e.target.value }))}
                              placeholder="<svg>...</svg>"
                              rows={5}
                              className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white font-mono text-[10px] focus:outline-none focus:border-settings-accent resize-none"
                            />
                            <div className="w-24 h-24 rounded-xl border border-white/10 bg-neutral-950 flex flex-col items-center justify-center p-2 shrink-0">
                              <span className="text-[8px] text-slate-500 font-mono mb-2">PRATINJAU</span>
                              <div 
                                className="w-10 h-10 flex items-center justify-center overflow-hidden"
                                dangerouslySetInnerHTML={{ 
                                  __html: DOMPurify.sanitize(settings.badge_svg_code || '', { 
                                    USE_PROFILES: { svg: true },
                                    FORBID_TAGS: ['script', 'foreignObject'],
                                    FORBID_ATTR: ['onclick', 'onload', 'onerror']
                                  }) 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            URL BADGE LANGSUNG
                          </label>
                          <div className="flex gap-3">
                            <input
                              type="url"
                              value={settings.badge_image_url || ''}
                              onChange={(e) => updateData(prev => ({ ...prev, badge_image_url: e.target.value }))}
                              placeholder="https://example.com/badge.png"
                              className="flex-1 px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                            />
                            <div className="w-11 h-11 rounded-xl border border-white/10 bg-neutral-950 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                              {badgeFile ? (
                                <img src={URL.createObjectURL(badgeFile)} alt="Preview" className="max-w-full max-h-full object-contain" />
                              ) : settings.badge_image_url ? (
                                <img src={settings.badge_image_url} alt="Badge" className="max-w-full max-h-full object-contain" />
                              ) : (
                                <BadgeCheck className="w-5 h-5 text-slate-600" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <input
                            type="file"
                            accept={settings.badge_type === 'png' ? "image/png" : ".svg, image/svg+xml"}
                            onChange={(e) => handleFileChange(e, 'badge')}
                            className="hidden"
                            id="upload-badge-file"
                          />
                          <label
                            htmlFor="upload-badge-file"
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-neutral-950 text-[10px] font-bold cursor-pointer text-slate-400 hover:text-white transition-all duration-300 uppercase tracking-wider"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{badgeFile ? `Terpilih: ${badgeFile.name.substring(0, 15)}...` : `Upload ${settings.badge_type === 'png' ? 'PNG' : 'SVG'}`}</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* WARNA CAHAYA/GLOW DI SEKITAR FOTO PROFIL */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4">
            <h2 className="font-semibold text-sm text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Efek Glow Foto Profil</span>
            </h2>

            <div className="space-y-4">
              {/* Pilihan Mode Glow */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  MODE CAHAYA (GLOW MODE)
                </label>
                <select
                  value={settings.profile_glow_mode || 'solid'}
                  onChange={(e) => updateData(prev => ({ ...prev, profile_glow_mode: e.target.value as any }))}
                  className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white text-xs focus:outline-none focus:border-settings-accent cursor-pointer"
                >
                  <option value="solid">Satu Warna (Solid)</option>
                  <option value="gradient">Gradasi Dua Warna (Gradient)</option>
                </select>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    {settings.profile_glow_mode === 'gradient' ? 'WARNA AWAL (START)' : 'WARNA CAHAYA'}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.profile_glow_color_start || '#8083ff'}
                      onChange={(e) => updateData(prev => ({ ...prev, profile_glow_color_start: e.target.value }))}
                      className="w-10 h-10 border border-white/10 bg-transparent rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.profile_glow_color_start || '#8083ff'}
                      onChange={(e) => updateData(prev => ({ ...prev, profile_glow_color_start: e.target.value }))}
                      className="flex-1 px-3 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {settings.profile_glow_mode === 'gradient' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      WARNA AKHIR (END)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.profile_glow_color_end || '#ffb0cd'}
                        onChange={(e) => updateData(prev => ({ ...prev, profile_glow_color_end: e.target.value }))}
                        className="w-10 h-10 border border-white/10 bg-transparent rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.profile_glow_color_end || '#ffb0cd'}
                        onChange={(e) => updateData(prev => ({ ...prev, profile_glow_color_end: e.target.value }))}
                        className="flex-1 px-3 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white font-mono text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pilihan Arah Gradasi (Jika mode gradient) */}
              {settings.profile_glow_mode === 'gradient' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    ARAH GRADASI
                  </label>
                  <select
                    value={settings.profile_glow_direction || 'radial'}
                    onChange={(e) => updateData(prev => ({ ...prev, profile_glow_direction: e.target.value as any }))}
                    className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white text-xs focus:outline-none focus:border-settings-accent cursor-pointer"
                  >
                    <option value="radial">Melingkar (Radial)</option>
                    <option value="linear">Garis Lurus (Linear)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
