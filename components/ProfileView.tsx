'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SiteSettings, SocialButton, BackgroundImage, MusicTrack } from '@/lib/db';
import BackgroundMedia from './BackgroundMedia';
import AudioPlayer from './AudioPlayer';
import VerificationBadge from './VerificationBadge';
import ShareButton from './ShareButton';
import AccessDenied from './AccessDenied';

interface ProfileViewProps {
  settings: SiteSettings;
  buttons: SocialButton[];
  mobileBgImages: BackgroundImage[];
  desktopBgImages: BackgroundImage[];
  tracks: MusicTrack[];
}

export default function ProfileView({ 
  settings: initialSettings, 
  buttons = [], 
  mobileBgImages = [], 
  desktopBgImages = [], 
  tracks = [] 
}: ProfileViewProps) {
  const isMobile = useIsMobile();
  const [hasEntered, setHasEntered] = React.useState(false);

  const handleEnter = () => {
    setHasEntered(true);
    // Kirim event kustom untuk memutar backsound
    const event = new CustomEvent('play-backsound');
    window.dispatchEvent(event);
  };

  const settings = React.useMemo(() => {
    return initialSettings || {
      account_name: 'Media Sosial ReyLan',
      is_verified: true,
      bio: 'Selamat datang di halaman profil resmi ReyLan. Hubungkan diri Anda dengan saya melalui media sosial di bawah!',
      profile_photo_url: 'https://picsum.photos/seed/reylan_profile/150/150',
      favicon_url: null,
      background_url: 'https://picsum.photos/seed/reylan_bg/1920/1080',
      background_type: 'image' as const,
      backsound_url: null,
      backsound_volume: 50,
      backsound_enabled: true,
      footer_text: '© 2026 ReyLan. All rights reserved.',
      tagline_text: 'OFFICIAL LINK-IN-BIO',
      profile_glow_mode: 'solid',
      profile_glow_color_start: '#8083ff',
      profile_glow_color_end: '#ffb0cd',
      profile_glow_direction: 'radial',
      disable_zoom: false,
      disable_scroll: false,
      disable_image_save: false,
      disable_text_select: false,
      disable_pull_refresh: false,
      disable_link_preview: false,
      allow_desktop_access: true,
      allow_mobile_access: true,
      mobile_bg_slideshow_interval: 5,
      desktop_bg_slideshow_interval: 5,
    };
  }, [initialSettings]);

  // Mematikan fungsionalitas interaksi secara dinamis dan independen berdasarkan opsi admin
  React.useEffect(() => {
    // 1. Zoom lock (disable_zoom)
    const handleTouchStart = (e: TouchEvent) => {
      if (settings.disable_zoom && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      if (settings.disable_zoom) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      }
    };

    const handleGestureStart = (e: Event) => {
      if (settings.disable_zoom) {
        e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (settings.disable_zoom && e.ctrlKey) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (settings.disable_zoom && e.ctrlKey && (
        e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+' ||
        e.code === 'Equal' || e.code === 'Minus' || e.code === 'Digit0'
      )) {
        e.preventDefault();
      }
    };

    const meta = document.querySelector('meta[name="viewport"]');
    if (settings.disable_zoom) {
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    } else {
      if (meta) {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
      }
    }

    // 2. Scroll lock & Zoom lock combined touchmove handler
    const preventTouchMove = (e: TouchEvent) => {
      if (settings.disable_zoom && e.touches.length > 1) {
        e.preventDefault();
        return;
      }
      if (settings.disable_scroll) {
        const target = e.target as HTMLElement;
        if (target.closest('.scrollable-content')) {
          return;
        }
        e.preventDefault();
      }
    };

    if (settings.disable_scroll) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    }

    // 3. Klik kanan / long-press pada gambar (disable_image_save) & long-press preview link (disable_link_preview)
    const handleGlobalContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (settings.disable_image_save && target.closest('img')) {
        e.preventDefault();
      }
      if (settings.disable_link_preview && target.closest('a')) {
        e.preventDefault();
      }
    };

    // 4. Copy / Text select (disable_text_select)
    const handleSelectStart = (e: Event) => {
      if (settings.disable_text_select) {
        e.preventDefault();
      }
    };

    // 5. Drag start (untuk gambar atau text)
    const handleDragStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (settings.disable_image_save && target.closest('img')) {
        e.preventDefault();
      }
    };

    // 6. Pull to refresh (disable_pull_refresh)
    if (settings.disable_pull_refresh) {
      document.documentElement.style.overscrollBehaviorY = 'none';
      document.body.style.overscrollBehaviorY = 'none';
    } else {
      document.documentElement.style.overscrollBehaviorY = '';
      document.body.style.overscrollBehaviorY = '';
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', preventTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', handleGestureStart, { passive: false });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    document.addEventListener('contextmenu', handleGlobalContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', preventTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGestureStart);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehaviorY = '';
      document.body.style.overscrollBehaviorY = '';
    };
  }, [settings]);

  // Hydration safety
  if (isMobile === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-mono text-slate-400 animate-pulse">Menghubungkan...</p>
        </div>
      </div>
    );
  }

  // Device Access Control
  if (isMobile && !settings.allow_mobile_access) {
    return <AccessDenied type="mobile" />;
  }
  if (!isMobile && !settings.allow_desktop_access) {
    return <AccessDenied type="desktop" />;
  }

  // Filter & Sort Buttons
  const activeButtons = (buttons || [])
    .filter((btn) => btn && btn.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  // Glow Style Calculation
  const getGlowStyle = (): React.CSSProperties => {
    const startColor = settings.profile_glow_color_start || '#8083ff';
    const endColor = settings.profile_glow_color_end || '#ffb0cd';
    
    if (settings.profile_glow_mode === 'gradient') {
      if (settings.profile_glow_direction === 'linear') {
        return {
          backgroundImage: `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`,
        };
      } else {
        return {
          backgroundImage: `radial-gradient(circle, ${startColor} 0%, ${endColor} 100%)`,
        };
      }
    }
    return { backgroundColor: startColor };
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 } 
    },
  };

  return (
    <div className={`fixed inset-0 h-screen w-screen overflow-hidden flex flex-col items-center justify-between p-6 text-white font-sans transition-all duration-300 ${
      settings.disable_scroll ? 'touch-none' : ''
    }`}>
      {/* Dynamic Style Injector */}
      <style dangerouslySetInnerHTML={{ __html: `
        ${settings.disable_text_select ? `
          body, html, .scrollable-content, .scrollable-content * { -webkit-user-select: none !important; user-select: none !important; }
          input, textarea { -webkit-user-select: text !important; user-select: text !important; }
        ` : ''}
        ${settings.disable_image_save ? `
          img { pointer-events: none !important; -webkit-touch-callout: none !important; -webkit-user-drag: none !important; }
        ` : ''}
        ${settings.disable_link_preview ? `
          a, button, [role="button"] { -webkit-touch-callout: none !important; }
        ` : ''}
        ${settings.disable_pull_refresh ? `
          body, html { overscroll-behavior-y: none !important; overscroll-behavior: none !important; }
        ` : ''}
      `}} />

      {/* Latar Belakang */}
      <BackgroundMedia 
        url={settings.background_url} 
        type={settings.background_type}
        mobileImages={mobileBgImages}
        desktopImages={desktopBgImages}
        mobileInterval={settings.mobile_bg_slideshow_interval || 5}
        desktopInterval={settings.desktop_bg_slideshow_interval || 5}
        isMobile={isMobile}
      />

      {/* Share Button */}
      <ShareButton />

      {/* Audio Player */}
      <AudioPlayer
        tracks={tracks}
        volume={settings.backsound_volume}
        enabled={settings.backsound_enabled}
      />

      {/* Kontainer Profil */}
      <motion.div 
        animate={{ opacity: hasEntered ? 1 : 0, scale: hasEntered ? 1 : 0.95 }}
        initial={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md my-auto space-y-8 py-6 z-20 overflow-y-auto max-h-[82vh] scrollable-content no-scrollbar pr-0.5"
      >
        <div className="flex flex-col items-center text-center space-y-5">
          <motion.div 
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, delay: 0.1 }}
            className="relative group"
          >
            <div 
              style={getGlowStyle()}
              className="absolute -inset-1.5 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"
            ></div>
            <div className="relative w-28 h-28 rounded-full p-1 bg-white/20 border border-white/30 backdrop-blur-md overflow-hidden">
              {settings.profile_photo_url ? (
                <img src={settings.profile_photo_url} alt={settings.account_name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="text-xl font-bold uppercase">{settings.account_name.substring(0, 2)}</span>
                </div>
              )}
            </div>
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-full border border-blue-400/50 shadow-lg shadow-blue-500/20">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </motion.div>

          <div className="space-y-1.5">
            <motion.h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
              <span>{settings.account_name}</span>
              {settings.is_verified && <VerificationBadge className="w-6 h-6" />}
            </motion.h1>
            {settings.tagline_text && (
              <motion.p className="text-xs font-mono text-blue-300 tracking-widest uppercase font-semibold">
                {settings.tagline_text}
              </motion.p>
            )}
          </div>

          {settings.bio && (
            <motion.div className="w-full p-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-xl text-sm leading-relaxed text-slate-200">
              {settings.bio}
            </motion.div>
          )}
        </div>

        {activeButtons.length > 0 ? (
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3.5 w-full">
            {activeButtons.map((btn) => (
              <motion.a
                key={btn.id}
                variants={itemVariants}
                href={btn.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex items-center gap-3.5 z-10">
                  <div className="w-11 h-11 rounded-xl p-0.5 bg-neutral-900/60 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                    <img src={btn.logo_url} alt={btn.platform_name} className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                  </div>
                  <span className="font-semibold text-sm tracking-wide text-white group-hover:text-blue-200 transition-colors">
                    {btn.platform_name}
                  </span>
                </div>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-blue-300 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-all duration-300 z-10">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        ) : (
          <div className="text-center p-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] backdrop-blur-sm text-slate-500 text-xs">
            <p>Belum ada media sosial yang aktif atau terdaftar.</p>
          </div>
        )}
      </motion.div>

      <motion.footer className="text-[10px] tracking-widest uppercase font-mono text-slate-400 text-center py-6 mt-auto z-20 hover:opacity-80 transition-opacity duration-300 select-none">
        {settings.footer_text || '© 2026 Media Sosial ReyLan.'}
      </motion.footer>

      <AnimatePresence>
        {!hasEntered && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            onClick={handleEnter}
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/75 backdrop-blur-3xl cursor-pointer select-none text-center p-6"
          >
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.1 }} className="space-y-4 max-w-xs">
              {settings.profile_photo_url && (
                <div className="w-20 h-20 mx-auto rounded-full p-1 bg-white/10 border border-white/20 overflow-hidden mb-2 shadow-lg">
                  <img src={settings.profile_photo_url} alt={settings.account_name} className="w-full h-full rounded-full object-cover animate-pulse" referrerPolicy="no-referrer" />
                </div>
              )}
              <h2 className="text-xl font-bold tracking-tight text-white font-display">{settings.account_name}</h2>
              {settings.bio && <p className="text-xs text-slate-400 line-clamp-2 max-w-[240px] mx-auto">{settings.bio}</p>}
              <div className="pt-4 flex flex-col items-center gap-1">
                <span className="text-[10px] text-blue-400 tracking-[0.2em] font-mono uppercase animate-pulse">KETUK UNTUK MASUK</span>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping mt-1"></div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
