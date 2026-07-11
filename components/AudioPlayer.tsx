'use client';

import * as React from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  url: string | null;
  volume: number; // 0 s.d 100
  enabled: boolean;
}

export default function AudioPlayer({ url, volume, enabled }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(true);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    let timerId: NodeJS.Timeout;
    let errorTimerId: NodeJS.Timeout;

    // Jika tidak ada URL, dinonaktifkan, atau terjadi error sebelumnya, bersihkan instansi audio
    if (!url || !enabled) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      timerId = setTimeout(() => {
        setIsPlaying(false);
      }, 0);
      return () => clearTimeout(timerId);
    }

    errorTimerId = setTimeout(() => {
      setHasError(false);
    }, 0);

    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume / 100;
    audioRef.current = audio;

    audio.onerror = () => {
      console.warn('Gagal memuat audio musik latar belakang dari URL:', url);
      setHasError(true);
      setIsPlaying(false);
    };

    return () => {
      clearTimeout(errorTimerId);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [url, enabled, volume]);

  // Pantau perubahan volume secara real-time dari panel pengaturan
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Dengarkan event kustom 'play-backsound' dari layar Klik Untuk Masuk
  React.useEffect(() => {
    const handlePlayEvent = () => {
      if (audioRef.current && !hasError) {
        setShowTooltip(false);
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.error('Gagal memutar audio dari event kustom:', err);
          });
      }
    };

    window.addEventListener('play-backsound', handlePlayEvent);
    return () => {
      window.removeEventListener('play-backsound', handlePlayEvent);
    };
  }, [hasError]);

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;

    setShowTooltip(false);

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Pemutaran musik diblokir oleh sistem keamanan browser, memerlukan ketukan pengguna:', err);
        });
    }
  };

  if (!url || !enabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3">
      {/* Tooltip Petunjuk Interaksi */}
      {showTooltip && (
        <div className="bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-sans text-blue-200 px-3 py-1.5 rounded-xl shadow-xl animate-bounce whitespace-nowrap select-none pointer-events-none">
          🎵 Sentuh untuk Musik
        </div>
      )}

      <button
        onClick={togglePlay}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-500 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.5)] group ${
          isPlaying 
            ? 'bg-blue-500/25 border-blue-400/50 text-blue-300 ring-4 ring-blue-500/10' 
            : 'bg-black/40 border-white/20 text-slate-300 hover:text-white hover:bg-white/10 animate-pulse'
        }`}
        title={isPlaying ? 'Matikan Musik' : 'Putar Musik'}
      >
        {/* Glow Ring behind button */}
        <div className={`absolute -inset-1 rounded-full blur-md opacity-40 transition-opacity group-hover:opacity-100 ${
          isPlaying ? 'bg-blue-500' : 'bg-white'
        }`}></div>

        <div className="relative z-10 flex items-center justify-center">
          {isPlaying ? (
            <div className="flex items-center gap-1">
              <Pause className="w-5 h-5 animate-pulse" />
              {/* Visualizer Bar Kecil */}
              <div className="flex items-end gap-[1.5px] h-3.5">
                <span className="w-[1.5px] bg-blue-300 rounded-full animate-[bounce_1s_infinite_100ms] h-2"></span>
                <span className="w-[1.5px] bg-blue-300 rounded-full animate-[bounce_0.8s_infinite_300ms] h-3.5"></span>
                <span className="w-[1.5px] bg-blue-300 rounded-full animate-[bounce_1.2s_infinite_0ms] h-1.5"></span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Play className="w-5 h-5 opacity-80 group-hover:scale-110 transition-transform duration-300" />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

