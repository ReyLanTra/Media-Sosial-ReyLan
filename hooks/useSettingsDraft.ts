'use client';

import { useState, useCallback, useEffect } from 'react';

export function useSettingsDraft<T>(
  initialData: T,
  onSaveCallback: (currentData: T) => Promise<void | T>
) {
  // Simpan data asli dari DB
  const [dbData, setDbData] = useState<T>(initialData);
  
  // Riwayat untuk undo/redo
  const [history, setHistory] = useState<T[]>([initialData]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pola sinkronisasi fase render langsung (React Best Practice) untuk menghindari cascading effects
  const [prevInitialData, setPrevInitialData] = useState<T>(initialData);
  if (initialData !== prevInitialData) {
    setPrevInitialData(initialData);
    setDbData(initialData);
    setHistory([initialData]);
    setCurrentIndex(0);
  }

  // Data saat ini yang sedang ditampilkan/diedit di form
  const currentData = history[currentIndex];

  // Update state baru dan tambahkan ke riwayat
  const updateData = useCallback((newDataOrFn: T | ((prev: T) => T)) => {
    setHistory(prevHistory => {
      const nextData = typeof newDataOrFn === 'function'
        ? (newDataOrFn as Function)(prevHistory[currentIndex])
        : newDataOrFn;

      // Hapus riwayat masa depan (redo) jika kita melakukan perubahan baru dari tengah stack
      const cleanHistory = prevHistory.slice(0, currentIndex + 1);
      return [...cleanHistory, nextData];
    });
    setCurrentIndex(prevIndex => prevIndex + 1);
  }, [currentIndex]);

  // Undo ke langkah sebelumnya
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prevIndex => prevIndex - 1);
    }
  }, [currentIndex]);

  // Redo ke langkah berikutnya
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prevIndex => prevIndex + 1);
    }
  }, [currentIndex, history.length]);

  // Cek apakah ada perubahan dibanding data terakhir yang disimpan di DB
  const isDirty = JSON.stringify(currentData) !== JSON.stringify(dbData);

  // Batal: reset kembali ke data DB terakhir
  const reset = useCallback(() => {
    setHistory([dbData]);
    setCurrentIndex(0);
    setError(null);
  }, [dbData]);

  // Simpan ke DB
  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const savedResult = await onSaveCallback(currentData);
      const dataToSave = (savedResult !== undefined && savedResult !== null) ? (savedResult as T) : currentData;
      setDbData(dataToSave);
      // Reset history stack agar saat ini menjadi titik awal baru
      setHistory([dataToSave]);
      setCurrentIndex(0);
    } catch (err: any) {
      console.error('Gagal menyimpan perubahan:', err);
      setError(err?.message || 'Gagal menyimpan perubahan.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [currentData, onSaveCallback]);

  // Konfirmasi sebelum meninggalkan halaman jika ada perubahan belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin keluar?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  return {
    data: currentData,
    updateData,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    isDirty,
    isSaving,
    error,
    reset,
    save,
  };
}
