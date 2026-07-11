'use client';

import * as React from 'react';

import { motion, AnimatePresence } from 'motion/react';
import { BackgroundImage } from '@/lib/db';

interface BackgroundMediaProps {
  url: string | null;
  type: 'image' | 'gif' | 'video';
  mobileImages: BackgroundImage[];
  desktopImages: BackgroundImage[];
  mobileInterval: number;
  desktopInterval: number;
  isMobile: boolean;
}

export default function BackgroundMedia({ 
  url, 
  type, 
  mobileImages, 
  desktopImages, 
  mobileInterval, 
  desktopInterval,
  isMobile 
}: BackgroundMediaProps) {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const images = isMobile ? mobileImages : desktopImages;
  const interval = isMobile ? mobileInterval : desktopInterval;

  // Slideshow logic
  React.useEffect(() => {
    if (images.length <= 1 || type !== 'image') return;
    
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % images.length);
    }, interval * 1000);

    return () => clearInterval(timer);
  }, [images.length, interval, type]);

  // Fallback to default if no images/url
  if ((!url && images.length === 0)) {
    return (
      <div className="absolute inset-0 -z-50 bg-radial from-neutral-900 via-neutral-950 to-black">
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  const renderSlideshow = () => (
    <AnimatePresence mode="wait">
      <motion.img
        key={images[currentIdx]?.id || 'static'}
        src={images.length > 0 ? images[currentIdx].image_url : (url || '')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
        className="absolute inset-0 w-full h-full object-cover scale-105"
        referrerPolicy="no-referrer"
      />
    </AnimatePresence>
  );

  return (
    <div className="absolute inset-0 -z-50 overflow-hidden w-full h-full select-none pointer-events-none">
      {/* Gelap overlay untuk kenyamanan membaca teks */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] z-10" />

      {type === 'video' ? (
        <video
          key={url}
          src={url || ''}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          className="w-full h-full object-cover scale-105"
        />
      ) : (
        renderSlideshow()
      )}
    </div>
  );
}
