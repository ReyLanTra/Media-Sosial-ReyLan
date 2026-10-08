'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import { SiteSettings } from '@/lib/db';

interface SecurityGuardProps {
  settings: Partial<SiteSettings>;
}

export default function SecurityGuard({ settings }: SecurityGuardProps) {
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = React.useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Zoom lock (disable_zoom)
    const handleTouchStart = (e: TouchEvent) => {
      if (settings.disable_zoom && e.touches.length > 1) {
        e.preventDefault();
        showToast('⚠️ Tindakan Dilarang: Fitur zoom (pinch zoom) dinonaktifkan demi keamanan!');
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
        showToast('⚠️ Tindakan Dilarang: Gestur zoom dinonaktifkan!');
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (settings.disable_zoom && e.ctrlKey) {
        e.preventDefault();
        showToast('⚠️ Tindakan Dilarang: Zoom via Ctrl+Wheel dinonaktifkan!');
      }
    };

    // 2. Anti Inspect Shortcuts (disable_inspect) & Ctrl+/- Zoom lock
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom lock keyboard shortcuts
      if (settings.disable_zoom && e.ctrlKey && (
        e.key === '=' || e.key === '-' || e.key === '0' || e.key === '+' ||
        e.code === 'Equal' || e.code === 'Minus' || e.code === 'Digit0'
      )) {
        e.preventDefault();
        showToast('⚠️ Tindakan Dilarang: Perubahan skala halaman dinonaktifkan!');
        return;
      }

      // Anti Inspect Shortcuts (F12, Ctrl+Shift+I/J/C, Cmd+Opt+I/J/C, Ctrl+U, Cmd+Opt+U, Ctrl+S)
      if (settings.disable_inspect) {
        const key = e.key.toLowerCase();
        const code = e.code.toLowerCase();
        const isCmdOrCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const isAlt = e.altKey;

        // F12
        if (key === 'f12' || code === 'f12') {
          e.preventDefault();
          e.stopPropagation();
          showToast('⚠️ Tindakan Dilarang: Akses Inspeksi Element / DevTools (F12) dikunci oleh pemilik situs!');
          return;
        }

        // Ctrl+Shift+I / J / C or Cmd+Opt+I / J / C
        if ((isCmdOrCtrl && isShift && (key === 'i' || key === 'j' || key === 'c')) ||
            (e.metaKey && isAlt && (key === 'i' || key === 'j' || key === 'c'))) {
          e.preventDefault();
          e.stopPropagation();
          showToast('⚠️ Tindakan Dilarang: Pintasan Inspeksi Website (DevTools) dilarang!');
          return;
        }

        // View Source: Ctrl+U or Cmd+U or Cmd+Opt+U
        if ((isCmdOrCtrl && key === 'u') || (e.metaKey && isAlt && key === 'u')) {
          e.preventDefault();
          e.stopPropagation();
          showToast('⚠️ Tindakan Dilarang: Melihat kode sumber (View Source) dilarang!');
          return;
        }

        // Save Page: Ctrl+S / Cmd+S
        if (isCmdOrCtrl && key === 's') {
          e.preventDefault();
          e.stopPropagation();
          showToast('⚠️ Tindakan Dilarang: Menyimpan seluruh halaman dilarang!');
          return;
        }
      }
    };

    // Viewport meta for disable_zoom
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

    // 3. Scroll lock
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

    // 4. Context Menu (Klik Kanan Global & Gambar)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (settings.disable_right_click) {
        e.preventDefault();
        showToast('⚠️ Tindakan Dilarang: Fitur Klik Kanan dinonaktifkan demi keamanan situs!');
        return;
      }

      if (settings.disable_image_save && (target.closest('img') || target.closest('video'))) {
        e.preventDefault();
        showToast('⚠️ Tindakan Dilarang: Penyimpanan / pengunduhan berkas media dilarang!');
        return;
      }

      if (settings.disable_link_preview && target.closest('a')) {
        e.preventDefault();
        showToast('⚠️ Tindakan Dilarang: Pratinjau tautan dilarang!');
        return;
      }
    };

    // 5. Text Selection & Copy
    const handleSelectStart = (e: Event) => {
      if (settings.disable_text_select) {
        const target = e.target as HTMLElement;
        if (!target.closest('input') && !target.closest('textarea')) {
          e.preventDefault();
          // DO NOT call showToast here! Calling showToast on selectstart causes
          // toast to appear on simple tap or left click.
        }
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (settings.disable_text_select) {
        const target = e.target as HTMLElement;
        if (!target.closest('input') && !target.closest('textarea')) {
          e.preventDefault();
          showToast('⚠️ Tindakan Dilarang: Menyalin isi teks dilarang!');
        }
      }
    };

    // 6. Drag Start
    const handleDragStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (settings.disable_image_save && (target.closest('img') || target.closest('video'))) {
        e.preventDefault();
        showToast('⚠️ Tindakan Dilarang: Penyeretan file media dilarang!');
      }
    };

    // 7. Pull to refresh
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
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', preventTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGestureStart);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);

      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehaviorY = '';
      document.body.style.overscrollBehaviorY = '';
    };
  }, [settings, showToast]);

  return (
    <>
      {/* Dynamic Security Style Injector */}
      <style dangerouslySetInnerHTML={{ __html: `
        ${settings.disable_text_select ? `
          body, html, :root { -webkit-user-select: none !important; user-select: none !important; }
          input, textarea, [contenteditable="true"] { -webkit-user-select: text !important; user-select: text !important; }
        ` : ''}
        ${settings.disable_image_save ? `
          img, video { -webkit-touch-callout: none !important; -webkit-user-drag: none !important; }
        ` : ''}
        ${settings.disable_link_preview ? `
          a, button, [role="button"] { -webkit-touch-callout: none !important; }
        ` : ''}
        ${settings.disable_pull_refresh ? `
          body, html { overscroll-behavior-y: none !important; overscroll-behavior: none !important; }
        ` : ''}
      `}} />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[999999] max-w-md w-[92vw] sm:w-auto px-5 py-3.5 rounded-2xl border border-red-500/40 bg-slate-950/95 text-red-200 shadow-[0_10px_35px_rgba(239,68,68,0.3)] backdrop-blur-2xl flex items-center gap-3 text-xs font-semibold leading-relaxed"
          >
            <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
              <Lock className="w-4 h-4 animate-pulse" />
            </div>
            <span className="flex-1">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
