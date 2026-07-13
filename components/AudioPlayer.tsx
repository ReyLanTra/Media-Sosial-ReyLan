'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Music, SkipForward, SkipBack } from 'lucide-react';
import { MusicTrack } from '@/lib/db';

interface AudioPlayerProps {
  tracks: MusicTrack[];
  volume: number; // 0 s.d 100
  enabled: boolean;
  accountName?: string;
  profilePhotoUrl?: string;
}

export default function AudioPlayer({ tracks, volume, enabled, accountName, profilePhotoUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = React.useState(0);
  const [showTooltip, setShowTooltip] = React.useState(true);
  const [position, setPosition] = React.useState<{ x: number, y: number }>(() => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    const savedPos = localStorage.getItem('audio_button_pos');
    if (savedPos) {
      try {
        return JSON.parse(savedPos);
      } catch (e) {
        console.error('Error parsing saved position');
      }
    }
    // Default position: bottom right
    return { x: window.innerWidth - 80, y: window.innerHeight - 80 };
  });
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const playNext = React.useCallback(() => {
    setCurrentTrackIdx((prev) => (prev + 1) % tracks.length);
  }, [tracks.length]);

  const playPrevious = React.useCallback(() => {
    setCurrentTrackIdx((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  const currentTrack = tracks[currentTrackIdx];

  // Initialize audio element only once
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => {
      playNext();
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [playNext]);

  // Handle current track changes
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || !enabled) return;

    const isSameSrc = audio.src === currentTrack.audio_url || 
                     (currentTrack.audio_url.startsWith('http') && audio.src.includes(currentTrack.audio_url));

    if (!isSameSrc) {
      audio.src = currentTrack.audio_url;
      audio.load();
      if (isPlaying) {
        audio.play().catch(console.error);
      }
    }
  }, [currentTrack, enabled, isPlaying]);

  // Media Session API Setup
  React.useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || 'Musik ReyLan',
      artist: accountName || 'ReyLan Official',
      album: 'ReyLan Link-in-Bio',
      artwork: profilePhotoUrl ? [{ src: profilePhotoUrl, sizes: '512x512', type: 'image/png' }] : [],
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().then(() => setIsPlaying(true));
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrevious();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [currentTrack, accountName, profilePhotoUrl, playNext, playPrevious]);

  // Handle Play/Pause and Enabled/Disabled
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!enabled) {
      audio.pause();
      if (isPlaying) setIsPlaying(false);
      return;
    }

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying, enabled]);

  // Volume control
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Listen for custom 'play-backsound'
  React.useEffect(() => {
    const handlePlayEvent = () => {
      if (audioRef.current && !isPlaying) {
        setShowTooltip(false);
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(console.error);
      }
    };
    window.addEventListener('play-backsound', handlePlayEvent);
    return () => window.removeEventListener('play-backsound', handlePlayEvent);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    setShowTooltip(false);
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const { x, y } = info.point;
    const screenWidth = window.innerWidth;
    const snapTo = x < screenWidth / 2 ? 24 : screenWidth - 72; // Snap to left or right side (24px padding)
    
    const newPos = { x: snapTo, y };
    setPosition(newPos);
    localStorage.setItem('audio_button_pos', JSON.stringify(newPos));
  };

  if (tracks.length === 0 || !enabled) return null;

  return (
    <motion.div 
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 z-[9999] flex flex-col items-center gap-2 touch-none"
    >
      {showTooltip && (
        <div className="absolute bottom-full mb-3 bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-sans text-blue-200 px-3 py-1.5 rounded-xl shadow-xl animate-bounce whitespace-nowrap select-none pointer-events-none">
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
      >
        <div className={`absolute -inset-1 rounded-full blur-md opacity-40 transition-opacity group-hover:opacity-100 ${
          isPlaying ? 'bg-blue-500' : 'bg-white'
        }`}></div>

        <div className="relative z-10 flex items-center justify-center">
          {isPlaying ? (
            <div className="flex items-center gap-1">
              <Pause className="w-5 h-5 animate-pulse" />
              <div className="flex items-end gap-[1.5px] h-3.5">
                <span className="w-[1.5px] bg-blue-300 rounded-full animate-[bounce_1s_infinite_100ms] h-2"></span>
                <span className="w-[1.5px] bg-blue-300 rounded-full animate-[bounce_0.8s_infinite_300ms] h-3.5"></span>
                <span className="w-[1.5px] bg-blue-300 rounded-full animate-[bounce_1.2s_infinite_0ms] h-1.5"></span>
              </div>
            </div>
          ) : (
            <Play className="w-5 h-5 opacity-80" />
          )}
        </div>
      </button>

      {isPlaying && tracks.length > 1 && (
        <div className="flex items-center gap-1.5">
          <button 
            onClick={playPrevious}
            className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button 
            onClick={playNext}
            className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

