'use client';

import * as React from 'react';
import { useSettingsDraft } from '@/hooks/useSettingsDraft';
import { addBtn, updateBtn, deleteBtn, reorderButtons, uploadMedia } from '@/app/actions';
import { SocialButton } from '@/lib/db';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ArrowUp, 
  ArrowDown, 
  Upload, 
  Link as LinkIcon, 
  RotateCcw, 
  RotateCw, 
  Check, 
  X, 
  Info,
  Sliders,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';

interface TombolMedsosClientProps {
  initialButtons: SocialButton[];
}

export default function TombolMedsosClient({ initialButtons }: TombolMedsosClientProps) {
  // State untuk form tambah/edit tombol yang sedang aktif di modal/form kontainer
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  
  // Input Fields State
  const [platformName, setPlatformName] = React.useState('');
  const [targetUrl, setTargetUrl] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [logoMode, setLogoMode] = React.useState<'url' | 'upload'>('url');
  const [logoUrl, setLogoUrl] = React.useState('');
  const [logoFile, setLogoFile] = React.useState<{ base64: string; name: string } | null>(null);

  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Hook draft
  const {
    data: buttons,
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
    isDirty,
    isSaving,
    error,
    reset: resetDraft,
    save: saveDraft,
  } = useSettingsDraft<SocialButton[]>(initialButtons, async (currentButtons) => {
    // 1. Identifikasi tombol yang dihapus
    const deletedButtons = initialButtons.filter(init => !currentButtons.some(curr => curr.id === init.id));
    for (const btn of deletedButtons) {
      await deleteBtn(btn.id, btn.logo_url);
    }

    // 2. Simpan atau perbarui tombol yang ada di draf
    const finalButtons: SocialButton[] = [];
    
    for (let i = 0; i < currentButtons.length; i++) {
      const btn = { ...currentButtons[i] };
      const displayOrder = i + 1; // Sinkronkan display order dari atas ke bawah

      // Jika ada file gambar lokal yang belum diunggah ke Supabase
      if (btn.logo_url.startsWith('data:image')) {
        // Cari nama file yang kita simpan, jika tidak ada pakai default
        const fileName = (btn as any)._tempFileName || `logo-medsos-${btn.id}.png`;
        const uploadedUrl = await uploadMedia('logo-medsos', btn.logo_url, fileName, btn.id);
        btn.logo_url = uploadedUrl;
      }

      // Cek apakah tombol ini baru atau lama
      const isNew = !initialButtons.some(init => init.id === btn.id);
      
      if (isNew) {
        // Tambahkan tombol baru ke db
        const added = await addBtn({
          platform_name: btn.platform_name,
          logo_url: btn.logo_url,
          target_url: btn.target_url,
          display_order: displayOrder,
          is_active: btn.is_active,
        });
        finalButtons.push(added);
      } else {
        // Perbarui tombol lama di db
        const updated = await updateBtn(btn.id, {
          platform_name: btn.platform_name,
          logo_url: btn.logo_url,
          target_url: btn.target_url,
          display_order: displayOrder,
          is_active: btn.is_active,
        });
        finalButtons.push(updated);
      }
    }

    // 3. Sinkronisasi urutan akhir
    if (finalButtons.length > 0) {
      await reorderButtons(
        finalButtons.map((b, index) => ({
          id: b.id,
          display_order: index + 1,
        }))
      );
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  });

  // Set flag kotor pada level sessionStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isDirty) {
        sessionStorage.setItem('isSettingsDraftDirty', 'true');
      } else {
        sessionStorage.removeItem('isSettingsDraftDirty');
      }
    }
  }, [isDirty]);

  // Handle Upload File Logo Medsos ke Base64 lokal
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoFile({
        base64: reader.result as string,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  // Tutup dan reset formulir editor
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setPlatformName('');
    setTargetUrl('');
    setIsActive(true);
    setLogoMode('url');
    setLogoUrl('');
    setLogoFile(null);
  };

  // Mulai tambah tombol baru
  const openAddForm = () => {
    closeForm();
    setIsFormOpen(true);
  };

  // Mulai edit tombol
  const openEditForm = (btn: SocialButton) => {
    setEditingId(btn.id);
    setPlatformName(btn.platform_name);
    setTargetUrl(btn.target_url);
    setIsActive(btn.is_active);
    setLogoMode(btn.logo_url.startsWith('data:image') || !btn.logo_url.startsWith('http') ? 'upload' : 'url');
    setLogoUrl(btn.logo_url.startsWith('data:image') ? '' : btn.logo_url);
    setLogoFile(null);
    setIsFormOpen(true);
  };

  // Simpan tombol ke draf lokal (belum ke Supabase)
  const handleSaveToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName || !targetUrl) return;

    let finalLogo = logoUrl;
    let tempFileName = '';

    if (logoMode === 'upload' && logoFile) {
      finalLogo = logoFile.base64;
      tempFileName = logoFile.name;
    }

    if (!finalLogo && logoMode === 'url') {
      alert('Harap masukkan URL logo media sosial.');
      return;
    }

    if (editingId) {
      // Perbarui tombol yang ada di draf
      updateData(prev => prev.map(b => {
        if (b.id === editingId) {
          const updated = {
            ...b,
            platform_name: platformName,
            logo_url: finalLogo || b.logo_url,
            target_url: targetUrl,
            is_active: isActive,
          };
          if (tempFileName) {
            (updated as any)._tempFileName = tempFileName;
          }
          return updated;
        }
        return b;
      }));
    } else {
      // Tambah tombol baru ke draf
      const newId = `temp-${Date.now()}`;
      const newBtn: SocialButton = {
        id: newId,
        platform_name: platformName,
        logo_url: finalLogo || 'https://picsum.photos/seed/default/100/100',
        target_url: targetUrl,
        display_order: buttons.length + 1,
        is_active: isActive,
      };
      if (tempFileName) {
        (newBtn as any)._tempFileName = tempFileName;
      }
      updateData(prev => [...prev, newBtn]);
    }

    closeForm();
  };

  // Hapus tombol dari draf lokal
  const handleDeleteFromDraft = (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus tombol "${name}" dari draf?`)) return;
    updateData(prev => prev.filter(b => b.id !== id));
  };

  // Geser Urutan Tombol ke Atas
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    updateData(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  // Geser Urutan Tombol ke Bawah
  const handleMoveDown = (index: number) => {
    if (index === buttons.length - 1) return;
    updateData(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in" style={{ animationDuration: '0.3s' }}>
      
      {/* HEADER UTAMA DENGAN STATUS DRAFT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Tombol Medsos
            {isDirty && (
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono py-1 px-2.5 rounded-full animate-pulse">
                Draf Belum Disimpan
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Kelola, urutkan, tambah, dan edit tombol media sosial yang tampil di halaman utama.
          </p>
        </div>

        {/* UNDO / REDO / BATAL / SIMPAN BAR */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Undo */}
          <button
            onClick={undo}
            disabled={!canUndo || isSaving}
            title="Undo"
            className="p-2 h-10 w-10 rounded-xl border border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4 mx-auto" />
          </button>
          
          {/* Redo */}
          <button
            onClick={redo}
            disabled={!canRedo || isSaving}
            title="Redo"
            className="p-2 h-10 w-10 rounded-xl border border-white/10 bg-slate-900 text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
          >
            <RotateCw className="w-4 h-4 mx-auto" />
          </button>

          {/* Batal */}
          <button
            onClick={resetDraft}
            disabled={!isDirty || isSaving}
            className="px-4 h-10 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>

          {/* Simpan Perubahan */}
          <button
            onClick={saveDraft}
            disabled={!isDirty || isSaving}
            className={`px-5 h-10 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 shadow-lg
              ${isDirty 
                ? 'bg-settings-accent hover:opacity-90 text-white shadow-blue-500/10' 
                : 'bg-white/5 text-slate-500 border border-white/5 disabled:pointer-events-none'
              }
            `}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Menyimpan...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ERROR PANEL */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* BODY LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LIST TOMBOL SEMENTARA */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm text-slate-300">Daftar Tombol Sosial ({buttons.length})</h3>
            <button
              onClick={openAddForm}
              className="px-3 py-1.5 rounded-xl bg-settings-accent hover:opacity-90 text-white text-xs font-semibold flex items-center gap-1 shadow-md transition-all duration-300"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tombol</span>
            </button>
          </div>

          {buttons.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center text-slate-500 text-xs space-y-2">
              <LinkIcon className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
              <p>Belum ada tombol medsos. Silakan tambahkan tombol baru!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {buttons.map((btn, index) => (
                <div
                  key={btn.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 bg-slate-900/40 backdrop-blur-sm
                    ${btn.is_active ? 'border-white/10' : 'border-white/5 opacity-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={btn.logo_url}
                      alt={btn.platform_name}
                      className="w-10 h-10 rounded-xl object-cover bg-slate-950 border border-white/5 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-semibold text-xs text-white flex items-center gap-1.5">
                        {btn.platform_name}
                        {btn.is_active ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono max-w-[150px] sm:max-w-xs truncate">
                        {btn.target_url}
                      </p>
                    </div>
                  </div>

                  {/* Actions (Reorder, Edit, Delete) */}
                  <div className="flex items-center gap-1">
                    {/* Urutan */}
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === buttons.length - 1}
                      className="p-1.5 rounded-lg border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditForm(btn)}
                      className="p-1.5 rounded-lg border border-white/5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Hapus */}
                    <button
                      onClick={() => handleDeleteFromDraft(btn.id, btn.platform_name)}
                      className="p-1.5 rounded-lg border border-white/5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EDITOR DRAWER / CARD */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-slate-300">
            {isFormOpen ? (editingId ? 'Edit Tombol Medsos' : 'Tambah Tombol Baru') : 'Editor Tombol'}
          </h3>

          {!isFormOpen ? (
            <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/10 text-center text-slate-500 text-xs">
              <Info className="w-5 h-5 mx-auto text-slate-600 mb-2" />
              Klik &quot;Tambah Tombol&quot; atau ikon pensil edit untuk mulai mengonfigurasi tombol medsos Anda.
            </div>
          ) : (
            <form onSubmit={handleSaveToDraft} className="p-5 rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-sm space-y-4 animate-fade-in">
              {/* Platform Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  NAMA PLATFORM / TOMBOL
                </label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="Contoh: TikTok, Instagram, Saweria"
                  className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                />
              </div>

              {/* Target URL */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  URL TUJUAN (TARGET URL)
                </label>
                <input
                  type="url"
                  required
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://tiktok.com/@username"
                  className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                />
              </div>

              {/* Logo Mode Selection */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  METODE LOGO PLATFORM
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogoMode('url')}
                    className={`h-9 rounded-lg text-xs font-semibold border transition-all duration-200
                      ${logoMode === 'url'
                        ? 'bg-settings-accent text-white border-transparent'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                      }
                    `}
                  >
                    URL Gambar
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoMode('upload')}
                    className={`h-9 rounded-lg text-xs font-semibold border transition-all duration-200
                      ${logoMode === 'upload'
                        ? 'bg-settings-accent text-white border-transparent'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                      }
                    `}
                  >
                    Unggah Berkas
                  </button>
                </div>
              </div>

              {/* Logo Url */}
              {logoMode === 'url' ? (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    URL LOGO GAMBAR
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 h-10 rounded-xl border border-white/10 bg-neutral-950 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-settings-accent"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    UNGGAH LOGO PLATFORM (.png / .jpg)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    id="logo-medsos-file-upload"
                  />
                  <label
                    htmlFor="logo-medsos-file-upload"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-xl border border-dashed border-white/20 hover:border-white/40 bg-white/5 text-xs font-semibold cursor-pointer text-slate-300 hover:text-white transition-all duration-300"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoFile ? `Terpilih: ${logoFile.name.substring(0, 15)}...` : 'Pilih Logo'}</span>
                  </label>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center justify-between h-10 px-4 rounded-xl border border-white/10 bg-neutral-950">
                <span className="text-xs font-semibold text-slate-300">Tampilkan Tombol</span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded accent-settings-accent cursor-pointer"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 h-9 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-xs font-semibold transition-all duration-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-settings-accent hover:opacity-90 text-white text-xs font-bold transition-all duration-200"
                >
                  OK (Masukkan Draf)
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
