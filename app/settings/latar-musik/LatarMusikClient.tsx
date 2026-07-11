'use client';

import * as React from 'react';
import { useSettingsDraft } from '@/hooks/useSettingsDraft';
import { updateSettings, uploadMedia } from '@/app/actions';
import { SiteSettings } from '@/lib/db';
import { 
  Upload, 
  RotateCcw, 
  RotateCw, 
  Check, 
  X, 
  Sliders, 
  Music, 
  Info,
  CheckCircle
} from 'lucide-react';

interface LatarMusikClientProps {
  initialSettings: SiteSettings;
}

export default function LatarMusikClient({ initialSettings }: LatarMusikClientProps) {
  // Pending File Uploads
  const [backgroundFile, setBackgroundFile] = React.useState<{ base64: string; name: string } | null>(null);
  const [backsoundFile, setBacksoundFile] = React.useState<{ base64: string; name: string } | null>(null);
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

    // 1. Upload background file kustom jika ada
    if (backgroundFile) {
      const url = await uploadMedia('background', backgroundFile.base64, backgroundFile.name);
      finalData.background_url = url;
    }

    // 2. Upload backsound file kustom jika ada
    if (backsoundFile) {
      const url = await uploadMedia('backsound', backsoundFile.base64, backsoundFile.name);
      finalData.backsound_url = url;
    }

    // 3. Simpan perubahan ke database
    await updateSettings(finalData);

    setBackgroundFile(null);
    setBacksoundFile(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  });

  // Set flag kotor pada level sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const dirty = isDirty || !!backgroundFile || !!backsoundFile;
      if (dirty) {
        sessionStorage.setItem('isSettingsDraftDirty', 'true');
      } else {
        sessionStorage.removeItem('isSettingsDraftDirty');
      }
    }
  }, [isDirty, backgroundFile, backsoundFile]);

  // Batal draf
  const handleCancelAll = () => {
    setBackgroundFile(null);
    setBacksoundFile(null);
    resetDraft();
  };

  // Convert files to base64
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'background' | 'backsound'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'background') {
        setBackgroundFile({ base64: base64String, name: file.name });
      } else {
        setBacksoundFile({ base64: base64String, name: file.name });
      }
    };
    reader.readAsDataURL(file);
  };

  const hasPendingChanges = isDirty || !!backgroundFile || !!backsoundFile;

  return (
    <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
      
      {/* HEADER DENGAN STATUS DRAFT & RIWAYAT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Latar & Musik
            {hasPendingChanges && (
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono py-1 px-2.5 rounded-full animate-pulse">
                Draf Belum Disimpan
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ubah latar belakang (Gambar, GIF, Video) dan musik pengiring halaman profil utama Anda.
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* SECTION 1: LATAR BELAKANG */}
        <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-semibold text-sm text-slate-300">Konfigurasi Latar Belakang</h3>
            <Sliders className="w-4 h-4 text-slate-500" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Tipe Latar Belakang */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                TIPE LATAR BELAKANG
              </label>
              <select
                value={settings.background_type}
                onChange={(e) => updateData(prev => ({ ...prev, background_type: e.target.value as any }))}
                className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white text-xs focus:outline-none focus:border-settings-accent cursor-pointer"
              >
                <option value="image">Gambar Statis (PNG / JPG / WebP)</option>
                <option value="gif">GIF Animasi</option>
                <option value="video">Video MP4 (Autoplay Muted Loop)</option>
              </select>
            </div>

            {/* URL Latar Belakang */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                URL FILE LATAR BELAKANG
              </label>
              <input
                type="url"
                value={settings.background_url || ''}
                onChange={(e) => updateData(prev => ({ ...prev, background_url: e.target.value }))}
                placeholder="https://example.com/background.jpg"
                className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
              />
            </div>

            {/* Upload File Latar Belakang */}
            <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                ATAU UNGGAH BERKAS BARU (.jpg, .gif, .mp4)
              </label>
              <input
                type="file"
                accept="image/*, video/mp4"
                onChange={(e) => handleFileChange(e, 'background')}
                className="hidden"
                id="upload-bg-media-file"
              />
              <label
                htmlFor="upload-bg-media-file"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
              >
                <Upload className="w-4 h-4" />
                <span>{backgroundFile ? `Berkas: ${backgroundFile.name.substring(0, 20)}...` : 'Unggah Gambar / GIF / Video MP4'}</span>
              </label>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                *Jika MP4 diunggah, video akan ter-render di lapisan paling belakang secara penuh tanpa suara, loop otomatis, dan bebas kontrol bawaan browser.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: AUDIO MUSIK LATAR */}
        <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-semibold text-sm text-slate-300">Konfigurasi Musik Pengiring</h3>
            <Music className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-4">
            {/* Status Backsound Global Toggle */}
            <div className="flex items-center h-12 px-4 rounded-xl border border-white/10 bg-neutral-950">
              <label className="flex items-center gap-3 cursor-pointer w-full justify-between">
                <span className="text-xs font-semibold text-slate-300">Aktifkan Musik Latar Belakang</span>
                <input
                  type="checkbox"
                  checked={settings.backsound_enabled}
                  onChange={(e) => updateData(prev => ({ ...prev, backsound_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded accent-settings-accent cursor-pointer"
                />
              </label>
            </div>

            {/* URL File Musik MP3 */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                URL FILE MUSIK (.mp3)
              </label>
              <input
                type="url"
                value={settings.backsound_url || ''}
                onChange={(e) => updateData(prev => ({ ...prev, backsound_url: e.target.value }))}
                placeholder="https://example.com/musik.mp3"
                className="w-full px-4 h-11 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
              />
            </div>

            {/* Volume Slider */}
            <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                <span>VOLUME BAWAAN</span>
                <span className="font-mono text-settings-accent">{settings.backsound_volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.backsound_volume}
                onChange={(e) => updateData(prev => ({ ...prev, backsound_volume: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-settings-accent"
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
                ATAU UNGGAH FILE MP3 KUSTOM (.mp3)
              </label>
              <input
                type="file"
                accept="audio/mp3, audio/mpeg"
                onChange={(e) => handleFileChange(e, 'backsound')}
                className="hidden"
                id="upload-backsound-audio-file"
              />
              <label
                htmlFor="upload-backsound-audio-file"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
              >
                <Upload className="w-4 h-4" />
                <span>{backsoundFile ? `Berkas: ${backsoundFile.name.substring(0, 20)}...` : 'Pilih File Audio MP3'}</span>
              </label>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
