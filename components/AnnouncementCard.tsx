'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Megaphone, Info, ExternalLink } from 'lucide-react';
import { Announcement } from '@/lib/db';

interface AnnouncementCardProps {
  announcements: Announcement[];
}

export default function AnnouncementCard({ announcements }: AnnouncementCardProps) {
  // Hanya simpan state 'tutup' di memori (session), tidak di localStorage agar sesuai permintaan 'sementara saja'
  const [closedIds, setClosedIds] = React.useState<Set<string>>(new Set());

  const activeAnnouncements = announcements
    .filter(a => a.is_active && !closedIds.has(a.id))
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  if (activeAnnouncements.length === 0) return null;

  const handleClose = (id: string) => {
    setClosedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full space-y-3">
      <AnimatePresence>
        {activeAnnouncements.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="relative group overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl"
          >
            {/* Background Glow Accent */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/20 blur-3xl rounded-full" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-purple-500/20 blur-3xl rounded-full" />

            <div className="relative p-4 flex gap-4">
              {/* Media Section */}
              {(item.photo_url || item.media_url) && (
                <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                  {item.media_url?.match(/\.(mp4|webm|ogg)$/) ? (
                    <video 
                      src={item.media_url} 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <img 
                      src={item.photo_url || item.media_url || ''} 
                      alt="Media Pengumuman" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              )}

              {/* Text Content */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                  <h3 className="text-sm font-bold tracking-tight text-white line-clamp-1">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">
                  {item.content}
                </p>
                {item.cta_url && (
                  <a 
                    href={item.cta_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 hover:text-blue-100 transition-colors uppercase tracking-widest"
                  >
                    <span>{item.cta_text || 'Selengkapnya'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => handleClose(item.id)}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 border border-white/10 text-white/50 hover:text-white transition-all active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
