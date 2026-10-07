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
  Check
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SiteSettings, BackgroundImage, MusicTrack, GalleryItem } from '@/lib/db';
import BackgroundMedia from './BackgroundMedia';
import AudioPlayer from './AudioPlayer';

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

  // Auto-play backsound upon user interaction if available
  React.useEffect(() => {
    const triggerAudio = () => {
      const event = new CustomEvent('play-backsound');
      window.dispatchEvent(event);
    };
    window.addEventListener('click', triggerAudio, { once: true });
    return () => window.removeEventListener('click', triggerAudio);
  }, []);

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
      // Extract or build filename
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
      {/* Dynamic Main Page Background */}
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

      {/* Main Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8">
        {/* Navigation & Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-2xl">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/15 active:scale-95 text-white text-xs font-semibold transition-all shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>Kembali ke Utama</span>
            </a>
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

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all self-end md:self-auto"
            title="Bagikan Tautan Galeri"
          >
            {copiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedShare ? 'Tautan Tersalin' : 'Bagikan'}</span>
          </button>
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
