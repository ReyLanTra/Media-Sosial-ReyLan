import * as React from 'react';
import { SiteSettings } from '@/lib/db';
import DOMPurify from 'isomorphic-dompurify';

interface VerificationBadgeProps {
  settings?: Partial<SiteSettings>;
  className?: string;
}

export default function VerificationBadge({ settings, className = "w-5 h-5" }: VerificationBadgeProps) {
  // Jika tidak ada settings, gunakan badge default (fallback)
  if (!settings) {
    return (
      <svg
        className={`${className} text-blue-500 fill-current inline-block filter drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]`}
        viewBox="0 0 24 24"
        aria-label="Terverifikasi"
      >
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </svg>
    );
  }

  const { badge_type, badge_image_url, badge_svg_code } = settings;

  // Render berdasarkan tipe badge kustom
  if (badge_type === 'svg_code' && badge_svg_code) {
    return (
      <div 
        className={`${className} inline-flex items-center justify-center overflow-hidden`}
        dangerouslySetInnerHTML={{ 
          __html: DOMPurify.sanitize(badge_svg_code, { 
            USE_PROFILES: { svg: true },
            FORBID_TAGS: ['script', 'foreignObject'],
            FORBID_ATTR: ['onclick', 'onload', 'onerror']
          }) 
        }}
      />
    );
  }

  if ((badge_type === 'png' || badge_type === 'svg_file') && badge_image_url) {
    return (
      <img 
        src={badge_image_url} 
        alt="Verified" 
        className={`${className} object-contain inline-block`}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Fallback terakhir (badge centang biru asli)
  return (
    <svg
      className={`${className} text-blue-500 fill-current inline-block filter drop-shadow-[0_0_4px_rgba(59,130,246,0.5)]`}
      viewBox="0 0 24 24"
      aria-label="Terverifikasi"
    >
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}
