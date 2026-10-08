'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Download, 
  X, 
  Maximize2, 
  Video, 
  Image as ImageIcon, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Play,
  Film,
  Clock,
  Share2,
  Check,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  AlertTriangle,
  Archive,
  Loader2,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import JSZip from 'jszip';
import { useIsMobile } from '@/hooks/use-mobile';
import { SiteSettings, BackgroundImage, MusicTrack, GalleryItem } from '@/lib/db';
import { checkGalleryAccessPassword } from '@/app/actions';
import BackgroundMedia from './BackgroundMedia';
import AudioPlayer from './AudioPlayer';
import SecurityGuard from './SecurityGuard';

interface GalleryViewProps {
  settings: SiteSettings;
  mobileBgImages: BackgroundImage[];
  desktopBgImages: BackgroundImage[];
  tracks: MusicTrack[];
  galleryItems: GalleryItem[];
}

export default function GalleryView({
  settings,
  mobileBgImages,
  desktopBgImages,
  tracks,
  galleryItems = [],
}: GalleryViewProps) {
  const isMobile = useIsMobile();
  const [filter, setFilter] = React.useState<'all' | 'image' | 'video'>('all');
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [copiedShare, setCopiedShare] = React.useState(false);

  // Password Protection State
  const [isUnlocked, setIsUnlocked] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('reylan_gallery_unlocked') === 'true';
    }
    return false;
  });
  const [inputPassword, setInputPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  // ZIP Download State
  const [isZipping, setIsZipping] = React.useState(false);
  const [zipProgress, setZipProgress] = React.useState<{
    current: number;
    total: number;
    filename: string;
  } | null>(null);

  // Sync Favicon dynamically for /gallery page
  React.useEffect(() => {
    if (settings.favicon_url) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings.favicon_url]);

  // Auto-play backsound upon user interaction if available
  React.useEffect(() => {
    const triggerAudio = () => {
      const event = new CustomEvent('play-backsound');
      window.dispatchEvent(event);
    };
    window.addEventListener('click', triggerAudio, { once: true });
    return () => window.removeEventListener('click', triggerAudio);
  }, []);

  // Unlock Handler
  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) {
      setPasswordError('Silakan masukkan password.');
      return;
    }

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      const res = await checkGalleryAccessPassword(inputPassword);
      if (res.success) {
        setIsUnlocked(true);
        sessionStorage.setItem('reylan_gallery_unlocked', 'true');
        setInputPassword('');
      } else {
        setPasswordError('Password salah atau sudah kadaluarsa! Silakan coba lagi.');
      }
    } catch (err) {
      setPasswordError('Gagal memverifikasi password. Silakan coba lagi.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleLockGallery = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('reylan_gallery_unlocked');
  };

  // ZIP Download All Items
  const handleDownloadAllZip = async () => {
    if (galleryItems.length === 0) return;
    setIsZipping(true);
    setZipProgress({ current: 0, total: galleryItems.length, filename: '' });

    try {
      const zip = new JSZip();
      const folder = zip.folder('galeri-kenangan') || zip;

      for (let i = 0; i < galleryItems.length; i++) {
        const item = galleryItems[i];
        setZipProgress({
          current: i + 1,
          total: galleryItems.length,
          filename: item.caption || `media-${i + 1}`,
        });

        try {
          const res = await fetch(item.media_url);
          const blob = await res.blob();
          
          const extMatch = item.media_url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
          const ext = extMatch ? `.${extMatch[1]}` : (item.media_type === 'video' ? '.mp4' : '.jpg');
          
          const safeCaption = (item.caption || `momen_${i + 1}`)
            .replace(/[^a-zA-Z0-9_\-]/g, '_')
            .replace(/_+/g, '_')
            .slice(0, 30);
            
          const fileName = `${String(i + 1).padStart(2, '0')}_${safeCaption}${ext}`;
          folder.file(fileName, blob);
        } catch (e) {
          console.warn(`Gagal fetch file untuk zip (${item.media_url}):`, e);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);

      const link = document.createElement('a');
      link.href = blobUrl;
      const safeAccountName = settings.account_name.replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `Galeri_Kenangan_${safeAccountName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Gagal membuat zip galeri:', err);
      alert('Gagal mengunduh file zip galeri. Silakan coba lagi.');
    } finally {
      setIsZipping(false);
      setZipProgress(null);
    }
  };

  // Sort items: newest taken_at at the top, oldest at the bottom
  const sortedItems = React.useMemo(() => {
    return [...galleryItems].sort((a, b) => {
      const timeA = a.taken_at ? new Date(a.taken_at).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
      const timeB = b.taken_at ? new Date(b.taken_at).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [galleryItems]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    if (filter === 'image') return sortedItems.filter((item) => item.media_type === 'image');
    if (filter === 'video') return sortedItems.filter((item) => item.media_type === 'video');
    return sortedItems;
  }, [sortedItems, filter]);

  const activeItem = selectedIndex !== null ? filteredItems[selectedIndex] : null;

  // Handle direct file download
  const handleDownload = async (url: string, filename?: string) => {
    if (!url) return;
    setIsDownloading(true);

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      const extMatch = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
      const ext = extMatch ? `.${extMatch[1]}` : (activeItem?.media_type === 'video' ? '.mp4' : '.jpg');
      const name = filename || `gallery-item-${Date.now()}${ext}`;
      
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn('Gagal fetch blob, fallback membuka di tab baru:', err);
      window.open(url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  // Lightbox keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') setSelectedIndex(null);
      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0));
      }
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredItems.length]);

  return (
    <div className="relative min-h-screen text-white font-sans overflow-x-hidden">
      {/* Pengaman Keamanan Situs dengan Notifikasi Toast */}
      <SecurityGuard settings={settings} />
      {/* Dynamic Main Page Background (Non-zoomed, non-scrolling) */}
      <BackgroundMedia
        url={settings.background_url}
        type={settings.background_type}
        desktopUrl={settings.desktop_background_url}
        desktopType={settings.desktop_background_type}
        mobileImages={mobileBgImages}
        desktopImages={desktopBgImages}
        mobileInterval={settings.mobile_bg_slideshow_interval}
        desktopInterval={settings.desktop_bg_slideshow_interval}
        mobileTransition={settings.mobile_bg_transition}
        desktopTransition={settings.desktop_bg_transition}
        isMobile={isMobile ?? false}
      />

      {/* Audio Player for Background Music */}
      <AudioPlayer
        volume={settings.backsound_volume}
        enabled={settings.backsound_enabled}
        tracks={tracks}
        accountName={settings.account_name}
        profilePhotoUrl={settings.profile_photo_url || undefined}
      />

      {/* PASSWORD GATE SCREEN */}
      {!isUnlocked ? (
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-2xl p-6 md:p-8 shadow-2xl space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 border border-white/20">
                <KeyRound className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">Galeri Terkunci Password</h1>
              <p className="text-xs text-slate-300">
                Masukkan password khusus untuk mengakses koleksi foto & video kenangan <span className="font-semibold text-blue-400">{settings.account_name}</span>.
              </p>
            </div>

            {/* Disclaimer Box */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 space-y-2 text-xs leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Disclaimer / Peringatan:</span>
              </div>
              <p className="text-[11px] text-amber-100/90 leading-snug">
                Foto/video di dalam galeri ini memuat kenangan & foto-foto lama yang mungkin bisa bikin ilfeel, cringe, salah tingkah, atau nostalgia berlebihan. Harap persiapkan mental Anda! 😅
              </p>
            </div>

            {/* Password Form */}
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">Password Galeri</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="Masukkan 8-16 digit password..."
                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-white/10 bg-slate-900/90 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingPassword}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifyingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Buka Galeri</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <a
                href="/"
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Halaman Utama</span>
              </a>
            </div>
          </motion.div>
        </div>
      ) : (
        /* UNLOCKED MAIN GALLERY CONTAINER */
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">
          {/* Navigation & Header */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/"
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold transition-all shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 text-blue-400" />
                <span>Ke Utama</span>
              </a>

              <button
                onClick={handleLockGallery}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-white/15 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-all shadow-lg"
                title="Kunci Sesi Galeri"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Kunci Galeri</span>
              </button>
            </div>

            <div className="text-center md:text-right space-y-0.5">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2 md:justify-end">
                <Film className="w-6 h-6 text-blue-400" />
                <span>Galeri Kenangan</span>
              </h1>
              <p className="text-xs text-slate-300 font-medium">
                Koleksi Momen, Foto & Video Pilihan {settings.account_name}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
              {/* Download All ZIP Button */}
              <button
                onClick={handleDownloadAllZip}
                disabled={isZipping || galleryItems.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-blue-500/40 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                title="Download Semua Foto & Video sekaligus dalam format .ZIP"
              >
                {isZipping ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Archive className="w-4 h-4 text-blue-200" />
                )}
                <span>{isZipping ? 'Membuat Zip...' : 'Download Semua (.ZIP)'}</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all"
                title="Bagikan Tautan Galeri"
              >
                {copiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedShare ? 'Tersalin' : 'Bagikan'}</span>
              </button>
            </div>
          </header>

          {/* Filter Bar */}
          <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl w-fit mx-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Semua ({galleryItems.length})
            </button>
            <button
              onClick={() => setFilter('image')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === 'image'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Foto ({galleryItems.filter(g => g.media_type === 'image').length})</span>
            </button>
            <button
              onClick={() => setFilter('video')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filter === 'video'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video ({galleryItems.filter(g => g.media_type === 'video').length})</span>
            </button>
          </div>

          {/* Grid Media Display */}
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl space-y-3">
              <Film className="w-12 h-12 mx-auto text-slate-500 animate-pulse" />
              <h3 className="text-base font-bold text-slate-300">Galeri Belum Berisi Media</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Belum ada foto atau video yang diunggah ke kategori ini. Silakan kunjungi halaman pengaturan untuk menambahkannya.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => setSelectedIndex(index)}
                  className="group cursor-pointer relative rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl overflow-hidden hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Media Preview Container */}
                  <div className="relative aspect-[4/3] bg-black/60 overflow-hidden">
                    {item.media_type === 'video' ? (
                      <div className="w-full h-full relative">
                        <video
                          src={item.media_url}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-blue-600/80 group-hover:bg-blue-500 border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                            <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.media_url}
                        alt={item.caption}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    {/* Badge Media Type */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white flex items-center gap-1.5">
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

                    {/* Hover Overlay Icon */}
                    <div className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Caption & Timestamp Details */}
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed font-medium">
                      {item.caption}
                    </p>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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

                      <span className="text-[10px] text-blue-400 font-semibold group-hover:underline">
                        Lihat Full
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ZIP Progress Modal */}
      {isZipping && zipProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
              <Archive className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Membuat File Zip Galeri</h3>
              <p className="text-xs text-slate-400">
                Mengunduh dan memasukkan berkas ke dalam .zip ({zipProgress.current} dari {zipProgress.total})
              </p>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
                style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 truncate font-mono">
              Proses: {zipProgress.filename}
            </p>
          </div>
        </div>
      )}

      {/* FULL SCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl"
          >
            {/* Background Overlay Click to Close */}
            <div
              className="absolute inset-0 z-0"
              onClick={() => setSelectedIndex(null)}
            />

            {/* Lightbox Content Window */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-3xl border border-white/10 bg-slate-950/80 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/10 bg-slate-900/60">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-[10px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    {activeItem.media_type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                    <span>{activeItem.media_type}</span>
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {(() => {
                      if (!activeItem.taken_at) return '-';
                      const d = new Date(activeItem.taken_at);
                      if (isNaN(d.getTime())) return activeItem.taken_at;
                      const dateFormatted = d.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      });
                      const timeFormatted = d.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      }).replace('.', ':');
                      return `${dateFormatted}, ${timeFormatted} WIB`;
                    })()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Download Direct Button */}
                  <button
                    onClick={() => handleDownload(activeItem.media_url)}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isDownloading ? 'Mengunduh...' : 'Download File'}</span>
                  </button>

                  {/* Close Modal Button */}
                  <button
                    onClick={() => setSelectedIndex(null)}
                    className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Main Media Viewer */}
              <div className="relative flex-1 bg-black/80 min-h-[300px] max-h-[60vh] flex items-center justify-center p-2 overflow-hidden">
                {activeItem.media_type === 'video' ? (
                  <video
                    src={activeItem.media_url}
                    controls
                    autoPlay
                    playsInline
                    className="max-w-full max-h-[58vh] rounded-2xl object-contain"
                  />
                ) : (
                  <img
                    src={activeItem.media_url}
                    alt={activeItem.caption}
                    className="max-w-full max-h-[58vh] rounded-2xl object-contain"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Left/Right Prev Next Buttons */}
                {filteredItems.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1));
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-all shadow-xl"
                      title="Sebelumnya"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIndex((prev) => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 text-white transition-all shadow-xl"
                      title="Berikutnya"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
              </div>

              {/* Caption Footer */}
              <div className="p-4 md:p-6 border-t border-white/10 bg-slate-900/80 space-y-1">
                <p className="text-sm text-slate-100 leading-relaxed font-medium">
                  {activeItem.caption}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Momen {selectedIndex! + 1} dari {filteredItems.length}</span>
                  <span className="text-slate-500">Gunakan panah keyboard (←/→) untuk navigasi</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
