'use client';

import * as React from 'react';

interface BackgroundMediaProps {
  url: string | null;
  type: 'image' | 'gif' | 'video';
}

export default function BackgroundMedia({ url, type }: BackgroundMediaProps) {
  const [hasError, setHasError] = React.useState(false);

  // Jika tidak ada URL latar belakang, gunakan kecerahan gelap radial default yang indah
  if (!url || hasError) {
    return (
      <div className="absolute inset-0 -z-50 bg-radial from-neutral-900 via-neutral-950 to-black">
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 -z-50 overflow-hidden w-full h-full select-none pointer-events-none">
      {/* Gelap overlay untuk kenyamanan membaca teks */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] z-10" />

      {type === 'video' ? (
        <video
          key={url} // Memicu re-render video saat URL diubah di settings
          src={url}
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          className="w-full h-full object-cover scale-105"
          onError={() => setHasError(true)}
        />
      ) : (
        <img
          src={url}
          alt="Latar Belakang ReyLan"
          className="w-full h-full object-cover scale-105 transition-all duration-1000"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
