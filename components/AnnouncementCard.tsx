'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Megaphone, Info, ExternalLink, Play, Pause, Volume2 } from 'lucide-react';
import { Announcement } from '@/lib/db';
import ReactMarkdown from 'react-markdown';

interface AnnouncementCardProps {
  announcements: Announcement[];
}

export default function AnnouncementCard({ announcements }: AnnouncementCardProps) {
  const [closedIds, setClosedIds] = React.useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Update current time every minute to refresh timing-based display
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeAnnouncements = announcements
    .filter(a => {
      if (!a.is_active || closedIds.has(a.id)) return false;
      
      const start = new Date(a.start_at);
      const end = a.end_at ? new Date(a.end_at) : null;
      
      // Cek apakah sudah waktunya tampil
      const isStarted = currentTime >= start;
      // Cek apakah belum waktunya dihapus
      const isNotEnded = !end || currentTime <= end;
      
      return isStarted && isNotEnded;
    })
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
    <div className="w-full space-y-4">
      <AnimatePresence>
        {activeAnnouncements.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="relative group overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
            
            <div className="relative p-5 space-y-4">
              {/* Header: Admin Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-black/40 shadow-inner">
                    {item.admin_photo_url ? (
                      <img src={item.admin_photo_url} alt={item.admin_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-blue-400 font-bold text-xs">
                        {item.admin_name?.substring(0, 1).toUpperCase() || 'A'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none">{item.admin_name || 'Admin'}</h4>
                    <span className="text-[10px] font-mono text-blue-400/80 uppercase tracking-widest">OFFICIAL UPDATE</span>
                  </div>
                </div>

                <button
                  onClick={() => handleClose(item.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 border border-white/10 text-white/50 hover:text-white transition-all active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Message Content (Markdown) */}
              <div className="markdown-body text-xs text-slate-200 leading-relaxed prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>
                  {item.content_markdown || ''}
                </ReactMarkdown>
              </div>

              {/* Media Content */}
              {item.media_url && (
                <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black/20">
                  {item.media_type === 'video' ? (
                    <video 
                      src={item.media_url} 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                      className="w-full aspect-video object-cover" 
                    />
                  ) : item.media_type === 'audio' ? (
                    <div className="p-4 flex items-center gap-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center animate-pulse">
                        <Volume2 className="w-5 h-5 text-blue-400" />
                      </div>
                      <audio 
                        src={item.media_url} 
                        controls 
                        className="flex-1 h-8 opacity-60 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  ) : (
                    <img 
                      src={item.media_url} 
                      alt="Media Pengumuman" 
                      className="w-full max-h-60 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>
              )}
            </div>
            
            {/* Decoration Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-blue-500/40" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
