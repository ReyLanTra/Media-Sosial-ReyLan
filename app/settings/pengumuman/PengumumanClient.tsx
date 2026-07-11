'use client';

import * as React from 'react';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Upload, 
  X, 
  Megaphone, 
  Eye, 
  EyeOff,
  Image as ImageIcon,
  Video as VideoIcon,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Announcement } from '@/lib/db';
import { 
  createAnnouncement, 
  updateAnnouncementAction, 
  removeAnnouncement 
} from '@/app/actions';
import { handleUpload } from '@/lib/supabase';

interface PengumumanClientProps {
  initialAnnouncements: Announcement[];
}

interface AnnouncementDraft extends Partial<Announcement> {
  id: string;
  isNew?: boolean;
  tempPhotoFile?: File;
  tempMediaFile?: File;
  previewUrl?: string;
}

export default function PengumumanClient({ initialAnnouncements }: PengumumanClientProps) {
  const [announcements, setAnnouncements] = React.useState<AnnouncementDraft[]>(
    initialAnnouncements.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdd = () => {
    const newId = `new-${Date.now()}`;
    const newAnnouncement: AnnouncementDraft = {
      id: newId,
      title: 'Pengumuman Baru',
      content: 'Isi pengumuman Anda di sini...',
      is_active: true,
      display_order: announcements.length,
      isNew: true,
    };
    setAnnouncements([...announcements, newAnnouncement]);
  };

  const handleRemove = async (id: string) => {
    const item = announcements.find(a => a.id === id);
    if (!item) return;

    if (item.isNew) {
      setAnnouncements(announcements.filter(a => a.id !== id));
      return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;

    try {
      await removeAnnouncement(id, item.photo_url || undefined, item.media_url || undefined);
      setAnnouncements(announcements.filter(a => a.id !== id));
      showNotify('success', 'Pengumuman berhasil dihapus.');
    } catch (error) {
      showNotify('error', 'Gagal menghapus pengumuman.');
    }
  };

  const handleFileChange = (id: string, type: 'photo' | 'media', file: File | null) => {
    if (!file) return;
    
    const previewUrl = URL.createObjectURL(file);
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          [type === 'photo' ? 'tempPhotoFile' : 'tempMediaFile']: file,
          previewUrl: previewUrl
        };
      }
      return a;
    }));
  };

  const handleUpdateField = (id: string, field: keyof AnnouncementDraft, value: any) => {
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setAnnouncements((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, idx) => ({ ...item, display_order: idx }));
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const item of announcements) {
        let finalPhotoUrl = item.photo_url;
        let finalMediaUrl = item.media_url;

        // Upload files if present
        if (item.tempPhotoFile) {
          finalPhotoUrl = await handleUpload(item.tempPhotoFile, 'pengumuman-foto');
        }
        if (item.tempMediaFile) {
          finalMediaUrl = await handleUpload(item.tempMediaFile, 'pengumuman-media');
        }

        const data: any = {
          title: item.title,
          content: item.content,
          is_active: item.is_active,
          display_order: item.display_order,
          photo_url: finalPhotoUrl,
          media_url: finalMediaUrl,
          cta_text: item.cta_text,
          cta_url: item.cta_url,
        };

        if (item.isNew) {
          await createAnnouncement(data);
        } else {
          await updateAnnouncementAction(item.id, data);
        }
      }
      showNotify('success', 'Semua perubahan pengumuman berhasil disimpan.');
      // Refresh list to remove 'isNew' and 'temp' flags
      window.location.reload();
    } catch (error) {
      console.error(error);
      showNotify('error', 'Gagal menyimpan beberapa pengumuman.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl border ${
              notification.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center">
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengumuman
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-emerald-600/20"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan Perubahan
        </button>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={announcements} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {announcements.map((item) => (
              <SortableAnnouncementItem 
                key={item.id} 
                item={item} 
                onRemove={handleRemove}
                onUpdate={handleUpdateField}
                onFileChange={handleFileChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {announcements.length === 0 && (
        <div className="text-center py-12 rounded-3xl border-2 border-dashed border-white/5 bg-white/[0.02]">
          <Megaphone className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Belum ada pengumuman. Klik tombol &quot;Tambah&quot; untuk memulai.</p>
        </div>
      )}
    </div>
  );
}

function SortableAnnouncementItem({ 
  item, 
  onRemove, 
  onUpdate,
  onFileChange 
}: { 
  item: AnnouncementDraft; 
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: keyof AnnouncementDraft, value: any) => void;
  onFileChange: (id: string, type: 'photo' | 'media', file: File | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="group relative p-5 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl"
    >
      <div className="flex gap-6">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="shrink-0 pt-2 cursor-grab active:cursor-grabbing text-slate-600 hover:text-blue-400 transition-colors"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 space-y-1">
              <input 
                type="text" 
                value={item.title}
                onChange={(e) => onUpdate(item.id, 'title', e.target.value)}
                placeholder="Judul Pengumuman"
                className="w-full bg-transparent border-none p-0 text-lg font-bold text-white placeholder-slate-600 focus:ring-0"
              />
              <textarea 
                value={item.content}
                onChange={(e) => onUpdate(item.id, 'content', e.target.value)}
                placeholder="Tulis detail pengumuman di sini..."
                rows={2}
                className="w-full bg-transparent border-none p-0 text-sm text-slate-400 placeholder-slate-700 focus:ring-0 resize-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate(item.id, 'is_active', !item.is_active)}
                className={`p-2 rounded-xl border transition-all ${
                  item.is_active 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-800 border-white/10 text-slate-500'
                }`}
                title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              >
                {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onRemove(item.id)}
                className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Media Upload */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">MEDIA (FOTO/VIDEO)</label>
              <div className="flex items-start gap-4">
                <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 bg-black/20 overflow-hidden group/media shrink-0">
                  {(item.previewUrl || item.photo_url || item.media_url) ? (
                    item.media_url?.match(/\.(mp4|webm|ogg)$/) || item.tempMediaFile ? (
                      <video 
                        src={item.previewUrl || item.media_url || ''} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <img 
                        src={item.previewUrl || item.photo_url || item.media_url || ''} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                      <ImageIcon className="w-6 h-6 mb-1" />
                      <span className="text-[8px]">KOSONG</span>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <label className="cursor-pointer p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">
                      <Upload className="w-3.5 h-3.5 text-white" />
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        className="hidden" 
                        onChange={(e) => onFileChange(item.id, 'media', e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400">Teks Tombol (CTA)</label>
                    <input 
                      type="text" 
                      value={item.cta_text || ''}
                      onChange={(e) => onUpdate(item.id, 'cta_text', e.target.value)}
                      placeholder="Contoh: Daftar Sekarang"
                      className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white focus:border-blue-500/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400">Link Tujuan (URL)</label>
                    <div className="relative">
                      <input 
                        type="url" 
                        value={item.cta_url || ''}
                        onChange={(e) => onUpdate(item.id, 'cta_url', e.target.value)}
                        placeholder="https://..."
                        className="w-full pl-3 pr-8 py-2 rounded-xl bg-black/30 border border-white/10 text-xs text-white focus:border-blue-500/50 outline-none transition-all"
                      />
                      <ExternalLink className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Note/Tips */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-blue-300">Tips Pengumuman</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Gunakan foto/video berukuran 1:1 atau persegi untuk tampilan terbaik. Pengumuman akan muncul secara berurutan sesuai posisi di dashboard ini.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
