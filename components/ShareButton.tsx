'use client';

import * as React from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ShareButton() {
  const [copied, setCopied] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);

  const handleShare = async () => {
    const shareData = {
      title: document.title,
      text: 'Cek profil resmi ReyLan di sini!',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      setShowMenu(!showMenu);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 2000);
  };

  return (
    <div className="fixed top-6 right-6 z-[9998]">
      <button
        onClick={handleShare}
        className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg"
        title="Bagikan Profil"
      >
        <Share2 className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute top-12 right-0 mt-2 p-2 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl min-w-[160px]"
          >
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-xs text-white transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Berhasil Salin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Tautan</span>
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
