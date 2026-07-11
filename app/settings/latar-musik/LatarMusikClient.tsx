'use client';

import * as React from 'react';
import { useSettingsDraft } from '@/hooks/useSettingsDraft';
import { 
  updateSettings, 
  addBgImage, 
  deleteBgImage, 
  addTrack, 
  deleteTrack, 
  reorderTracks 
} from '@/app/actions';
import { SiteSettings, BackgroundImage, MusicTrack } from '@/lib/db';
import { 
  Upload, 
  RotateCcw, 
  RotateCw, 
  Check, 
  X, 
  Sliders, 
  Music, 
  Info,
  CheckCircle,
  Plus,
  Trash2,
  GripVertical,
  Monitor,
  Smartphone,
  Timer
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LatarMusikClientProps {
  initialSettings: SiteSettings;
  initialMobileBgImages: BackgroundImage[];
  initialDesktopBgImages: BackgroundImage[];
  initialTracks: MusicTrack[];
}

// Komponen Item Musik yang bisa di-drag
function SortableMusicItem({ track, onDelete }: { track: MusicTrack; onDelete: (id: string, url: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/20 ${isDragging ? 'shadow-xl shadow-black/50 border-settings-accent/50 opacity-80' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-200 truncate">{track.title || 'Tanpa Judul'}</p>
        <p className="text-[9px] text-slate-500 truncate">{track.audio_url.split('/').pop()}</p>
      </div>
      <button 
        onClick={() => onDelete(track.id, track.audio_url)}
        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function LatarMusikClient({ 
  initialSettings, 
  initialMobileBgImages, 
  initialDesktopBgImages, 
  initialTracks 
}: LatarMusikClientProps) {
  // Database States
  const [mobileBgImages, setMobileBgImages] = React.useState<BackgroundImage[]>(initialMobileBgImages);
  const [desktopBgImages, setDesktopBgImages] = React.useState<BackgroundImage[]>(initialDesktopBgImages);
  const [tracks, setTracks] = React.useState<MusicTrack[]>(initialTracks);

  // Upload Loading States
  const [uploadingMobile, setUploadingMobile] = React.useState(false);
  const [uploadingDesktop, setUploadingDesktop] = React.useState(false);
  const [uploadingMusic, setUploadingMusic] = React.useState(false);

  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  // Scroll lock effect
  React.useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }, [isDragging]);

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
    // Simpan pengaturan interval dan toggle ke database
    await updateSettings({
      background_type: currentData.background_type,
      background_url: currentData.background_url,
      backsound_url: currentData.backsound_url,
      backsound_volume: currentData.backsound_volume,
      backsound_enabled: currentData.backsound_enabled,
      mobile_bg_slideshow_interval: currentData.mobile_bg_slideshow_interval,
      desktop_bg_slideshow_interval: currentData.desktop_bg_slideshow_interval,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  });

  // --- HANDLERS MEDIA ---

  const handleMobileBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMobile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'background');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.error || 'Gagal mengunggah gambar.');

      const newImg = await addBgImage({
        device_type: 'mobile',
        image_url: resData.url,
        display_order: mobileBgImages.length
      });
      setMobileBgImages([...mobileBgImages, newImg]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingMobile(false);
    }
  };

  const handleDesktopBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe PNG
    if (file.type !== 'image/png') {
      alert('Gagal: Latar belakang desktop harus berformat PNG.');
      return;
    }

    // Validasi Rasio 16:9
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const ratio = img.width / img.height;
      const targetRatio = 16 / 9;
      const tolerance = 0.05; // toleransi 5%

      if (Math.abs(ratio - targetRatio) > tolerance) {
        alert(`Gagal: Rasio gambar harus 16:9 (lebar: ${img.width}, tinggi: ${img.height}, rasio: ${ratio.toFixed(2)}). Rasio yang diunggah tidak mendekati 1.78.`);
        return;
      }

      setUploadingDesktop(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'background-desktop');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const resData = await res.json();
        if (!res.ok || !resData.success) throw new Error(resData.error || 'Gagal mengunggah gambar.');

        const newImg = await addBgImage({
          device_type: 'desktop',
          image_url: resData.url,
          display_order: desktopBgImages.length
        });
        setDesktopBgImages([...desktopBgImages, newImg]);
      } catch (err: any) {
        alert(err.message);
      } finally {
        setUploadingDesktop(false);
      }
    };
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMusic(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'backsound');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.error || 'Gagal mengunggah musik.');

      const newTrack = await addTrack({
        title: file.name.replace(/\.[^/.]+$/, ""), // Ambil nama file tanpa ekstensi
        audio_url: resData.url,
        display_order: tracks.length
      });
      setTracks([...tracks, newTrack]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleDeleteBg = async (id: string, url: string, device: 'mobile' | 'desktop') => {
    if (!confirm('Hapus gambar ini?')) return;
    try {
      await deleteBgImage(id, url, device);
      if (device === 'mobile') {
        setMobileBgImages(mobileBgImages.filter(img => img.id !== id));
      } else {
        setDesktopBgImages(desktopBgImages.filter(img => img.id !== id));
      }
    } catch (err: any) {
      alert('Gagal menghapus gambar.');
    }
  };

  const handleDeleteTrack = async (id: string, url: string) => {
    if (!confirm('Hapus lagu dari playlist?')) return;
    try {
      await deleteTrack(id, url);
      setTracks(tracks.filter(t => t.id !== id));
    } catch (err: any) {
      alert('Gagal menghapus lagu.');
    }
  };

  // --- DRAG & DROP LOGIC ---

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);

    if (over && active.id !== over.id) {
      const oldIndex = tracks.findIndex(t => t.id === active.id);
      const newIndex = tracks.findIndex(t => t.id === over.id);

      const newTracks = arrayMove(tracks, oldIndex, newIndex);
      setTracks(newTracks);

      // Update urutan di database
      const updates = newTracks.map((t, i) => ({ id: t.id, display_order: i }));
      await reorderTracks(updates);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
      
      {/* HEADER DENGAN STATUS DRAFT & RIWAYAT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Latar & Musik
            {isDirty && (
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono py-1 px-2.5 rounded-full animate-pulse">
                Draf Belum Disimpan
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ubah latar belakang (Slideshow, Video) dan playlist musik pengiring halaman profil utama Anda.
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
            onClick={saveDraft}
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

      {/* BODY CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: BACKGROUND SETTINGS */}
        <div className="space-y-6">
          {/* MOBILE BACKGROUND SECTION */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <h3 className="font-semibold text-sm text-slate-300">Background Mobile (Slideshow)</h3>
              </div>
              <Sliders className="w-4 h-4 text-slate-500" />
            </div>

            {/* Slideshow Interval Mobile */}
            <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>INTERVAL SLIDESHOW (DETIK)</span>
                </div>
                <span className="font-mono text-settings-accent">{settings.mobile_bg_slideshow_interval}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.mobile_bg_slideshow_interval}
                onChange={(e) => updateData(prev => ({ ...prev, mobile_bg_slideshow_interval: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-settings-accent"
              />
            </div>

            {/* Gallery Mobile */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {mobileBgImages.map((img) => (
                <div key={img.id} className="relative aspect-[9/16] rounded-lg overflow-hidden border border-white/10 group bg-black/20">
                  <img src={img.image_url} alt="Mobile Bg" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleDeleteBg(img.id, img.image_url, 'mobile')}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className={`flex flex-col items-center justify-center aspect-[9/16] rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/5 cursor-pointer transition-all hover:bg-white/10 ${uploadingMobile ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*" onChange={handleMobileBgUpload} className="hidden" />
                {uploadingMobile ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tighter text-center px-1">Tambah Gambar</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* DESKTOP BACKGROUND SECTION */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-slate-300">Background Desktop (16:9 PNG)</h3>
              </div>
              <Sliders className="w-4 h-4 text-slate-500" />
            </div>

            <p className="text-[10px] text-slate-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
              <Info className="w-3.5 h-3.5 text-amber-400 inline-block mr-1.5" />
              Format wajib <strong>PNG</strong> dengan rasio <strong>16:9</strong>. Sistem akan menolak gambar dengan rasio berbeda.
            </p>

            {/* Slideshow Interval Desktop */}
            <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>INTERVAL SLIDESHOW (DETIK)</span>
                </div>
                <span className="font-mono text-settings-accent">{settings.desktop_bg_slideshow_interval}s</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.desktop_bg_slideshow_interval}
                onChange={(e) => updateData(prev => ({ ...prev, desktop_bg_slideshow_interval: parseInt(e.target.value) }))}
                className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-settings-accent"
              />
            </div>

            {/* Gallery Desktop */}
            <div className="grid grid-cols-2 gap-3">
              {desktopBgImages.map((img) => (
                <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group bg-black/20">
                  <img src={img.image_url} alt="Desktop Bg" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleDeleteBg(img.id, img.image_url, 'desktop')}
                    className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className={`flex flex-col items-center justify-center aspect-video rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/5 cursor-pointer transition-all hover:bg-white/10 ${uploadingDesktop ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/png" onChange={handleDesktopBgUpload} className="hidden" />
                {uploadingDesktop ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">Tambah Desktop PNG</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MUSIC SETTINGS */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-semibold text-sm text-slate-300">Playlist Musik Latar</h3>
              <Music className="w-4 h-4 text-slate-500" />
            </div>

            {/* Backsound Global Toggle */}
            <div className="flex items-center h-12 px-4 rounded-xl border border-white/10 bg-neutral-950">
              <label className="flex items-center gap-3 cursor-pointer w-full justify-between">
                <span className="text-xs font-semibold text-slate-300">Aktifkan Playlist Musik</span>
                <input
                  type="checkbox"
                  checked={settings.backsound_enabled}
                  onChange={(e) => updateData(prev => ({ ...prev, backsound_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded accent-settings-accent cursor-pointer"
                />
              </label>
            </div>

            {/* Volume Slider */}
            <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
              <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                <span>VOLUME GLOBAL PLAYLIST</span>
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
            </div>

            {/* Track List with DND */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">DAFTAR PUTAR (URUTKAN)</label>
                <label className={`text-[10px] flex items-center gap-1 font-bold text-blue-400 cursor-pointer hover:text-blue-300 transition-colors ${uploadingMusic ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="audio/mpeg" onChange={handleMusicUpload} className="hidden" />
                  <Plus className="w-3 h-3" />
                  <span>TAMBAH MP3</span>
                </label>
              </div>

              {uploadingMusic && (
                <div className="p-3 rounded-xl border border-dashed border-blue-500/20 bg-blue-500/5 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Mengunggah Musik...</span>
                </div>
              )}

              {tracks.length === 0 ? (
                <div className="py-12 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-40">
                  <Music className="w-8 h-8 text-slate-600" />
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Playlist Kosong</p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={tracks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {tracks.map((track) => (
                        <SortableMusicItem 
                          key={track.id} 
                          track={track} 
                          onDelete={handleDeleteTrack} 
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <p className="text-[9px] text-slate-500 leading-relaxed px-1">
              *Tarik ikon pegangan (grip) untuk mengatur urutan putar. Lagu akan diputar secara berurutan dan otomatis mengulang ke awal setelah lagu terakhir selesai.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
