import * as React from "react";

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const checkIsMobile = () => {
      if (typeof window === 'undefined') return;

      // 1. Cek User Agent untuk mendeteksi perangkat mobile (Android, iOS) secara spesifik
      const userAgent = window.navigator.userAgent || window.navigator.vendor || '';
      const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

      // 2. Cek lebar layar (biasanya breakpoint mobile di bawah 768px)
      const isMobileWidth = window.innerWidth < 768;

      // Sesuai prompt: "pengecekan user agent dan/atau lebar layar di sisi client"
      // Jika salah satu dari keduanya menandakan mobile, maka kita anggap mobile.
      setIsMobile(isMobileUA || isMobileWidth);
    };

    checkIsMobile();

    // Tambahkan event listener untuk memantau perubahan ukuran layar
    window.addEventListener('resize', checkIsMobile);
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}
