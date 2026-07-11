'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  User, 
  Link as LinkIcon, 
  Sliders, 
  Share2, 
  Shield, 
  LogOut, 
  ExternalLink, 
  Lock, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Menu, 
  X, 
  Paintbrush 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { login, logout } from '@/app/actions';
import { SiteSettings } from '@/lib/db';

interface SettingsLayoutClientProps {
  initialSettings: SiteSettings;
  isAuthenticated: boolean;
  dbStatus: { isSupabase: boolean; supabaseUrl: string | null } | null;
  children: React.ReactNode;
}

export default function SettingsLayoutClient({
  initialSettings,
  isAuthenticated,
  dbStatus,
  children,
}: SettingsLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Authentication State
  const [authed, setAuthed] = React.useState(isAuthenticated);
  const [passwordInput, setPasswordInput] = React.useState('');
  const [authError, setAuthError] = React.useState('');
  const [authLoading, setAuthLoading] = React.useState(false);

  // UI States
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Ambil warna aksen, logo, judul, subjudul
  const accentColor = initialSettings.settings_accent_color || '#3b82f6';
  const logoUrl = initialSettings.settings_logo_url;
  const navbarTitle = initialSettings.settings_navbar_title || 'ReyLan Admin';
  const navbarSubtitle = initialSettings.settings_navbar_subtitle || 'Dashboard V1.0';

  // Sinkronisasi status autentikasi jika prop berubah menggunakan pola sinkronisasi fase render langsung
  const [prevIsAuthenticated, setPrevIsAuthenticated] = React.useState(isAuthenticated);
  if (isAuthenticated !== prevIsAuthenticated) {
    setPrevIsAuthenticated(isAuthenticated);
    setAuthed(isAuthenticated);
  }

  // Auto-hide notification
  React.useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await login(passwordInput);
      if (res.success) {
        setAuthed(true);
        showNotify('success', 'Selamat datang kembali, Admin!');
        router.refresh();
      } else {
        setAuthError(res.message);
      }
    } catch (err) {
      setAuthError('Terjadi kesalahan koneksi.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await logout();
    setAuthed(false);
    setPasswordInput('');
    showNotify('success', 'Anda telah keluar dari sesi admin.');
    router.push('/settings');
    router.refresh();
  };

  // Handler navigasi yang aman dengan mengecek draft kotor
  const handleNavigation = (targetPath: string) => {
    setIsSidebarOpen(false);
    
    // Periksa apakah ada draft yang belum disimpan di halaman saat ini menggunakan sessionStorage
    let isDirty = false;
    if (typeof window !== 'undefined') {
      isDirty = sessionStorage.getItem('isSettingsDraftDirty') === 'true';
    }
    
    if (isDirty) {
      const confirmLeave = window.confirm(
        'Anda memiliki perubahan yang belum disimpan di halaman ini. Apakah Anda yakin ingin meninggalkan halaman ini dan membuang draft perubahan?'
      );
      if (!confirmLeave) return;
    }

    // Set dirty flag kembali ke false saat berpindah route
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isSettingsDraftDirty');
    }
    router.push(targetPath);
  };

  // Menu Items
  const menuItems = [
    { name: 'Profil & Konten', icon: User, path: '/settings/profil-konten' },
    { name: 'Tombol Medsos', icon: LinkIcon, path: '/settings/tombol-medsos' },
    { name: 'Latar & Musik', icon: Sliders, path: '/settings/latar-musik' },
    { name: 'Optimasi SEO (OG)', icon: Share2, path: '/settings/optimasi-seo' },
    { name: 'Keamanan', icon: Shield, path: '/settings/keamanan' },
    { name: 'Tampilan Settings', icon: Paintbrush, path: '/settings/tampilan' },
  ];

  // RENDER LOGIN SCREEN IF NOT AUTHENTICATED
  if (!authed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950 overflow-y-auto">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-sm p-8 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl space-y-6 text-center"
        >
          <div className="space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="font-sans text-xl font-bold tracking-tight text-white">
              Sesi Admin Terkunci
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Masukkan password admin untuk mengakses konfigurasi dinamis Media Sosial ReyLan.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono tracking-widest uppercase text-slate-400">
                PASSWORD AKSES
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-neutral-900/60 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {authLoading ? 'Memverifikasi...' : 'Buka Pengaturan'}
            </button>
          </form>

          <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-slate-500">
            <p>Password bawaan: <span className="text-blue-400 font-semibold">admin123</span></p>
            <p className="mt-1">Silakan langsung diubah di menu Keamanan demi keselamatan.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // RENDER SETTINGS MAIN DASHBOARD LAYOUT WITH SIDEBAR & ACCENT COLOR
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col md:flex-row">
      {/* Dynamic Accent Color Style Override */}
      <style>{`
        :root {
          --settings-accent: ${accentColor};
        }
        .bg-settings-accent {
          background-color: ${accentColor} !important;
        }
        .text-settings-accent {
          color: ${accentColor} !important;
        }
        .border-settings-accent {
          border-color: ${accentColor} !important;
        }
        .focus\\:border-settings-accent:focus {
          border-color: ${accentColor} !important;
        }
        .ring-settings-accent:focus {
          --tw-ring-color: ${accentColor} !important;
        }
      `}</style>

      {/* MOBILE HEADER NAVBAR */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo Navbar"
              className="w-8 h-8 rounded-lg object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-settings-accent flex items-center justify-center font-bold text-sm text-white">
              {navbarTitle.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-bold text-sm leading-tight text-white">{navbarTitle}</h2>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">{navbarSubtitle}</span>
          </div>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all duration-300"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* SIDEBAR NAVIGATION (DESKTOP & MOBILE TRANSITION) */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 border-r border-white/10 bg-slate-900/95 backdrop-blur-md flex flex-col justify-between shrink-0 z-50 transform md:transform-none transition-transform duration-300 ease-in-out md:sticky md:h-screen md:top-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          {/* Header Sidebar Brand */}
          <div className="flex items-center gap-3 pb-5 border-b border-white/10 mb-6 justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo Navbar"
                  className="w-8 h-8 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-settings-accent flex items-center justify-center font-bold text-sm text-white">
                  {navbarTitle.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h2 className="font-bold text-sm leading-tight text-white">{navbarTitle}</h2>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">{navbarSubtitle}</span>
              </div>
            </div>
            {/* Close button on Mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigasi Vertikal */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-settings-accent text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  style={{
                    boxShadow: isActive ? `0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)` : undefined
                  }}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* FOOTER & LOGOUT INFO */}
        <div className="p-6 border-t border-white/5 bg-black/20 space-y-4">
          {dbStatus && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] space-y-1 font-mono text-slate-500">
              <span className="font-semibold block text-slate-400 uppercase tracking-wider text-[9px]">Status Database:</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${dbStatus.isSupabase ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                <span>{dbStatus.isSupabase ? 'Koneksi Supabase' : 'Database Lokal'}</span>
              </div>
              {!dbStatus.isSupabase && (
                <p className="text-[9px] text-amber-500/80 leading-normal mt-1">
                  Supabase belum disinkronisasi. Data Anda disimpan aman di database lokal.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold"
            >
              <span>Lihat Live</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs transition-all duration-300"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* BACKDROP OVERLAY FOR MOBILE SIDEBAR */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
        />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-10 max-w-4xl overflow-y-auto">
        <div className="space-y-8">
          {/* NOTIFICATION TOAST */}
          <AnimatePresence>
            {notification && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className={`p-4 rounded-2xl border flex items-center gap-3 shadow-xl ${
                  notification.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                {notification.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <span className="text-sm font-semibold">{notification.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {children}
        </div>
      </main>
    </div>
  );
}
