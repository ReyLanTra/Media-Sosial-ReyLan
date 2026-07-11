'use client';

import * as React from 'react';
import { 
  Send, 
  Users, 
  Bell, 
  Image as ImageIcon, 
  Type, 
  MessageSquare,
  Info,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendPushNotification } from '@/app/actions';
import { handleUpload } from '@/lib/supabase';

interface NotifikasiClientProps {
  initialSubscriberCount: number;
}

export default function NotifikasiClient({ initialSubscriberCount }: NotifikasiClientProps) {
  const [form, setForm] = React.useState({
    title: '',
    message: '',
    icon: '',
    image: '',
    badge: ''
  });
  const [isSending, setIsSending] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tempFiles, setTempFiles] = React.useState<{ [key: string]: File }>({});
  const [previews, setPreviews] = React.useState<{ [key: string]: string }>({});

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFileChange = (field: string, file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setTempFiles(prev => ({ ...prev, [field]: file }));
    setPreviews(prev => ({ ...prev, [field]: url }));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) {
      showNotify('error', 'Judul dan pesan wajib diisi.');
      return;
    }

    if (!confirm(`Kirim notifikasi ini ke ${initialSubscriberCount} pelanggan?`)) return;

    setIsSending(true);
    try {
      const finalForm = { ...form };

      // Upload icons/images if they are new
      if (tempFiles.icon) finalForm.icon = await handleUpload(tempFiles.icon, 'push-icon');
      if (tempFiles.image) finalForm.image = await handleUpload(tempFiles.image, 'push-large-image');
      if (tempFiles.badge) finalForm.badge = await handleUpload(tempFiles.badge, 'push-badge');

      const res = await sendPushNotification(finalForm);
      if (res.success) {
        showNotify('success', res.message);
        setForm({ title: '', message: '', icon: '', image: '', badge: '' });
        setTempFiles({});
        setPreviews({});
      } else {
        showNotify('error', res.message);
      }
    } catch (error: any) {
      showNotify('error', error.message || 'Gagal mengirim notifikasi.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Composure */}
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Type className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Buat Notifikasi</h2>
          </div>

          <form onSubmit={handleSend} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">JUDUL NOTIFIKASI</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Contoh: Ada Konten Baru!"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                />
                <Bell className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">ISI PESAN</label>
              <div className="relative">
                <textarea 
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tuliskan pesan yang ingin disampaikan..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-sm text-white focus:border-blue-500/50 outline-none transition-all resize-none"
                />
                <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">IKON (KECIL)</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden shrink-0">
                    {previews.icon ? (
                      <img src={previews.icon} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-700" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 text-center transition-all">
                      Pilih Ikon
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('icon', e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">GAMBAR (BESAR)</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl border border-white/10 bg-black/20 flex items-center justify-center overflow-hidden shrink-0">
                    {previews.image ? (
                      <img src={previews.image} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-700" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300 hover:bg-white/10 text-center transition-all">
                      Pilih Gambar
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange('image', e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending || initialSubscriberCount === 0}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Kirim Notifikasi Sekarang
                </>
              )}
            </button>

            {initialSubscriberCount === 0 && (
              <p className="text-[10px] text-center text-amber-500/80 font-mono italic">
                * Belum ada pengunjung yang mengizinkan notifikasi di perangkat mereka.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Stats & Preview */}
      <div className="space-y-6">
        {/* Subscriber Stats */}
        <div className="p-6 rounded-3xl border border-white/10 bg-blue-600/10 backdrop-blur-md shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">TOTAL PELANGGAN</span>
            <h3 className="text-3xl font-bold text-white">{initialSubscriberCount}</h3>
          </div>
        </div>

        {/* Live Preview */}
        <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md shadow-xl space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preview Perangkat</h3>
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 shadow-inner space-y-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 border border-white/5 shrink-0 overflow-hidden">
                {previews.icon && <img src={previews.icon} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white truncate">{form.title || 'Judul Notifikasi'}</h4>
                <p className="text-[10px] text-slate-400 line-clamp-2">{form.message || 'Pesan notifikasi akan muncul di sini...'}</p>
              </div>
            </div>
            {previews.image && (
              <div className="w-full h-24 rounded-lg overflow-hidden border border-white/5">
                <img src={previews.image} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
          <Info className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-amber-400">Penting</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Pastikan Anda sudah mengonfigurasi VAPID Keys di lingkungan server sebelum mengirim. Notifikasi dikirim secara asynchronous ke semua pelanggan yang terdaftar di database.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-6 right-6 p-4 rounded-2xl border flex items-center gap-3 shadow-2xl z-50 ${
              notification.type === 'success' 
                ? 'bg-emerald-500 border-emerald-400 text-white' 
                : 'bg-red-500 border-red-400 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
