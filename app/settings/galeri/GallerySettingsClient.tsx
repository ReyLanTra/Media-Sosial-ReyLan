'use client';

import * as React from 'react';
import { 
  Images, 
  Upload, 
  Trash2, 
  Plus, 
  Calendar, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Code, 
  Copy, 
  Check, 
  AlertCircle, 
  Clock, 
  ExternalLink,
  Film,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GalleryItem } from '@/lib/db';
import { handleUpload } from '@/lib/supabase';
import { createGalleryMedia, removeGalleryMedia } from '@/app/actions';

interface GallerySettingsClientProps {
  initialItems: GalleryItem[];
}

export default function GallerySettingsClient({ initialItems }: GallerySettingsClientProps) {
  const [items, setItems] = React.useState<GalleryItem[]>(initialItems);
  const [uploadType, setUploadType] = React.useState<'file' | 'url'>('file');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [filePreview, setFilePreview] = React.useState<string | null>(null);
  const [mediaType, setMediaType] = React.useState<'image' | 'video'>('image');
  const [directUrl, setDirectUrl] = React.useState('');
  const [caption, setCaption] = React.useState('');
  
  // Format default datetime-local string (YYYY-MM-DDTHH:mm)
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [takenAt, setTakenAt] = React.useState(getDefaultDateTime());
  const [isUploading, setIsUploading] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // SQL Script state & copy
  const [showSqlModal, setShowSqlModal] = React.useState(false);
  const [copiedSql, setCopiedSql] = React.useState(false);

  const sqlScript = `-- 1. Buat tabel gallery_items jika belum ada
CREATE TABLE IF NOT EXISTS public.gallery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    caption TEXT NOT NULL,
    taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan Keamanan (RLS)
CREATE POLICY "Publik dapat membaca galeri"
ON public.gallery_items FOR SELECT
USING (true);

CREATE POLICY "Admin dapat mengelola galeri"
ON public.gallery_items FOR ALL
USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 4. Inisialisasi Storage Bucket 'gallery' di Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Storage Bucket 'gallery'
CREATE POLICY "Publik dapat melihat file galeri"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Admin dapat mengunggah file galeri"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Admin dapat menghapus file galeri"
ON storage.objects FOR DELETE
USING (bucket_id = 'gallery');`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit 50MB (50 * 1024 * 1024)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setStatusMessage({
        type: 'error',
        text: `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal 50MB. Silakan pilih file yang lebih kecil atau kompres terlebih dahulu.`
      });
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    setStatusMessage(null);
    setSelectedFile(file);

    // Auto detect media_type
    const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|ogg|mov|m4v)$/i);
    setMediaType(isVid ? 'video' : 'image');

    // Create local preview
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      setStatusMessage({ type: 'error', text: 'Caption wajib diisi.' });
      return;
    }

    if (!takenAt) {
      setStatusMessage({ type: 'error', text: 'Waktu foto/video dibuat wajib diisi.' });
      return;
    }

    let finalMediaUrl = '';

    setIsUploading(true);
    setStatusMessage(null);

    try {
      if (uploadType === 'file') {
        if (!selectedFile) {
          setStatusMessage({ type: 'error', text: 'Silakan pilih file gambar/video untuk diunggah.' });
          setIsUploading(false);
          return;
        }

        // Upload to Supabase Storage bucket 'gallery'
        finalMediaUrl = await handleUpload(selectedFile, 'gallery');
      } else {
        if (!directUrl.trim()) {
          setStatusMessage({ type: 'error', text: 'Silakan masukkan URL gambar/video.' });
          setIsUploading(false);
          return;
        }
        finalMediaUrl = directUrl.trim();
      }

      // Format taken_at to ISO string
      const takenIso = new Date(takenAt).toISOString();

      const res = await createGalleryMedia({
        media_url: finalMediaUrl,
        media_type: mediaType,
        caption: caption.trim(),
        taken_at: takenIso,
      });

      if (res.success && res.data) {
        setItems((prev) => [res.data, ...prev]);
        setStatusMessage({ type: 'success', text: 'Berhasil mengunggah media ke galeri!' });
        
        // Reset form
        setSelectedFile(null);
        setFilePreview(null);
        setDirectUrl('');
        setCaption('');
        setTakenAt(getDefaultDateTime());
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Gagal menyimpan media galeri.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan saat mengunggah.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete item
  const handleDelete = async (id: string, mediaUrl: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus foto/video ini dari galeri?')) return;

    try {
      const res = await removeGalleryMedia(id, mediaUrl);
      if (res.success) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setStatusMessage({ type: 'success', text: 'Item galeri berhasil dihapus.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Gagal menghapus item galeri.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan saat menghapus.' });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-blue-900/30 via-slate-900/40 to-purple-900/30 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Images className="w-6 h-6 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Kelola Galeri Foto & Video</h1>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Unggah foto dan video kenangan yang akan ditampilkan di halaman <code className="text-blue-300 font-mono">/gallery</code>. Ukuran maksimal file adalah <span className="text-amber-300 font-semibold">50MB</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/gallery"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 font-semibold text-xs transition-all"
          >
            <span>Buka Halaman Galeri</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => setShowSqlModal(!showSqlModal)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-semibold text-xs transition-all"
          >
            <Code className="w-3.5 h-3.5" />
            <span>Script SQL Supabase</span>
          </button>
        </div>
      </div>

      {/* SQL Script Box Collapsible */}
      <AnimatePresence>
        {showSqlModal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-semibold text-purple-200">Script SQL Tabel Galeri Supabase</span>
                </div>
                <button
                  onClick={copySqlToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-all"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-white/10 text-[11px] font-mono text-purple-300/90 overflow-x-auto max-h-60 leading-relaxed">
                {sqlScript}
              </pre>
              <p className="text-[10px] text-slate-400">
                Salin script di atas dan jalankan di <span className="text-purple-300 font-semibold">SQL Editor Supabase</span> untuk membuat tabel <code className="font-mono">gallery_items</code> dan bucket storage <code className="font-mono">gallery</code> secara penuh.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Form Upload Media Baru */}
      <form onSubmit={handleSubmit} className="p-6 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Tambah Foto / Video Baru</h2>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            Maks. 50MB
          </span>
        </div>

        {/* Upload Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Metode Pengisian Media</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUploadType('file')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                uploadType === 'file'
                  ? 'border-blue-500 bg-blue-500/20 text-white shadow-md shadow-blue-500/10'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Unggah File (PC/Mobile)</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadType('url')}
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                uploadType === 'url'
                  ? 'border-blue-500 bg-blue-500/20 text-white shadow-md shadow-blue-500/10'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>URL Langsung (Link Direct)</span>
            </button>
          </div>
        </div>

        {/* File Input vs Direct URL */}
        {uploadType === 'file' ? (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">Pilih File Foto atau Video</label>
            <div className="relative border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-2xl p-6 text-center bg-slate-950/40 hover:bg-slate-950/60 transition-all cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="space-y-2 pointer-events-none">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  {selectedFile ? (
                    <span className="text-blue-400 font-semibold">{selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  ) : (
                    <span>Klik atau seret file foto/video ke sini</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">Mendukung format PNG, JPG, WEBP, GIF, MP4, WEBM (Batas max: 50MB)</p>
              </div>
            </div>

            {/* Live Preview File */}
            {filePreview && (
              <div className="mt-3 p-3 rounded-2xl border border-white/10 bg-slate-950/80 max-w-sm space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Pratinjau File:</span>
                {mediaType === 'video' ? (
                  <video src={filePreview} controls className="w-full max-h-48 rounded-xl object-contain bg-black" />
                ) : (
                  <img src={filePreview} alt="Preview" className="w-full max-h-48 rounded-xl object-cover" />
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">URL Langsung Media</label>
              <input
                type="url"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://example.com/video.mp4 atau https://example.com/foto.jpg"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Tipe Media</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    checked={mediaType === 'image'}
                    onChange={() => setMediaType('image')}
                    className="accent-blue-500"
                  />
                  <span>Gambar (Foto / GIF)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    checked={mediaType === 'video'}
                    onChange={() => setMediaType('video')}
                    className="accent-blue-500"
                  />
                  <span>Video</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Inputs: Caption & Taken At */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Caption / Deskripsi Media <span className="text-red-400">*</span></span>
            </label>
            <textarea
              required
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tuliskan cerita atau caption unik untuk media ini..."
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Waktu Foto/Video Dibuat/Diambil <span className="text-red-400">*</span></span>
            </label>
            <input
              type="datetime-local"
              required
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white text-xs focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500">Waktu ini akan digunakan untuk mengurutkan kenangan di halaman galeri.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isUploading}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Mengunggah File ke Supabase (Maks. 50MB)...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Simpan ke Galeri</span>
            </>
          )}
        </button>
      </form>

      {/* List Item Galeri Terunggah */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <span>Koleksi Galeri Saat Ini ({items.length})</span>
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="p-10 rounded-3xl border border-white/10 bg-slate-900/30 text-center space-y-3">
            <Images className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">Belum Ada Item di Galeri</p>
            <p className="text-xs text-slate-500">Gunakan formulir di atas untuk mengunggah foto atau video kenangan pertama Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden flex flex-col justify-between hover:border-blue-500/40 transition-all duration-300 shadow-xl"
              >
                {/* Media Preview */}
                <div className="relative aspect-video bg-black overflow-hidden">
                  {item.media_type === 'video' ? (
                    <video
                      src={item.media_url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white flex items-center gap-1">
                    {item.media_type === 'video' ? (
                      <>
                        <Video className="w-3 h-3 text-purple-400" />
                        <span>Video</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3 h-3 text-blue-400" />
                        <span>Foto</span>
                      </>
                    )}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(item.id, item.media_url)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white transition-all shadow-md"
                    title="Hapus Media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Info Content */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-200 line-clamp-2 leading-snug font-medium">
                    {item.caption}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {new Date(item.taken_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
