'use client';

import * as React from 'react';
import { Smartphone, AlertTriangle, ExternalLink } from 'lucide-react';

export default function MobileWarning() {
  const [currentUrl, setCurrentUrl] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      const timer = setTimeout(() => {
        setCurrentUrl(url);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const qrUrl = currentUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}&color=ffffff&bgcolor=0a0a0a`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-radial from-slate-900 via-slate-950 to-black overflow-y-auto">
      {/* Background blobs for depth */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl text-center space-y-6">
        {/* Glowing Warning Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <AlertTriangle className="w-10 h-10 animate-bounce" />
          <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-md -z-10 animate-pulse"></div>
        </div>

        {/* Title & Desc */}
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Akses Terbatas Ke Mobile
          </h1>
          <p className="text-sm text-slate-400 font-sans leading-relaxed">
            Halaman profil <span className="text-blue-400 font-semibold">Media Sosial ReyLan</span> dirancang eksklusif dan dioptimalkan secara visual hanya untuk perangkat seluler (smartphone Android & iOS).
          </p>
        </div>

        {/* Glass Box with QR Code */}
        <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center space-y-4">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            Pindai QR Code untuk Membuka di HP
          </p>
          
          <div className="relative p-3 bg-neutral-950/80 rounded-xl border border-white/10 shadow-inner">
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR Code Akses"
                className="w-40 h-40 object-contain rounded-lg filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                onError={(e) => {
                  // Fallback if API fails
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-slate-600">
                <Smartphone className="w-12 h-12 animate-pulse" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="overflow-hidden text-ellipsis">{currentUrl || 'Memuat URL...'}</span>
          </div>
        </div>

        {/* Action / Help */}
        <div className="text-xs text-slate-500 space-y-1">
          <p>Buka browser Chrome, Safari, atau Firefox di ponsel Anda.</p>
          <p className="font-sans">
            Gunakan mode <span className="font-semibold text-slate-400">Mobile View (F12)</span> jika Anda sedang melakukan pengujian di perangkat pengembang desktop.
          </p>
        </div>
      </div>
    </div>
  );
}
