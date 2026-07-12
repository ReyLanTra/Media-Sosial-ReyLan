'use client';

import * as React from 'react';
import { useSettingsDraft } from '@/hooks/useSettingsDraft';
import { 
  updateSettings, 
  addBgImage, 
  deleteBgImage, 
  addTrack, 
  deleteTrack, 
  reorderTracks,
  reorderBgImages,
  updateBgImage,
  updateMusicTrackAction
} from '@/app/actions';
import { SiteSettings, BackgroundImage, MusicTrack } from '@/lib/db';
import { handleUpload } from '@/lib/supabase';
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
  Timer,
  Edit2,
  ChevronDown
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
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
function SortableMusicItem({ 
  track, 
  onDelete, 
  onUpdateTitle 
}: { 
  track: MusicTrack; 
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
}) {
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
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-300 transition-colors touch-none">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <input 
          type="text"
          value={track.title || ''}
          onChange={(e) => onUpdateTitle(track.id, e.target.value)}
          placeholder="Judul Lagu..."
          className="w-full bg-transparent border-none p-0 text-xs font-semibold text-slate-200 focus:ring-0 placeholder:text-slate-600"
        />
        <p className="text-[9px] text-slate-500 truncate">{track.audio_url.startsWith('blob:') ? 'File Baru (Belum Diunggah)' : track.audio_url.split('/').pop()}</p>
      </div>
      <button 
        onClick={() => onDelete(track.id)}
        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Komponen Item Gambar yang bisa di-drag
function SortableBgItem({ 
  img, 
  device,
  onDelete, 
  onReplace 
}: { 
  img: BackgroundImage; 
  device: 'mobile' | 'desktop';
  onDelete: (id: string) => void;
  onReplace: (id: string, file: File) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`relative aspect-[9/16] ${device === 'desktop' ? 'aspect-video' : 'aspect-[9/16]'} rounded-lg overflow-hidden border group bg-black/20 transition-colors
        ${isDragging ? 'shadow-xl shadow-black/50 border-settings-accent/50 opacity-80' : 'border-white/10'}
      `}
    >
      <img src={img.image_url} alt="Bg Item" className="w-full h-full object-cover" />
      
      {/* Drag Handle Pojok Kiri Atas (Permanen untuk Mobile) */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-1 left-1 p-1.5 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-white/80 cursor-grab active:cursor-grabbing flex items-center justify-center transition-transform hover:scale-105 active:scale-95 touch-none z-10"
        title="Geser untuk mengatur urutan"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Action Buttons Pojok Kanan Atas (Permanen untuk Mobile) */}
      <div className="absolute top-1 right-1 flex gap-1 z-10">
        <label className="p-1.5 rounded-full bg-blue-600/90 text-white cursor-pointer hover:bg-blue-500 transition-colors shadow-md flex items-center justify-center active:scale-95">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(img.id, file);
            }} 
          />
          <Edit2 className="w-3 h-3" />
        </label>
        <button 
          onClick={() => onDelete(img.id)}
          className="p-1.5 rounded-full bg-red-600/90 text-white hover:bg-red-500 transition-colors shadow-md flex items-center justify-center active:scale-95"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
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

  // Draft Management for Files
  const [newMobileFiles, setNewMobileFiles] = React.useState<{ [id: string]: File }>({});
  const [newDesktopFiles, setNewDesktopFiles] = React.useState<{ [id: string]: File }>({});
  const [newMusicFiles, setNewMusicFiles] = React.useState<{ [id: string]: File }>({});
  const [newAnimMobileFile, setNewAnimMobileFile] = React.useState<File | null>(null);
  const [newAnimDesktopFile, setNewAnimDesktopFile] = React.useState<File | null>(null);
  
  const [deletedMobileIds, setDeletedMobileIds] = React.useState<string[]>([]);
  const [deletedDesktopIds, setDeletedDesktopIds] = React.useState<string[]>([]);
  const [deletedTrackIds, setDeletedTrackIds] = React.useState<string[]>([]);

  // Local storage URLs for cleanup
  const localUrls = React.useRef<string[]>([]);
  const addToCleanup = (url: string) => {
    if (url.startsWith('blob:')) localUrls.current.push(url);
  };

  React.useEffect(() => {
    return () => {
      localUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragTarget, setDragTarget] = React.useState<'mobile' | 'desktop' | 'music' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const {
    data: settings,
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty: isSettingsDirty,
    isSaving,
    error,
    reset: resetDraft,
    save: saveDraft,
  } = useSettingsDraft<SiteSettings>(initialSettings, async (currentData) => {
    try {
      // 1. Proses Upload Animasi Mobile jika ada
      let finalMobileUrl = currentData.background_url;
      let finalMobileType = currentData.background_type;
      if (newAnimMobileFile) {
        try {
          finalMobileUrl = await handleUpload(newAnimMobileFile, 'background', 'anim');
          const ext = newAnimMobileFile.name.split('.').pop()?.toLowerCase();
          finalMobileType = ext === 'mp4' ? 'video' : 'image';
        } catch (uploadErr: any) {
          throw new Error(`Gagal mengunggah file animasi mobile ke storage: ${uploadErr.message}`);
        }
      }

      // 2. Proses Upload Animasi Desktop jika ada
      let finalDesktopUrl = currentData.desktop_background_url;
      let finalDesktopType = currentData.desktop_background_type;
      if (newAnimDesktopFile) {
        try {
          finalDesktopUrl = await handleUpload(newAnimDesktopFile, 'background-desktop', 'anim');
          const ext = newAnimDesktopFile.name.split('.').pop()?.toLowerCase();
          finalDesktopType = ext === 'mp4' ? 'video' : 'image';
        } catch (uploadErr: any) {
          throw new Error(`Gagal mengunggah file animasi desktop ke storage: ${uploadErr.message}`);
        }
      }

      // 3. Simpan Settings Utama
      const settingsResult = await updateSettings({
        ...currentData,
        background_url: finalMobileUrl,
        background_type: finalMobileType,
        desktop_background_url: finalDesktopUrl,
        desktop_background_type: finalDesktopType,
        updated_at: new Date().toISOString(),
      });
      if (!settingsResult.success) {
        throw new Error(`Gagal memperbarui pengaturan latar utama di database: ${settingsResult.error}`);
      }

      // 4. Proses Background Mobile
      for (const id of deletedMobileIds) {
        const img = initialMobileBgImages.find(i => i.id === id);
        if (img) {
          const delRes = await deleteBgImage(id, img.image_url, 'mobile');
          if (!delRes.success) {
            throw new Error(`Gagal menghapus gambar latar mobile lama di database/storage: ${delRes.error}`);
          }
        }
      }
      const finalMobileImgs = [];
      for (let i = 0; i < mobileBgImages.length; i++) {
        const img = mobileBgImages[i];
        let finalUrl = img.image_url;
        if (newMobileFiles[img.id]) {
          try {
            finalUrl = await handleUpload(newMobileFiles[img.id], 'background', (i + 1).toString());
          } catch (uploadErr: any) {
            throw new Error(`Gagal mengunggah gambar latar mobile baru ke storage: ${uploadErr.message}`);
          }
        }
        
        if (img.id.startsWith('new-') || newMobileFiles[img.id]) {
          const result = await addBgImage({ device_type: 'mobile', image_url: finalUrl, display_order: i });
          if (!result.success) {
            throw new Error(`Gagal menyimpan data gambar latar mobile baru ke database: ${result.error}`);
          }
          finalMobileImgs.push(result.data!);
        } else {
          const result = await updateBgImage(img.id, { display_order: i, image_url: finalUrl });
          if (!result.success) {
            throw new Error(`Gagal memperbarui urutan gambar latar mobile di database: ${result.error}`);
          }
          finalMobileImgs.push(result.data!);
        }
      }

      // 5. Proses Background Desktop
      for (const id of deletedDesktopIds) {
        const img = initialDesktopBgImages.find(i => i.id === id);
        if (img) {
          const delRes = await deleteBgImage(id, img.image_url, 'desktop');
          if (!delRes.success) {
            throw new Error(`Gagal menghapus gambar latar desktop lama di database/storage: ${delRes.error}`);
          }
        }
      }
      const finalDesktopImgs = [];
      for (let i = 0; i < desktopBgImages.length; i++) {
        const img = desktopBgImages[i];
        let finalUrl = img.image_url;
        if (newDesktopFiles[img.id]) {
          try {
            finalUrl = await handleUpload(newDesktopFiles[img.id], 'background-desktop', (i + 1).toString());
          } catch (uploadErr: any) {
            throw new Error(`Gagal mengunggah gambar latar desktop baru ke storage: ${uploadErr.message}`);
          }
        }

        if (img.id.startsWith('new-') || newDesktopFiles[img.id]) {
          const result = await addBgImage({ device_type: 'desktop', image_url: finalUrl, display_order: i });
          if (!result.success) {
            throw new Error(`Gagal menyimpan data gambar latar desktop baru ke database: ${result.error}`);
          }
          finalDesktopImgs.push(result.data!);
        } else {
          const result = await updateBgImage(img.id, { display_order: i, image_url: finalUrl });
          if (!result.success) {
            throw new Error(`Gagal memperbarui urutan gambar latar desktop di database: ${result.error}`);
          }
          finalDesktopImgs.push(result.data!);
        }
      }

      // 6. Proses Music Tracks
      for (const id of deletedTrackIds) {
        const track = initialTracks.find(t => t.id === id);
        if (track) {
          const delRes = await deleteTrack(id, track.audio_url);
          if (!delRes.success) {
            throw new Error(`Gagal menghapus file musik/lagu lama di database/storage: ${delRes.error}`);
          }
        }
      }
      const finalTracks = [];
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        let finalUrl = track.audio_url;
        if (newMusicFiles[track.id]) {
          try {
            finalUrl = await handleUpload(newMusicFiles[track.id], 'backsound', (i + 1).toString());
          } catch (uploadErr: any) {
            throw new Error(`Gagal mengunggah file lagu baru "${track.title}" ke storage: ${uploadErr.message}`);
          }
        }

        if (track.id.startsWith('new-')) {
          const result = await addTrack({ title: track.title, audio_url: finalUrl, display_order: i });
          if (!result.success) {
            throw new Error(`Gagal menyimpan data lagu baru "${track.title}" ke database: ${result.error}`);
          }
          finalTracks.push(result.data!);
        } else {
          const result = await updateMusicTrackAction(track.id, { title: track.title, display_order: i, audio_url: finalUrl });
          if (!result.success) {
            throw new Error(`Gagal memperbarui judul/urutan lagu "${track.title}" di database: ${result.error}`);
          }
          finalTracks.push(result.data!);
        }
      }

      // Cleanup & Refresh
      setMobileBgImages(finalMobileImgs);
      setDesktopBgImages(finalDesktopImgs);
      setTracks(finalTracks);
      setNewMobileFiles({});
      setNewDesktopFiles({});
      setNewMusicFiles({});
      setDeletedMobileIds([]);
      setDeletedDesktopIds([]);
      setDeletedTrackIds([]);
      setNewAnimMobileFile(null);
      setNewAnimDesktopFile(null);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menyimpan perubahan: ${err.message || 'Terjadi kesalahan sistem'}`);
      throw err;
    }
  });

  // --- DRAG & DROP LOGIC ---

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setIsDragging(true);
    if (tracks.some(t => t.id === active.id)) setDragTarget('music');
    else if (mobileBgImages.some(m => m.id === active.id)) setDragTarget('mobile');
    else if (desktopBgImages.some(d => d.id === active.id)) setDragTarget('desktop');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setDragTarget(null);

    if (over && active.id !== over.id) {
      if (dragTarget === 'music') {
        setTracks((prev) => {
          const oldIdx = prev.findIndex(t => t.id === active.id);
          const newIdx = prev.findIndex(t => t.id === over.id);
          return arrayMove(prev, oldIdx, newIdx);
        });
      } else if (dragTarget === 'mobile') {
        setMobileBgImages((prev) => {
          const oldIdx = prev.findIndex(m => m.id === active.id);
          const newIdx = prev.findIndex(m => m.id === over.id);
          return arrayMove(prev, oldIdx, newIdx);
        });
      } else if (dragTarget === 'desktop') {
        setDesktopBgImages((prev) => {
          const oldIdx = prev.findIndex(d => d.id === active.id);
          const newIdx = prev.findIndex(d => d.id === over.id);
          return arrayMove(prev, oldIdx, newIdx);
        });
      }
    }
  };

  const isListDirty = 
    deletedMobileIds.length > 0 || 
    deletedDesktopIds.length > 0 || 
    deletedTrackIds.length > 0 ||
    Object.keys(newMobileFiles).length > 0 ||
    Object.keys(newDesktopFiles).length > 0 ||
    Object.keys(newMusicFiles).length > 0 ||
    newAnimMobileFile !== null ||
    newAnimDesktopFile !== null ||
    JSON.stringify(mobileBgImages.map(m => m.id)) !== JSON.stringify(initialMobileBgImages.map(m => m.id)) ||
    JSON.stringify(desktopBgImages.map(d => d.id)) !== JSON.stringify(initialDesktopBgImages.map(d => d.id)) ||
    JSON.stringify(tracks.map(t => t.id)) !== JSON.stringify(initialTracks.map(t => t.id)) ||
    tracks.some((t, i) => t.title !== initialTracks.find(it => it.id === t.id)?.title);

  const isDirty = isSettingsDirty || isListDirty;

  // --- HANDLERS MEDIA (DRAFT MODE) ---

  const handleMobileBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAnim = ext === 'gif' || ext === 'mp4';
    const localUrl = URL.createObjectURL(file);
    addToCleanup(localUrl);

    if (isAnim) {
      setNewAnimMobileFile(file);
      updateData(prev => ({ 
        ...prev, 
        background_url: localUrl, 
        background_type: ext === 'mp4' ? 'video' : 'image' 
      }));
    } else {
      const newId = `new-m-${Date.now()}`;
      const newImg: BackgroundImage = {
        id: newId,
        device_type: 'mobile',
        image_url: localUrl,
        display_order: mobileBgImages.length
      };
      setNewMobileFiles(prev => ({ ...prev, [newId]: file }));
      setMobileBgImages([...mobileBgImages, newImg]);
      if (settings.background_type !== 'image') {
        updateData(prev => ({ ...prev, background_type: 'image' }));
      }
    }
    e.target.value = '';
  };

  const handleDesktopBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const isAnim = ext === 'gif' || ext === 'mp4';
    const localUrl = URL.createObjectURL(file);
    addToCleanup(localUrl);

    if (isAnim) {
      setNewAnimDesktopFile(file);
      updateData(prev => ({ 
        ...prev, 
        desktop_background_url: localUrl, 
        desktop_background_type: ext === 'mp4' ? 'video' : 'image' 
      }));
    } else {
      const newId = `new-d-${Date.now()}`;
      const newImg: BackgroundImage = {
        id: newId,
        device_type: 'desktop',
        image_url: localUrl,
        display_order: desktopBgImages.length
      };
      setNewDesktopFiles(prev => ({ ...prev, [newId]: file }));
      setDesktopBgImages([...desktopBgImages, newImg]);
      if (settings.desktop_background_type !== 'image') {
        updateData(prev => ({ ...prev, desktop_background_type: 'image' }));
      }
    }
    e.target.value = '';
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    addToCleanup(localUrl);
    const newId = `new-s-${Date.now()}`;
    const newTrack: MusicTrack = {
      id: newId,
      title: file.name.replace(/\.[^/.]+$/, ""),
      audio_url: localUrl,
      display_order: tracks.length
    };
    setNewMusicFiles(prev => ({ ...prev, [newId]: file }));
    setTracks([...tracks, newTrack]);
    e.target.value = '';
  };

  const handleReplaceBg = (id: string, file: File, device: 'mobile' | 'desktop') => {
    const localUrl = URL.createObjectURL(file);
    addToCleanup(localUrl);
    if (device === 'mobile') {
      setNewMobileFiles(prev => ({ ...prev, [id]: file }));
      setMobileBgImages(prev => prev.map(img => img.id === id ? { ...img, image_url: localUrl } : img));
    } else {
      setNewDesktopFiles(prev => ({ ...prev, [id]: file }));
      setDesktopBgImages(prev => prev.map(img => img.id === id ? { ...img, image_url: localUrl } : img));
    }
  };

  const handleDeleteBg = (id: string, device: 'mobile' | 'desktop') => {
    if (device === 'mobile') {
      setMobileBgImages(prev => prev.filter(img => img.id !== id));
      if (!id.startsWith('new-')) setDeletedMobileIds(prev => [...prev, id]);
      setNewMobileFiles(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setDesktopBgImages(prev => prev.filter(img => img.id !== id));
      if (!id.startsWith('new-')) setDeletedDesktopIds(prev => [...prev, id]);
      setNewDesktopFiles(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDeleteTrack = (id: string) => {
    setTracks(prev => prev.filter(t => t.id !== id));
    if (!id.startsWith('new-')) setDeletedTrackIds(prev => [...prev, id]);
    setNewMusicFiles(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleUpdateTrackTitle = (id: string, title: string) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  };

  const resetAll = () => {
    resetDraft();
    setMobileBgImages(initialMobileBgImages);
    setDesktopBgImages(initialDesktopBgImages);
    setTracks(initialTracks);
    setNewMobileFiles({});
    setNewDesktopFiles({});
    setNewMusicFiles({});
    setNewAnimMobileFile(null);
    setNewAnimDesktopFile(null);
    setDeletedMobileIds([]);
    setDeletedDesktopIds([]);
    setDeletedTrackIds([]);
    localUrls.current.forEach(url => URL.revokeObjectURL(url));
    localUrls.current = [];
  };

  // --- DRAG & DROP LOGIC ---

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
            onClick={resetAll}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
                <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>ANIMASI TRANSISI MOBILE</span>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={settings.mobile_bg_transition}
                    onChange={(e) => updateData(prev => ({ ...prev, mobile_bg_transition: e.target.value as any }))}
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 appearance-none focus:ring-1 focus:ring-settings-accent/50 outline-none"
                  >
                    <option value="fade">Fade (Memudar)</option>
                    <option value="slide">Slide (Geser)</option>
                    <option value="zoom">Zoom (Pembesaran)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Gallery Mobile */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={mobileBgImages.map(m => m.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {mobileBgImages.map((img) => (
                    <SortableBgItem 
                      key={img.id} 
                      img={img} 
                      device="mobile"
                      onDelete={(id) => handleDeleteBg(id, 'mobile')}
                      onReplace={(id, file) => handleReplaceBg(id, file, 'mobile')}
                    />
                  ))}
                  <label className={`flex flex-col items-center justify-center aspect-[9/16] rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/5 cursor-pointer transition-all hover:bg-white/10 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" onChange={handleMobileBgUpload} className="hidden" />
                    <Plus className="w-5 h-5 text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tighter text-center px-1">Tambah Gambar</span>
                  </label>
                </div>
              </SortableContext>
            </DndContext>

            {/* Preview Animated Mobile */}
            {(settings.background_type === 'gif' || settings.background_type === 'video') && settings.background_url && (
              <div className="space-y-2 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex justify-between items-center text-[10px] font-mono text-blue-400 uppercase tracking-wider">
                  <span>ANIMASI MOBILE AKTIF ({settings.background_type})</span>
                  <button onClick={() => updateData(prev => ({ ...prev, background_url: null, background_type: 'image' }))} className="text-red-400 hover:text-red-300">HAPUS</button>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40">
                  {settings.background_type === 'video' ? (
                    <video src={settings.background_url} autoPlay muted loop className="w-full h-full object-cover" />
                  ) : (
                    <img src={settings.background_url} alt="Mobile Anim" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* DESKTOP BACKGROUND SECTION */}
          <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-slate-300">Background Desktop</h3>
              </div>
              <Sliders className="w-4 h-4 text-slate-500" />
            </div>

            <p className="text-[10px] text-slate-400 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
              <Info className="w-3.5 h-3.5 text-emerald-400 inline-block mr-1.5" />
              Gunakan rasio <strong>16:9</strong>. PNG akan masuk ke <strong>Slideshow</strong>. GIF/MP4 akan menjadi <strong>Background Tunggal</strong>.
            </p>

            {/* Slideshow Interval Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="space-y-2 p-4 rounded-xl border border-white/5 bg-black/10">
                <div className="flex justify-between items-center text-xs text-slate-300 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>ANIMASI TRANSISI DESKTOP</span>
                  </div>
                </div>
                <div className="relative">
                  <select
                    value={settings.desktop_bg_transition}
                    onChange={(e) => updateData(prev => ({ ...prev, desktop_bg_transition: e.target.value as any }))}
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg py-2 px-3 text-xs text-slate-200 appearance-none focus:ring-1 focus:ring-settings-accent/50 outline-none"
                  >
                    <option value="fade">Fade (Memudar)</option>
                    <option value="slide">Slide (Geser)</option>
                    <option value="zoom">Zoom (Pembesaran)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-3 h-3 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Gallery Desktop */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={desktopBgImages.map(d => d.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 gap-3">
                  {desktopBgImages.map((img) => (
                    <SortableBgItem 
                      key={img.id} 
                      img={img} 
                      device="desktop"
                      onDelete={(id) => handleDeleteBg(id, 'desktop')}
                      onReplace={(id, file) => handleReplaceBg(id, file, 'desktop')}
                    />
                  ))}
                  <label className={`flex flex-col items-center justify-center aspect-video rounded-lg border border-dashed border-white/20 hover:border-white/40 bg-white/5 cursor-pointer transition-all hover:bg-white/10 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" accept="image/*" onChange={handleDesktopBgUpload} className="hidden" />
                    <Plus className="w-5 h-5 text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-tighter">Tambah Desktop PNG</span>
                  </label>
                </div>
              </SortableContext>
            </DndContext>

            {/* Preview Animated Desktop */}
            {(settings.desktop_background_type === 'gif' || settings.desktop_background_type === 'video') && settings.desktop_background_url && (
              <div className="space-y-2 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                  <span>ANIMASI DESKTOP AKTIF ({settings.desktop_background_type})</span>
                  <button onClick={() => updateData(prev => ({ ...prev, desktop_background_url: null, desktop_background_type: 'image' }))} className="text-red-400 hover:text-red-300">HAPUS</button>
                </div>
                <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40">
                  {settings.desktop_background_type === 'video' ? (
                    <video src={settings.desktop_background_url} autoPlay muted loop className="w-full h-full object-cover" />
                  ) : (
                    <img src={settings.desktop_background_url} alt="Desktop Anim" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
            )}
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
                <label className={`text-[10px] flex items-center gap-1 font-bold text-blue-400 cursor-pointer hover:text-blue-300 transition-colors ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="audio/mpeg" onChange={handleMusicUpload} className="hidden" />
                  <Plus className="w-3 h-3" />
                  <span>TAMBAH MP3</span>
                </label>
              </div>

              {isSaving && Object.keys(newMusicFiles).length > 0 && (
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
                          onUpdateTitle={handleUpdateTrackTitle}
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
