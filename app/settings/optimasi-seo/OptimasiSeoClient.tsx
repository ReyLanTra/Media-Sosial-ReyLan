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
  Share2, 
  Info,
  CheckCircle
} from 'lucide-react';

// Fungsi pembantu untuk kompresi gambar di sisi client secara real-time
function compressImage(file: File, maxWidth = 1200, maxWeightBytes = 300 * 1024): Promise<File> {
  return new Promise((resolve) => {
    // Jika file sangat kecil, tidak perlu dikompresi
    if (file.size <= maxWeightBytes && !file.type.includes('image/png')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Ubah skala jika melebihi lebar maksimal demi kinerja crawler
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke Blob dengan format JPEG berkualitas 0.75 agar sangat ringan (< 300KB)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

interface OptimasiSeoClientProps {
  initialSettings: SiteSettings;
}

export default function OptimasiSeoClient({ initialSettings }: OptimasiSeoClientProps) {
  // Pending File Upload (menggunakan File murni)
  const [ogImageFile, setOgImageFile] = React.useState<File | null>(null);
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

    // 1. Upload og-image kustom jika ada
    if (ogImageFile) {
      const formData = new FormData();
      formData.append('file', ogImageFile);
      formData.append('bucket', 'og-image');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Gagal mengunggah gambar Open Graph.');
      
      // Bersihkan query string lama dari URL hasil upload jika ada
      let baseUrl = data.url;
      const qIdx = baseUrl.indexOf('?');
      if (qIdx !== -1) {
        baseUrl = baseUrl.substring(0, qIdx);
      }
      // Tambahkan parameter cache-busting terbaru agar CDN dan browser tidak menyajikan cache lama
      finalData.og_image_url = `${baseUrl}?updated=${Date.now()}`;
    }

    // 2. Simpan ke database
    const saveResult = await updateSettings(finalData);
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Gagal menyimpan pengaturan SEO.');
    }

    setOgImageFile(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    return finalData;
  });

  // Set flag kotor pada level sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dirty = isDirty || !!ogImageFile;
      if (dirty) {
        sessionStorage.setItem('isSettingsDraftDirty', 'true');
      } else {
        sessionStorage.removeItem('isSettingsDraftDirty');
      }
    }
  }, [isDirty, ogImageFile]);

  // Batal draf
  const handleCancelAll = () => {
    setOgImageFile(null);
    resetDraft();
  };

  // Menangani perubahan file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setOgImageFile(compressed);
    } catch (err) {
      console.error('Gagal mengompresi gambar, menggunakan file asli:', err);
      setOgImageFile(file);
    }
  };

  // Helper preview
  const getOgImagePreview = () => {
    if (ogImageFile) return URL.createObjectURL(ogImageFile);
    return settings.og_image_url || '';
  };

  const hasPendingChanges = isDirty || !!ogImageFile;

  return (
    <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
      
      {/* HEADER DENGAN STATUS DRAFT & RIWAYAT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Optimasi SEO (OG)
            {hasPendingChanges && (
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono py-1 px-2.5 rounded-full animate-pulse">
                Draf Belum Disimpan
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Konfigurasikan meta-tag Open Graph untuk memoles tampilan link Anda saat dibagikan ke medsos atau aplikasi chat.
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

      {/* BODY CONFIG */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
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
              onChange={(e) => updateData(prev => ({ ...prev, og_title: e.target.value }))}
              placeholder="Contoh: Media Sosial Resmi ReyLan"
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-settings-accent"
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
              onChange={(e) => updateData(prev => ({ ...prev, og_description: e.target.value }))}
              placeholder="Tulis ringkasan info saat dibagikan..."
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-settings-accent"
            />
          </div>
        </div>

        {/* Facebook App ID */}
        <div className="space-y-1.5 pt-2">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            FACEBOOK APP ID (OPSIONAL)
            <span className="text-[9px] text-slate-500 font-sans capitalize">(Hilangkan peringatan fb:app_id)</span>
          </label>
          <input
            type="text"
            value={settings.fb_app_id || ''}
            onChange={(e) => updateData(prev => ({ ...prev, fb_app_id: e.target.value || null }))}
            placeholder="Contoh: 123456789012345"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-settings-accent"
          />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <Info className="w-3 h-3 text-slate-400 inline-block mr-1 -translate-y-0.5" />
            Peringatan <code className="text-amber-500/90 font-mono">fb:app_id</code> pada Facebook Sharing Debugger bersifat opsional dan tidak wajib diisi jika Anda tidak memiliki aplikasi Facebook yang terdaftar di Facebook Developers. Mengosongkan field ini aman dan tidak akan memengaruhi tampilan gambar preview link di WhatsApp atau media sosial lainnya.
          </p>
        </div>

        {/* OG Image */}
        <div className="space-y-4 p-4 rounded-xl border border-white/5 bg-black/10">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-24 h-16 rounded-lg overflow-hidden border border-white/10 bg-slate-950 shrink-0 flex items-center justify-center">
              {getOgImagePreview() ? (
                <img
                  src={getOgImagePreview()}
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
                onChange={(e) => updateData(prev => ({ ...prev, og_image_url: e.target.value }))}
                placeholder="https://example.com/banner-seo.png"
                className="w-full px-3 py-2 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
              />
            </div>

            <div className="relative">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                ATAU UNGGAH BANNER BARU (.png / .jpg)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="upload-og-banner-file"
              />
              <label
                htmlFor="upload-og-banner-file"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
              >
                <Upload className="w-4 h-4" />
                <span>{ogImageFile ? `File Terpilih: ${ogImageFile.name.substring(0, 20)}...` : 'Pilih Gambar Banner (.png / .jpg)'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
