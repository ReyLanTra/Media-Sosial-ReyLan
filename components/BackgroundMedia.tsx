'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BackgroundImage } from '@/lib/db';

interface BackgroundMediaProps {
  url: string | null;
  type: 'image' | 'gif' | 'video';
  desktopUrl: string | null;
  desktopType: 'image' | 'gif' | 'video';
  mobileImages: BackgroundImage[];
  desktopImages: BackgroundImage[];
  mobileInterval: number;
  desktopInterval: number;
  mobileTransition: 'fade' | 'slide' | 'zoom';
  desktopTransition: 'fade' | 'slide' | 'zoom';
  isMobile: boolean;
}

export default function BackgroundMedia({ 
  url, 
  type, 
  desktopUrl,
  desktopType,
  mobileImages, 
  desktopImages, 
  mobileInterval, 
  desktopInterval,
  mobileTransition,
  desktopTransition,
  isMobile 
}: BackgroundMediaProps) {
  const [currentIdx, setCurrentIdx] = React.useState(0);
  
  const activeImages = isMobile ? mobileImages : desktopImages;
  const activeInterval = isMobile ? mobileInterval : desktopInterval;
  const activeType = isMobile ? type : desktopType;
  const activeUrl = isMobile ? url : desktopUrl;
  const activeTransition = isMobile ? (mobileTransition || 'fade') : (desktopTransition || 'fade');

  // Slideshow logic
  React.useEffect(() => {
    if (activeImages.length <= 1 || activeType !== 'image') {
      return;
    }
    
    // Reset timer setiap kali interval atau daftar gambar berubah
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeImages.length);
    }, activeInterval * 1000);

    return () => clearInterval(timer);
  }, [activeImages.length, activeInterval, activeType]);

  // Fallback to default if no media available
  if ((!activeUrl && activeImages.length === 0)) {
    return (
      <div className="fixed inset-0 -z-50 bg-radial from-neutral-900 via-neutral-950 to-black">
        <div className="fixed inset-0 bg-black/40" />
      </div>
    );
  }

  const getVariants = () => {
    switch (activeTransition) {
      case 'slide':
        return {
          initial: { opacity: 0, x: 100 },
          animate: { opacity: 1, x: 0 },
          exit: { opacity: 0, x: -100 }
        };
      case 'zoom':
      case 'fade':
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };
    }
  };

  const variants = getVariants();

  const renderContent = () => {
    if (activeType === 'video') {
      return (
        <video
          key={activeUrl}
          src={activeUrl || ''}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          className="w-full h-full object-cover"
        />
      );
    }

    if (activeType === 'gif') {
      return (
        <img
          src={activeUrl || ''}
          alt="Latar Belakang Animasi"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Default to Slideshow for type 'image'
    return (
      <AnimatePresence mode="popLayout">
        <motion.img
          key={activeImages[currentIdx]?.id || 'static'}
          src={activeImages.length > 0 ? activeImages[currentIdx].image_url : (activeUrl || '')}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={{ 
            duration: activeTransition === 'fade' ? 1.5 : 0.8, 
            ease: 'easeInOut' 
          }}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
    );
  };

  return (
    <div key={isMobile ? 'mobile' : 'desktop'} className="fixed inset-0 -z-50 overflow-hidden w-full h-full select-none pointer-events-none">
      {/* Gelap overlay untuk kenyamanan membaca teks */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] z-10" />

      {renderContent()}
    </div>
  );
}
