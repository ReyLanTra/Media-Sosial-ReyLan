'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronRight, Sparkles, Smartphone } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SiteSettings, SocialButton } from '@/lib/db';
import BackgroundMedia from './BackgroundMedia';
import AudioPlayer from './AudioPlayer';
import MobileWarning from './MobileWarning';
import VerificationBadge from './VerificationBadge';

interface ProfileViewProps {
  settings: SiteSettings;
  buttons: SocialButton[];
}

export default function ProfileView({ settings, buttons }: ProfileViewProps) {
  const isMobile = useIsMobile();

  // Mematikan scroll, drag to refresh, klik kanan, copy teks, dan long press preview di halaman utama
  React.useEffect(() => {
    if (isMobile === false) return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
    };

    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    // Deteksi touchmove untuk membatasi scroll luar halaman
    const preventTouchMove = (e: TouchEvent) => {
      // Izinkan scroll hanya jika berada di dalam area scrollable-content, selebihnya di-block
      const target = e.target as HTMLElement;
      if (target.closest('.scrollable-content')) {
        return;
      }
      e.preventDefault();
    };

    // Tambahkan event listeners
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    // Tambahkan properti body
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventDefault);
      document.removeEventListener('touchmove', preventTouchMove);
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    };
  }, [isMobile]);

  // Memastikan rendering aman dari inkonsistensi hidrasi (hydration mismatch)
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

  // Jika diakses menggunakan browser desktop, tampilkan peringatan khusus mobile
  if (isMobile === false) {
    return <MobileWarning />;
  }

  // Filter hanya tombol sosial yang aktif dan urutkan berdasarkan display_order
  const activeButtons = buttons
    .filter((btn) => btn.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  // Variasi animasi untuk container bento/daftar tombol
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        type: 'spring' as const, 
        stiffness: 100, 
        damping: 15 
      } 
    },
  };

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden flex flex-col items-center justify-between p-6 text-white font-sans select-none overscroll-none touch-none">
      {/* Latar Belakang Dinamis */}
      <BackgroundMedia url={settings.background_url} type={settings.background_type} />

      {/* Musik Latar Mengambang */}
      <AudioPlayer
        url={settings.backsound_url}
        volume={settings.backsound_volume}
        enabled={settings.backsound_enabled}
      />

      {/* Kontainer Profil Utama - Ditambahkan scrollable-content agar isi bento tetap bisa di-scroll internal jika HP kecil */}
      <div className="w-full max-w-md my-auto space-y-8 py-6 z-20 overflow-y-auto max-h-[82vh] scrollable-content no-scrollbar pr-0.5">
        
        {/* Foto & Info Header */}
        <div className="flex flex-col items-center text-center space-y-5">
          {/* Foto Profil dengan Cahaya Berpendar Lingkaran */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, delay: 0.1 }}
            className="relative group"
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Glow Ring Effect */}
            <div className="absolute -inset-1.5 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
            
            {/* Avatar Frame */}
            <div className="relative w-28 h-28 rounded-full p-1 bg-white/20 border border-white/30 backdrop-blur-md overflow-hidden">
              {settings.profile_photo_url ? (
                <img
                  src={settings.profile_photo_url}
                  alt={settings.account_name}
                  className="w-full h-full object-cover rounded-full select-none"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="text-xl font-bold uppercase">{settings.account_name.substring(0, 2)}</span>
                </div>
              )}
            </div>
            
            {/* Sparkle Float */}
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-full border border-blue-400/50 shadow-lg shadow-blue-500/20">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
          </motion.div>

          {/* Nama & Lencana Verifikasi */}
          <div className="space-y-1.5">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-display text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5"
            >
              <span>{settings.account_name}</span>
              {settings.is_verified && <VerificationBadge className="w-6 h-6" />}
            </motion.h1>
            
            {/* Tagline / Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xs font-mono text-blue-300 tracking-widest uppercase font-semibold"
            >
              Official Link-in-Bio
            </motion.p>
          </div>

          {/* Deskripsi Bio dalam Panel Kaca Kecil */}
          {settings.bio && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full p-4 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md shadow-xl text-sm leading-relaxed text-slate-200"
            >
              {settings.bio}
            </motion.div>
          )}
        </div>

        {/* Daftar Tombol Media Sosial */}
        {activeButtons.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3.5 w-full"
          >
            {activeButtons.map((btn) => (
              <motion.a
                key={btn.id}
                variants={itemVariants}
                href={btn.target_url}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg cursor-pointer"
              >
                {/* Highlight Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="flex items-center gap-3.5 z-10">
                  {/* Kotak Kecil Membulat untuk Logo */}
                  <div className="w-11 h-11 rounded-xl p-0.5 bg-neutral-900/60 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                    <img
                      src={btn.logo_url}
                      alt={btn.platform_name}
                      className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>

                  {/* Nama Platform */}
                  <span className="font-semibold text-sm tracking-wide text-white group-hover:text-blue-200 transition-colors">
                    {btn.platform_name}
                  </span>
                </div>

                {/* Ikon Panah Kecil Geser saat Hover */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/50 group-hover:text-blue-300 group-hover:border-blue-500/30 group-hover:bg-blue-500/10 transition-all duration-300 z-10">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        ) : (
          <div className="text-center p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
            <p className="text-sm text-slate-400">Belum ada media sosial yang terdaftar.</p>
          </div>
        )}

      </div>

      {/* Teks Footer Kecil Opasitas Rendah */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.8 }}
        className="text-[10px] tracking-widest uppercase font-mono text-slate-400 text-center py-6 mt-auto z-20 hover:opacity-80 transition-opacity duration-300 select-none"
      >
        {settings.footer_text || '© 2026 Media Sosial ReyLan.'}
      </motion.footer>
    </div>
  );
}
