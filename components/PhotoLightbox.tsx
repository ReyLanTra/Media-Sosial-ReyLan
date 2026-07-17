'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { ZoomIn, ZoomOut, RotateCcw, X, RotateCw } from 'lucide-react';

interface PhotoLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function PhotoLightbox({ src, alt, onClose }: PhotoLightboxProps) {
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [rotation, setRotation] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  
  const dragStart = React.useRef({ x: 0, y: 0 });
  const lastOffset = React.useRef({ x: 0, y: 0 });
  const hasMoved = React.useRef(false);

  // Touch tracking untuk pinch-to-zoom
  const pinchStartDistance = React.useRef<number | null>(null);
  const pinchStartScale = React.useRef<number>(1);
  const pinchStartCenter = React.useRef({ x: 0, y: 0 });
  const pinchStartOffset = React.useRef({ x: 0, y: 0 });

  // Fungsi utilitas untuk menghitung jarak antara dua sentuhan
  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  // Reset zoom, posisi geser, dan rotasi
  const handleReset = React.useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setRotation(0);
    lastOffset.current = { x: 0, y: 0 };
  }, []);

  const handleZoomIn = () => {
    setScale((prev) => {
      const next = Math.min(prev + 0.5, 5);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Mouse drag handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    lastOffset.current = offset;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    if (Math.hypot(dx, dy) > 5) {
      hasMoved.current = true;
    }

    setOffset({
      x: lastOffset.current.x + dx,
      y: lastOffset.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    lastOffset.current = offset;
  };

  // Touch gesture handlers (Mobile & Tablet)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    hasMoved.current = false;
    if (e.touches.length === 1) {
      // Geser dengan satu jari
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastOffset.current = offset;
    } else if (e.touches.length === 2) {
      // Cubit (pinch-to-zoom) dan geser dengan dua jari sekaligus
      setIsDragging(false); // Matikan geser biasa
      const dist = getDistance(e.touches[0], e.touches[1]);
      pinchStartDistance.current = dist;
      pinchStartScale.current = scale;

      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      pinchStartCenter.current = { x: cx, y: cy };
      pinchStartOffset.current = offset;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      
      if (Math.hypot(dx, dy) > 5) {
        hasMoved.current = true;
      }

      setOffset({
        x: lastOffset.current.x + dx,
        y: lastOffset.current.y + dy,
      });
    } else if (e.touches.length === 2 && pinchStartDistance.current !== null) {
      e.preventDefault(); // Mencegah scroll default browser saat mencubit
      const dist = getDistance(e.touches[0], e.touches[1]);
      const factor = dist / pinchStartDistance.current;
      const newScale = Math.min(Math.max(pinchStartScale.current * factor, 1), 5);
      setScale(newScale);
      hasMoved.current = true;

      // Geser (panning) saat mencubit dengan dua jari ke semua arah
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const dx = cx - pinchStartCenter.current.x;
      const dy = cy - pinchStartCenter.current.y;

      setOffset({
        x: pinchStartOffset.current.x + dx,
        y: pinchStartOffset.current.y + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      pinchStartDistance.current = null;
      lastOffset.current = offset;
    } else if (e.touches.length === 1) {
      // Transisi dari 2 jari kembali ke 1 jari
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastOffset.current = offset;
      pinchStartDistance.current = null;
    }
  };

  // Zoom dengan scroll wheel (Desktop)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const zoomFactor = 0.15;
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + direction * zoomFactor, 1), 5);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  // Klik di luar gambar / background untuk menutup (jika tidak sedang digeser)
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !hasMoved.current) {
      onClose();
    }
  };

  // Navigasi keyboard (Escape, +, -, 0, r untuk putar)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '=' || e.key === '+') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
      if (e.key === 'r' || e.key === 'R') handleRotate();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleReset]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 mountaineer-overlay z-[100000] flex flex-col items-center justify-center bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[inset_0_0_80px_rgba(255,255,255,0.05)] select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Tombol Tutup */}
      <button
        onClick={onClose}
        id="btn-close-lightbox"
        className="absolute top-6 right-6 p-3 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-300 z-50 cursor-pointer shadow-lg"
        aria-label="Tutup"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Area Gambar Utama */}
      <div
        id="lightbox-image-container"
        onClick={handleBackgroundClick}
        className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <motion.div
          animate={{
            x: offset.x,
            y: offset.y,
            scale: scale,
            rotate: rotation,
          }}
          transition={isDragging ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 280, damping: 28 }}
          className="relative max-w-[90%] max-h-[80%] flex items-center justify-center pointer-events-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/10"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>

      {/* Panel Kontrol Zoom, Putar, & Reset */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-10 p-1.5 rounded-2xl border border-white/10 bg-neutral-900/80 backdrop-blur-md shadow-2xl flex items-center gap-4 z-50 px-4 py-2"
      >
        <button
          onClick={handleZoomOut}
          disabled={scale <= 1}
          id="btn-zoom-out"
          className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-bold tracking-wider text-slate-300 min-w-[50px] text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          disabled={scale >= 5}
          id="btn-zoom-in"
          className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/10" />

        <button
          onClick={handleRotate}
          id="btn-rotate"
          className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title="Putar Foto (90°)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/10" />

        <button
          onClick={handleReset}
          disabled={scale === 1 && offset.x === 0 && offset.y === 0 && rotation === 0}
          id="btn-zoom-reset"
          className="p-2.5 rounded-xl border border-white/5 bg-white/5 text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          title="Reset Semua"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </motion.div>
    </motion.div>
  );
}
