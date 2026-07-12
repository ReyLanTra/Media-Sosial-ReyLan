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
  Music as AudioIcon,
  ExternalLink,
  Info,
  Calendar,
  User as UserIcon,
  FileText
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
  tempAdminPhotoFile?: File;
  tempMediaFile?: File;
  previewAdminPhotoUrl?: string;
  previewMediaUrl?: string;
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
    if (announcements.length >= 5) {
      alert('Maksimal 5 pengumuman sekaligus.');
      return;
    }
    const newId = `new-${Date.now()}`;
    const newAnnouncement: AnnouncementDraft = {
      id: newId,
      admin_name: '',
      content_markdown: '',
      is_active: true,
      media_type: 'image',
      start_at: new Date().toISOString().slice(0, 16),
      end_at: null,
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
      await removeAnnouncement(id, item.admin_photo_url || undefined, item.media_url || undefined);
      setAnnouncements(announcements.filter(a => a.id !== id));
      showNotify('success', 'Pengumuman berhasil dihapus.');
    } catch (error) {
      showNotify('error', 'Gagal menghapus pengumuman.');
    }
  };

  const handleFileChange = (id: string, type: 'admin_photo' | 'media', file: File | null) => {
    if (!file) return;
    
    const previewUrl = URL.createObjectURL(file);
    setAnnouncements(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          [type === 'admin_photo' ? 'tempAdminPhotoFile' : 'tempMediaFile']: file,
          [type === 'admin_photo' ? 'previewAdminPhotoUrl' : 'previewMediaUrl']: previewUrl
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
        let finalAdminPhotoUrl = item.admin_photo_url || null;
        let finalMediaUrl = item.media_url || null;

        // Upload files if present
        if (item.tempAdminPhotoFile) {
          finalAdminPhotoUrl = await handleUpload(item.tempAdminPhotoFile, 'pengumuman-foto');
        }
        if (item.tempMediaFile) {
          finalMediaUrl = await handleUpload(item.tempMediaFile, 'pengumuman-media');
        }

        const data: any = {
          admin_name: item.admin_name || 'Admin',
          admin_photo_url: finalAdminPhotoUrl,
          content_markdown: item.content_markdown || '',
          media_url: finalMediaUrl,
          media_type: item.media_type || 'image',
          start_at: item.start_at || new Date().toISOString(),
          end_at: item.end_at || null,
          is_active: item.is_active,
          display_order: item.display_order,
        };

        if (item.isNew) {
          await createAnnouncement(data);
        } else {
          await updateAnnouncementAction(item.id, data);
        }
      }
      showNotify('success', 'Semua perubahan pengumuman berhasil disimpan.');
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

      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Kelola Antrian (Max 5)</h3>
          <p className="text-[10px] text-slate-500">Urutan di sini menentukan urutan tampil di halaman utama.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleAdd}
            disabled={announcements.length >= 5}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Tambah
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
            Simpan
          </button>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={announcements.map(a => a.id)} strategy={verticalListSortingStrategy}>
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
  onFileChange: (id: string, type: 'admin_photo' | 'media', file: File | null) => void;
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
      className="group relative p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl"
    >
      <div className="flex gap-6">
        {/* Drag Handle */}
        <div 
          {...attributes} 
          {...listeners} 
          className="shrink-0 pt-2 cursor-grab active:cursor-grabbing text-slate-600 hover:text-blue-400 transition-colors touch-none"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4 flex-1">
              {/* Admin Photo */}
              <div className="relative w-12 h-12 rounded-full border border-white/10 bg-black/40 overflow-hidden group/admin shrink-0">
                {(item.previewAdminPhotoUrl || item.admin_photo_url) ? (
                  <img src={item.previewAdminPhotoUrl || item.admin_photo_url || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/admin:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Upload className="w-3 h-3 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileChange(item.id, 'admin_photo', e.target.files?.[0] || null)} />
                </label>
              </div>

              <div className="flex-1">
                <input 
                  type="text" 
                  value={item.admin_name || ''}
                  onChange={(e) => onUpdate(item.id, 'admin_name', e.target.value)}
                  placeholder="Nama Admin"
                  className="w-full bg-transparent border-none p-0 text-sm font-bold text-white placeholder-slate-600 focus:ring-0"
                />
                <span className="text-[10px] text-slate-500 font-mono uppercase">Pembuat Pengumuman</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdate(item.id, 'is_active', !item.is_active)}
                className={`p-2 rounded-xl border transition-all ${
                  item.is_active 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-800 border-white/10 text-slate-500'
                }`}
                title={item.is_active ? 'Aktif' : 'Nonaktif'}
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

          <div className="space-y-4">
            {/* Markdown Editor Area */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                <FileText className="w-3 h-3" />
                <span>Pesan Pengumuman (Markdown Support)</span>
              </div>
              <textarea 
                value={item.content_markdown || ''}
                onChange={(e) => onUpdate(item.id, 'content_markdown', e.target.value)}
                placeholder="Tulis pesan pengumuman menggunakan markdown..."
                rows={4}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-700 focus:border-blue-500/50 outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Media Content */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">MEDIA PENDUKUNG</label>
                  <select 
                    value={item.media_type || 'image'}
                    onChange={(e) => onUpdate(item.id, 'media_type', e.target.value)}
                    className="bg-transparent border-none p-0 text-[10px] font-bold text-blue-400 focus:ring-0 outline-none cursor-pointer"
                  >
                    <option value="image">Gambar</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-white/10 bg-black/40 overflow-hidden group/media shrink-0">
                    {(item.previewMediaUrl || item.media_url) ? (
                      item.media_type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-blue-500/10">
                          <VideoIcon className="w-6 h-6 text-blue-400" />
                        </div>
                      ) : item.media_type === 'audio' ? (
                        <div className="w-full h-full flex items-center justify-center bg-purple-500/10">
                          <AudioIcon className="w-6 h-6 text-purple-400" />
                        </div>
                      ) : (
                        <img src={item.previewMediaUrl || item.media_url || ''} className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-700">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      <Upload className="w-4 h-4 text-white" />
                      <input 
                        type="file" 
                        accept={item.media_type === 'video' ? 'video/*' : item.media_type === 'audio' ? 'audio/*' : 'image/*'} 
                        className="hidden" 
                        onChange={(e) => onFileChange(item.id, 'media', e.target.files?.[0] || null)} 
                      />
                    </label>
                  </div>
                  <div className="flex-1 text-[10px] text-slate-500 italic">
                    {item.tempMediaFile ? item.tempMediaFile.name : item.media_url ? 'Media terunggah' : 'Belum ada media'}
                  </div>
                </div>
              </div>

              {/* Timing Settings */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase">JADWAL TAYANG</label>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold mb-1">
                      <Calendar className="w-3 h-3" />
                      Mulai Tayang
                    </div>
                    <input 
                      type="datetime-local" 
                      value={item.start_at ? item.start_at.slice(0, 16) : ''}
                      onChange={(e) => onUpdate(item.id, 'start_at', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold mb-1">
                      <Calendar className="w-3 h-3" />
                      Hapus Otomatis (Opsional)
                    </div>
                    <input 
                      type="datetime-local" 
                      value={item.end_at ? item.end_at.slice(0, 16) : ''}
                      onChange={(e) => onUpdate(item.id, 'end_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500/50 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Note/Tips */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-blue-300">Tips Pengumuman</h4>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Pengumuman akan otomatis muncul di bagian atas halaman utama pada waktu yang ditentukan. Dukungan markdown memungkinkan Anda membuat teks tebal, miring, atau list.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
