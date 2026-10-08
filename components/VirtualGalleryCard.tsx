'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { 
  Video, 
  Image as ImageIcon, 
  Clock, 
  Maximize2, 
  Play, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { GalleryItem } from '@/lib/db';
import { galleryMemoryCache } from '@/lib/galleryCache';

interface VirtualGalleryCardProps {
  item: GalleryItem;
  index: number;
  isPriority: boolean;
  onSelect: () => void;
}

export default function VirtualGalleryCard({
  item,
  index,
  isPriority,
  onSelect,
}: VirtualGalleryCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isInViewport, setIsInViewport] = React.useState<boolean>(() => {
    if (isPriority) return true;
    if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
      return true;
    }
    return false;
  });
  const [isLoaded, setIsLoaded] = React.useState<boolean>(() => {
    return isPriority || galleryMemoryCache.has(item.media_url);
  });
  const [hasError, setHasError] = React.useState<boolean>(false);
  const [retryCount, setRetryCount] = React.useState<number>(0);

  // Setup Viewport IntersectionObserver (Lazy Load + Unload off-screen)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInViewport(true);
          // If already in memory cache, mark as loaded instantly
          if (galleryMemoryCache.has(item.media_url)) {
            setIsLoaded(true);
          }
        } else {
          // When scrolled far outside buffer (~350px), unload the media element to free RAM
          setIsInViewport(false);
        }
      },
      {
        root: null,
        // Preload buffer 350px top/bottom (~1-2 screenfuls)
        rootMargin: '350px 0px 350px 0px',
        threshold: 0,
      }
    );

    const currentEl = cardRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
      observer.disconnect();
    };
  }, [item.media_url]);

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    galleryMemoryCache.set(item.media_url);
  };

  const handleImageError = () => {
    if (retryCount < 2) {
      // Retry once or twice with slight delay
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setHasError(false);
      }, 1000);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    setIsLoaded(false);
    setRetryCount(0);
  };

  // Formatted date & time (Indonesian WIB)
  const formattedDateTime = React.useMemo(() => {
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
  }, [item.taken_at]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      onClick={onSelect}
      className="group cursor-pointer relative rounded-3xl border border-white/10 bg-slate-950/40 backdrop-blur-xl overflow-hidden hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] transition-all duration-300 flex flex-col justify-between"
    >
      {/* Media Preview Container with Fixed Aspect Ratio (Prevents Layout Shift) */}
      <div className="relative aspect-[4/3] bg-slate-900/80 overflow-hidden select-none">
        {/* Shimmer skeleton placeholder when loading or unmounted */}
        {(!isInViewport || (!isLoaded && !hasError)) && (
          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <div className="flex flex-col items-center gap-2 text-slate-700">
              {item.media_type === 'video' ? (
                <Video className="w-8 h-8 opacity-30" />
              ) : (
                <ImageIcon className="w-8 h-8 opacity-30" />
              )}
            </div>
          </div>
        )}

        {/* Media rendering only when within viewport buffer */}
        {isInViewport && (
          <>
            {item.media_type === 'video' ? (
              <div className="w-full h-full relative">
                <video
                  src={item.media_url}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedData={() => {
                    setIsLoaded(true);
                    galleryMemoryCache.set(item.media_url);
                  }}
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600/80 group-hover:bg-blue-500 border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                    <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                  </div>
                </div>
              </div>
            ) : hasError ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950/90 text-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-400" />
                <span className="text-[11px] text-slate-400">Gagal memuat gambar</span>
                <button
                  onClick={handleManualRetry}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-white flex items-center gap-1 transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Coba Lagi</span>
                </button>
              </div>
            ) : (
              <img
                src={`${item.media_url}${retryCount > 0 ? `?retry=${retryCount}` : ''}`}
                alt={item.caption || 'Foto galeri'}
                loading={isPriority ? 'eager' : 'lazy'}
                decoding="async"
                // @ts-expect-error fetchpriority standard attribute in modern browsers
                fetchpriority={isPriority ? 'high' : 'auto'}
                referrerPolicy="no-referrer"
                onLoad={handleImageLoad}
                onError={handleImageError}
                className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
          </>
        )}

        {/* Badge Media Type */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-white flex items-center gap-1.5 z-10 pointer-events-none">
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
        <div className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
          <Maximize2 className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Caption & Timestamp Details */}
      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
        <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed font-medium">
          {item.caption || '(Tanpa caption)'}
        </p>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{formattedDateTime}</span>
          </span>

          <span className="text-[10px] text-blue-400 font-semibold group-hover:underline">
            Lihat Full
          </span>
        </div>
      </div>
    </motion.div>
  );
}
