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
  AlertCircle, 
  Clock, 
  ExternalLink,
  Film,
  CheckCircle2,
  Loader2,
  X,
  Layers,
  Pencil,
  KeyRound,
  Copy,
  ShieldCheck,
  Eye,
  EyeOff,
  Shuffle,
  CalendarClock,
  AlertTriangle,
  Check
} from 'lucide-react';
import { GalleryItem, GalleryPassword } from '@/lib/db';
import { handleUpload } from '@/lib/supabase';
import { 
  createGalleryMedia, 
  removeGalleryMedia, 
  editGalleryMedia,
  fetchGalleryPasswords,
  addGalleryPassword,
  editGalleryPassword,
  removeGalleryPassword
} from '@/app/actions';
import ExifReader from 'exifreader';

interface GallerySettingsClientProps {
  initialItems: GalleryItem[];
}

interface SelectedFileItem {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: 'image' | 'video';
  detectedDate: string; // YYYY-MM-DDTHH:mm
  dateSource: 'exif' | 'file';
  isDetecting: boolean;
}

export default function GallerySettingsClient({ initialItems }: GallerySettingsClientProps) {
  const [items, setItems] = React.useState<GalleryItem[]>(initialItems);
  const [uploadType, setUploadType] = React.useState<'file' | 'url'>('file');
  
  // Multi-file selection state
  const [selectedFiles, setSelectedFiles] = React.useState<SelectedFileItem[]>([]);
  
  // Direct URL state
  const [mediaType, setMediaType] = React.useState<'image' | 'video'>('image');
  const [directUrl, setDirectUrl] = React.useState('');
  
  // Shared caption
  const [caption, setCaption] = React.useState('');
  
  // Format default datetime-local string (YYYY-MM-DDTHH:mm)
  const getDefaultDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [takenAt, setTakenAt] = React.useState(getDefaultDateTime());
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);

  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit item state
  const [editingItem, setEditingItem] = React.useState<GalleryItem | null>(null);
  const [editCaption, setEditCaption] = React.useState('');
  const [editTakenAt, setEditTakenAt] = React.useState('');
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  // Gallery Custom Passwords State
  const [passwords, setPasswords] = React.useState<GalleryPassword[]>([]);
  const [isLoadingPasswords, setIsLoadingPasswords] = React.useState(true);
  const [showPassModal, setShowPassModal] = React.useState(false);
  const [editingPassword, setEditingPassword] = React.useState<GalleryPassword | null>(null);
  const [visiblePassIds, setVisiblePassIds] = React.useState<Record<string, boolean>>({});
  const [copiedPassId, setCopiedPassId] = React.useState<string | null>(null);

  // Password Modal Form State
  const [passLabel, setPassLabel] = React.useState('');
  const [passText, setPassText] = React.useState('');
  const [passDurationType, setPassDurationType] = React.useState<'forever' | '1h' | '1d' | '7d' | '30d' | 'custom'>('forever');
  const [passCustomExpiresAt, setPassCustomExpiresAt] = React.useState('');
  const [passIsActive, setPassIsActive] = React.useState(true);
  const [isSavingPass, setIsSavingPass] = React.useState(false);

  // Load custom passwords on mount
  React.useEffect(() => {
    let mounted = true;
    const loadPasses = async () => {
      setIsLoadingPasswords(true);
      try {
        const res = await fetchGalleryPasswords();
        if (mounted && res.success && res.data) {
          setPasswords(res.data);
        }
      } catch (err) {
        console.warn('Gagal memuat password galeri:', err);
      } finally {
        if (mounted) setIsLoadingPasswords(false);
      }
    };
    loadPasses();
    return () => { mounted = false; };
  }, []);

  // Random Password Generator
  const generateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*()_+-=';
    const all = upper + lower + numbers + symbols;

    let pass = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    for (let i = pass.length; i < 12; i++) {
      pass.push(all[Math.floor(Math.random() * all.length)]);
    }

    pass = pass.sort(() => Math.random() - 0.5);
    setPassText(pass.join(''));
  };

  const calculateExpiresAt = (): string | null => {
    if (passDurationType === 'forever') return null;
    const now = new Date();
    if (passDurationType === '1h') now.setHours(now.getHours() + 1);
    else if (passDurationType === '1d') now.setDate(now.getDate() + 1);
    else if (passDurationType === '7d') now.setDate(now.getDate() + 7);
    else if (passDurationType === '30d') now.setDate(now.getDate() + 30);
    else if (passDurationType === 'custom') {
      if (!passCustomExpiresAt) return null;
      const parsed = new Date(passCustomExpiresAt);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    }
    return now.toISOString();
  };

  const handleOpenAddPassModal = () => {
    setEditingPassword(null);
    setPassLabel('');
    generateRandomPassword();
    setPassDurationType('forever');
    setPassCustomExpiresAt('');
    setPassIsActive(true);
    setShowPassModal(true);
  };

  const handleOpenEditPassModal = (pass: GalleryPassword) => {
    setEditingPassword(pass);
    setPassLabel(pass.label || '');
    setPassText(pass.password_text || '');
    if (!pass.expires_at) {
      setPassDurationType('forever');
      setPassCustomExpiresAt('');
    } else {
      setPassDurationType('custom');
      setPassCustomExpiresAt(formatForDateTimeInput(pass.expires_at));
    }
    setPassIsActive(pass.is_active ?? true);
    setShowPassModal(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passText.trim() || passText.length < 8 || passText.length > 16) {
      setStatusMessage({ type: 'error', text: 'Password harus terdiri dari 8 hingga 16 karakter.' });
      return;
    }

    setIsSavingPass(true);
    setStatusMessage(null);

    const expIso = calculateExpiresAt();

    try {
      if (editingPassword) {
        const res = await editGalleryPassword(editingPassword.id, {
          label: passLabel.trim() || 'Password Galeri',
          password_text: passText.trim(),
          expires_at: expIso,
          is_active: passIsActive,
        });
        if (res.success && res.data) {
          setPasswords((prev) => prev.map((p) => (p.id === editingPassword.id ? res.data! : p)));
          setStatusMessage({ type: 'success', text: 'Password custom berhasil diperbarui!' });
          setShowPassModal(false);
        } else {
          setStatusMessage({ type: 'error', text: res.error || 'Gagal menyimpan password.' });
        }
      } else {
        const res = await addGalleryPassword({
          label: passLabel.trim() || 'Password Galeri Custom',
          password_text: passText.trim(),
          expires_at: expIso,
          is_active: passIsActive,
        });
        if (res.success && res.data) {
          setPasswords((prev) => [res.data!, ...prev]);
          setStatusMessage({ type: 'success', text: 'Password custom baru berhasil dibuat!' });
          setShowPassModal(false);
        } else {
          setStatusMessage({ type: 'error', text: res.error || 'Gagal membuat password.' });
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleDeletePassword = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus password custom ini?')) return;
    try {
      const res = await removeGalleryPassword(id);
      if (res.success) {
        setPasswords((prev) => prev.filter((p) => p.id !== id));
        setStatusMessage({ type: 'success', text: 'Password custom berhasil dihapus.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Gagal menghapus password.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan saat menghapus.' });
    }
  };

  const handleCopyPassword = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassId(id);
    setTimeout(() => setCopiedPassId(null), 2000);
  };

  const togglePassVisibility = (id: string) => {
    setVisiblePassIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatForDateTimeInput = (dateString?: string) => {
    if (!dateString) return getDefaultDateTime();
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return getDefaultDateTime();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const handleStartEdit = (item: GalleryItem) => {
    setEditingItem(item);
    setEditCaption(item.caption || '');
    setEditTakenAt(formatForDateTimeInput(item.taken_at));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingEdit(true);
    setStatusMessage(null);
    try {
      const res = await editGalleryMedia(editingItem.id, {
        caption: editCaption,
        taken_at: editTakenAt,
      });
      if (res.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === editingItem.id
              ? { ...i, caption: editCaption, taken_at: editTakenAt }
              : i
          )
        );
        setStatusMessage({ type: 'success', text: 'Caption dan waktu pengambilan media berhasil diperbarui!' });
        setEditingItem(null);
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Gagal menyimpan perubahan.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan sistem saat mengedit.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Urutkan item: Waktu pengambilan paling baru di paling atas, paling lama di paling bawah
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const timeA = a.taken_at ? new Date(a.taken_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
      const timeB = b.taken_at ? new Date(b.taken_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [items]);

  // Clean up Object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [selectedFiles]);

  // Helper untuk membaca tanggal dari EXIF / QuickTime metadata file
  const extractFileMetadataDate = async (file: File): Promise<{ dateStr: string; source: 'exif' | 'file' }> => {
    try {
      const tags = await ExifReader.load(file) as Record<string, any>;
      let rawDate: string | undefined = undefined;

      if (tags['DateTimeOriginal']?.description) {
        rawDate = tags['DateTimeOriginal'].description;
      } else if (tags['CreateDate']?.description) {
        rawDate = tags['CreateDate'].description;
      } else if (tags['CreationDate']?.description) {
        rawDate = tags['CreationDate'].description;
      } else if (tags['MediaCreateDate']?.description) {
        rawDate = tags['MediaCreateDate'].description;
      } else if (tags['DateTime']?.description) {
        rawDate = tags['DateTime'].description;
      } else if (tags['DateCreated']?.description) {
        rawDate = tags['DateCreated'].description;
      } else if (tags['File Modified Date']?.description) {
        rawDate = tags['File Modified Date'].description;
      }

      if (rawDate) {
        const match = rawDate.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2})/);
        if (match) {
          const [, year, month, day, hour, minute] = match;
          return { dateStr: `${year}-${month}-${day}T${hour}:${minute}`, source: 'exif' };
        }
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          parsed.setMinutes(parsed.getMinutes() - parsed.getTimezoneOffset());
          return { dateStr: parsed.toISOString().slice(0, 16), source: 'exif' };
        }
      }
    } catch (err) {
      console.warn('Gagal membaca tag metadata dari file, menggunakan tanggal modifikasi file:', err);
    }

    if (file.lastModified) {
      const d = new Date(file.lastModified);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return { dateStr: d.toISOString().slice(0, 16), source: 'file' };
    }

    return { dateStr: getDefaultDateTime(), source: 'file' };
  };

  // Handle file select (Multiple files support)
  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const validFiles: File[] = [];
    const oversizedFiles: string[] = [];

    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        oversizedFiles.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
      } else {
        validFiles.push(file);
      }
    }

    if (oversizedFiles.length > 0) {
      setStatusMessage({
        type: 'error',
        text: `Beberapa file melebihi batas 50MB dan dilewati: ${oversizedFiles.join(', ')}`
      });
    } else {
      setStatusMessage(null);
    }

    if (validFiles.length === 0) return;

    // Create item objects
    const newItems: SelectedFileItem[] = validFiles.map((file) => {
      const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|ogg|mov|m4v)$/i);
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        mediaType: isVid ? 'video' : 'image',
        detectedDate: getDefaultDateTime(),
        dateSource: 'file',
        isDetecting: true,
      };
    });

    setSelectedFiles((prev) => [...prev, ...newItems]);

    // Reset input value
    e.target.value = '';

    // Extract metadata for each file sequentially & automatically
    for (const item of newItems) {
      const { dateStr, source } = await extractFileMetadataDate(item.file);
      setSelectedFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? { ...f, detectedDate: dateStr, dateSource: source, isDetecting: false }
            : f
        )
      );
    }
  };

  const handleRemoveSelectedFile = (id: string) => {
    setSelectedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleClearAllSelectedFiles = () => {
    selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setSelectedFiles([]);
  };

  const handleUpdateSelectedFileDate = (id: string, newDate: string) => {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, detectedDate: newDate, dateSource: 'file' } : f))
    );
  };

  const handleUpdateSelectedFileType = (id: string, type: 'image' | 'video') => {
    setSelectedFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, mediaType: type } : f))
    );
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      setStatusMessage({ type: 'error', text: 'Caption wajib diisi.' });
      return;
    }

    if (uploadType === 'file') {
      if (selectedFiles.length === 0) {
        setStatusMessage({ type: 'error', text: 'Silakan pilih minimal 1 file gambar atau video untuk diunggah.' });
        return;
      }

      setIsUploading(true);
      setStatusMessage(null);

      let successCount = 0;
      let failCount = 0;
      let lastErrorMessage = '';
      const total = selectedFiles.length;

      // Process each file sequentially ("secara bertahap")
      for (let i = 0; i < total; i++) {
        const item = selectedFiles[i];
        setUploadProgress({
          current: i + 1,
          total,
          fileName: item.file.name,
        });

        try {
          // Upload to storage bucket 'gallery'
          const finalMediaUrl = await handleUpload(item.file, 'gallery');

          // Format taken_at safely to ISO string
          let takenIso = new Date().toISOString();
          if (item.detectedDate) {
            const parsedDate = new Date(item.detectedDate);
            if (!isNaN(parsedDate.getTime())) {
              takenIso = parsedDate.toISOString();
            }
          }

          const res = await createGalleryMedia({
            media_url: finalMediaUrl,
            media_type: item.mediaType,
            caption: caption.trim(),
            taken_at: takenIso,
          });

          if (res.success && res.data) {
            successCount++;
            setItems((prev) => [res.data, ...prev]);
          } else {
            failCount++;
            if (res.error) lastErrorMessage = res.error;
          }
        } catch (err: any) {
          console.error(`Gagal mengunggah file ${item.file.name}:`, err);
          failCount++;
          if (err?.message) lastErrorMessage = err.message;
        }
      }

      setIsUploading(false);
      setUploadProgress(null);

      if (successCount > 0) {
        setStatusMessage({
          type: 'success',
          text: `Berhasil mengunggah ${successCount} file media ke galeri! ${
            failCount > 0 ? `(${failCount} file gagal: ${lastErrorMessage})` : ''
          }`,
        });

        // Reset selected files and caption
        selectedFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
        setSelectedFiles([]);
        setCaption('');
      } else {
        setStatusMessage({
          type: 'error',
          text: lastErrorMessage
            ? `Gagal mengunggah media ke galeri: ${lastErrorMessage}`
            : 'Gagal mengunggah media ke galeri.',
        });
      }
    } else {
      // Direct URL mode
      if (!directUrl.trim()) {
        setStatusMessage({ type: 'error', text: 'Silakan masukkan URL gambar/video.' });
        return;
      }
      if (!takenAt) {
        setStatusMessage({ type: 'error', text: 'Waktu foto/video dibuat wajib diisi.' });
        return;
      }

      setIsUploading(true);
      setStatusMessage(null);

      try {
        const takenIso = new Date(takenAt).toISOString();
        const res = await createGalleryMedia({
          media_url: directUrl.trim(),
          media_type: mediaType,
          caption: caption.trim(),
          taken_at: takenIso,
        });

        if (res.success && res.data) {
          setItems((prev) => [res.data, ...prev]);
          setStatusMessage({ type: 'success', text: 'Berhasil mengunggah media ke galeri!' });
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
    }
  };

  // Delete item from database
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

  const totalImages = selectedFiles.filter((f) => f.mediaType === 'image').length;
  const totalVideos = selectedFiles.filter((f) => f.mediaType === 'video').length;

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
            Unggah foto dan video sekaligus yang akan ditampilkan di halaman <code className="text-blue-300 font-mono">/gallery</code>. Ukuran maksimal per file adalah <span className="text-amber-300 font-semibold">50MB</span>.
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
        </div>
      </div>

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
            <h2 className="text-base font-bold text-white">Tambah Foto / Video Baru (Multi-Upload)</h2>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
            Maks. 50MB / File
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
              <span>Unggah File Banyak Sekaligus (Multi-File)</span>
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

        {/* Multi-File Input vs Direct URL */}
        {uploadType === 'file' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Pilih Foto & Video (Bisa Pilih Banyak Sekaligus)
              </label>
              <div className="relative border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-2xl p-6 text-center bg-slate-950/40 hover:bg-slate-950/60 transition-all cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFilesChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="space-y-2 pointer-events-none">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    <span>Klik atau seret satu / banyak file foto atau video ke sini</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Mendukung format JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (Batas maks per file: 50MB)
                  </p>
                </div>
              </div>
            </div>

            {/* List Preview File Terpilih */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-slate-950/70">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Daftar File Terpilih</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedFiles.length} File ({totalImages} Foto, {totalVideos} Video)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearAllSelectedFiles}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus Semua</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                  {selectedFiles.map((item, idx) => (
                    <div
                      key={item.id}
                      className="relative p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex flex-col justify-between gap-2 text-xs"
                    >
                      {/* Top Bar inside card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="relative aspect-video w-20 shrink-0 rounded-lg overflow-hidden bg-black border border-white/10">
                          {item.mediaType === 'video' ? (
                            <video src={item.previewUrl} className="w-full h-full object-cover" />
                          ) : (
                            <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] font-semibold text-white flex items-center gap-0.5">
                            {item.mediaType === 'video' ? (
                              <Video className="w-2.5 h-2.5 text-purple-400" />
                            ) : (
                              <ImageIcon className="w-2.5 h-2.5 text-blue-400" />
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-white truncate" title={item.file.name}>
                            {idx + 1}. {item.file.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>

                          {/* Media type toggle */}
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedFileType(item.id, 'image')}
                              className={`text-[9px] px-1.5 py-0.5 rounded ${
                                item.mediaType === 'image'
                                  ? 'bg-blue-500/30 text-blue-300 font-semibold'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Foto
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectedFileType(item.id, 'video')}
                              className={`text-[9px] px-1.5 py-0.5 rounded ${
                                item.mediaType === 'video'
                                  ? 'bg-purple-500/30 text-purple-300 font-semibold'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              Video
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedFile(item.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-white/5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Detected Date Field */}
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            <span>Waktu Terdeteksi:</span>
                          </span>
                          {item.isDetecting ? (
                            <span className="text-blue-400 flex items-center gap-1 animate-pulse">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Mendeteksi...
                            </span>
                          ) : item.dateSource === 'exif' ? (
                            <span className="text-emerald-400 font-semibold text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                              ⚡ EXIF Metadata
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[9px] px-1.5 py-0.2 rounded bg-white/5">
                              📁 Modifikasi Berkas
                            </span>
                          )}
                        </div>

                        <input
                          type="datetime-local"
                          value={item.detectedDate}
                          onChange={(e) => handleUpdateSelectedFileDate(item.id, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-white/10 bg-slate-950 text-white text-[11px] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Direct URL Input */
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

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Waktu Foto/Video Dibuat/Diambil <span className="text-red-400">*</span></span>
              </label>
              <input
                type="datetime-local"
                required={uploadType === 'url'}
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Inputs: Caption (Shared for multi-upload) */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>Caption / Deskripsi Media <span className="text-red-400">*</span></span>
            </span>
            {uploadType === 'file' && selectedFiles.length > 1 && (
              <span className="text-[10px] font-normal text-amber-300">
                (Caption ini akan diterapkan ke semua {selectedFiles.length} file)
              </span>
            )}
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

        {/* Upload Progress Bar (When processing multi-upload) */}
        {isUploading && uploadProgress && (
          <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span>Mengunggah secara bertahap ({uploadProgress.current} dari {uploadProgress.total})</span>
              </span>
              <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              File saat ini: <span className="font-mono text-white">{uploadProgress.fileName}</span>
            </p>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isUploading || (uploadType === 'file' && selectedFiles.length === 0)}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>
                {uploadProgress
                  ? `Mengunggah (${uploadProgress.current}/${uploadProgress.total})...`
                  : 'Mengunggah File (Maks. 50MB)...'}
              </span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>
                {uploadType === 'file' && selectedFiles.length > 1
                  ? `Simpan ${selectedFiles.length} File ke Galeri`
                  : 'Simpan ke Galeri'}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Pengaturan Password Akses Galeri Custom */}
      <div className="p-6 rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white">Password Akses Halaman Galeri</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Buat banyak password custom dengan pengaturan masa aktif (1 Jam, 1 Hari, 7 Hari, 30 Hari, atau Selamanya) untuk membatasi akses ke halaman <code className="text-blue-300 font-mono">/gallery</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPassModal}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Password Custom</span>
          </button>
        </div>

        {/* Note about default password */}
        <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/10 text-xs text-blue-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Password Default Utama:</strong> Menggunakan password admin aplikasi (sesuai file lingkungan <code className="font-mono text-white">ADMIN_PASSWORD</code>).
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Selalu Aktif
          </span>
        </div>

        {/* List Password Custom */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Daftar Password Custom ({passwords.length})
          </h3>

          {isLoadingPasswords ? (
            <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Memuat daftar password...</span>
            </div>
          ) : passwords.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-white/10 text-center text-xs text-slate-500 space-y-1">
              <p>Belum ada password custom. Klik &quot;Buat Password Custom&quot; di atas jika Anda ingin membagikan akses galeri secara khusus dengan batas waktu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {passwords.map((pass) => {
                const isVisible = visiblePassIds[pass.id];
                const isCopied = copiedPassId === pass.id;
                
                // Status Expired check
                let isExpired = false;
                if (pass.expires_at) {
                  const exp = new Date(pass.expires_at);
                  if (!isNaN(exp.getTime()) && exp < new Date()) {
                    isExpired = true;
                  }
                }

                return (
                  <div
                    key={pass.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                      !pass.is_active || isExpired
                        ? 'border-white/5 bg-slate-950/40 opacity-70'
                        : 'border-white/10 bg-slate-950/70 hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{pass.label}</p>
                        
                        {/* Status Badge */}
                        <div className="flex items-center gap-2 pt-0.5">
                          {!pass.is_active ? (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              Nonaktif
                            </span>
                          ) : isExpired ? (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                              Kadaluarsa
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Aktif
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <CalendarClock className="w-3 h-3 text-slate-400" />
                            {pass.expires_at ? (
                              isExpired ? (
                                <span className="text-red-400">Telah Berakhir</span>
                              ) : (
                                <span>Berakhir: {new Date(pass.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                              )
                            ) : (
                              <span className="text-amber-300 font-medium">Selamanya</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPassModal(pass)}
                          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all"
                          title="Edit Password"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePassword(pass.id)}
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all"
                          title="Hapus Password"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Password Box */}
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-white/10 bg-slate-900 font-mono text-xs text-amber-300">
                      <span>{isVisible ? pass.password_text : '••••••••••••'}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePassVisibility(pass.id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title={isVisible ? 'Sembunyikan' : 'Tampilkan'}
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(pass.id, pass.password_text)}
                          className="p-1 text-slate-400 hover:text-amber-400"
                          title="Salin Password"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* List Item Galeri Terunggah */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400" />
            <span>Koleksi Galeri Saat Ini ({items.length})</span>
          </h2>
        </div>

        {sortedItems.length === 0 ? (
          <div className="p-10 rounded-3xl border border-white/10 bg-slate-900/30 text-center space-y-3">
            <Images className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-400">Belum Ada Item di Galeri</p>
            <p className="text-xs text-slate-500">Gunakan formulir di atas untuk mengunggah foto atau video kenangan pertama Anda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sortedItems.map((item) => (
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

                  {/* Top Right Action Buttons */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white transition-all shadow-md"
                      title="Edit Caption & Waktu"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.media_url)}
                      className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white transition-all shadow-md"
                      title="Hapus Media"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Info Content */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-slate-200 line-clamp-2 leading-snug font-medium">
                    {item.caption}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {(() => {
                        if (!item.taken_at) return '-';
                        const d = new Date(item.taken_at);
                        if (isNaN(d.getTime())) return item.taken_at;
                        const dateFormatted = d.toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        const timeFormatted = d.toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        }).replace('.', ':');
                        return `${dateFormatted} • ${timeFormatted} WIB`;
                      })()}
                    </span>

                    <button
                      onClick={() => handleStartEdit(item)}
                      className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Edit Media */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Edit Media Galeri</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Media Preview in Modal */}
            <div className="relative aspect-video rounded-2xl bg-black/80 overflow-hidden border border-white/10">
              {editingItem.media_type === 'video' ? (
                <video
                  src={editingItem.media_url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={editingItem.media_url}
                  alt={editingItem.caption}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Caption Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Caption Media</span>
                </label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  required
                  placeholder="Tulis caption cerita momen ini..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950/60 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Taken At Date Time Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Waktu Pengambilan (Tanggal & Jam)</span>
                </label>
                <input
                  type="datetime-local"
                  value={editTakenAt}
                  onChange={(e) => setEditTakenAt(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950/60 text-white text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all color-scheme-dark"
                />
                <p className="text-[10px] text-slate-400">
                  Ubah tanggal dan jam ini untuk memperbarui waktu pembuatan/pengambilan foto atau video ini.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Password Custom */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>{editingPassword ? 'Edit Password Custom' : 'Buat Password Custom Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4">
              {/* Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Label / Catatan Password</label>
                <input
                  type="text"
                  value={passLabel}
                  onChange={(e) => setPassLabel(e.target.value)}
                  placeholder="Misal: Password untuk Teman SMA"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Password Text + Randomizer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Password (8 - 16 Digit) <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Acak Password</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={8}
                  maxLength={16}
                  value={passText}
                  onChange={(e) => setPassText(e.target.value)}
                  placeholder="Contoh: K3naNg4n@2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400">
                  Password acak otomatis mengombinasikan huruf besar, huruf kecil, angka, dan simbol (8-16 digit).
                </p>
              </div>

              {/* Duration / Expiry Setting */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Masa Aktif Password</label>
                <select
                  value={passDurationType}
                  onChange={(e) => setPassDurationType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="forever">Selamanya (Tidak Ada Kadaluarsa)</option>
                  <option value="1h">1 Jam dari Sekarang</option>
                  <option value="1d">1 Hari dari Sekarang</option>
                  <option value="7d">7 Hari dari Sekarang</option>
                  <option value="30d">30 Hari dari Sekarang</option>
                  <option value="custom">Custom Tanggal & Jam</option>
                </select>
              </div>

              {/* Custom Date Time Picker if selected */}
              {passDurationType === 'custom' && (
                <div className="space-y-1.5 pl-2 border-l-2 border-amber-500">
                  <label className="text-xs font-semibold text-slate-300 block">Tanggal & Jam Kadaluarsa</label>
                  <input
                    type="datetime-local"
                    value={passCustomExpiresAt}
                    onChange={(e) => setPassCustomExpiresAt(e.target.value)}
                    required={passDurationType === 'custom'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Status Toggle */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-slate-300">Status Password</span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={passIsActive}
                    onChange={(e) => setPassIsActive(e.target.checked)}
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                  <span>{passIsActive ? 'Aktif' : 'Nonaktif'}</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  disabled={isSavingPass}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPass}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPass ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
