'use client';

import * as React from 'react';
import { Smartphone, MonitorOff, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface AccessDeniedProps {
  type: 'mobile' | 'desktop';
}

export default function AccessDenied({ type }: AccessDeniedProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-950 text-white p-6 overflow-hidden">
      {/* Abstract background decorations */}
      <div className="absolute top-1/4 -left-20 w-64 h-64 bg-red-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-md w-full text-center space-y-6 relative z-10"
      >
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-red-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-red-500/10 border border-red-500/20 p-5 rounded-3xl backdrop-blur-md">
            {type === 'mobile' ? (
              <Smartphone className="w-12 h-12 text-red-500 mx-auto" />
            ) : (
              <MonitorOff className="w-12 h-12 text-red-500 mx-auto" />
            )}
          </div>
          <ShieldAlert className="absolute -bottom-2 -right-2 w-8 h-8 text-amber-500 drop-shadow-lg" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Akses Terbatas</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            {type === 'mobile' 
              ? 'Maaf, admin telah menonaktifkan akses dari perangkat Mobile untuk sementara waktu.' 
              : 'Maaf, admin telah menonaktifkan akses dari perangkat Desktop untuk sementara waktu.'}
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] text-xs text-slate-500 font-mono">
          STATUS: DEVICE_NOT_ALLOWED
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-all"
        >
          Coba Lagi
        </button>
      </motion.div>
    </div>
  );
}
