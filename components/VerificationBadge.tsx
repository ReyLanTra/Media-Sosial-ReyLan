import * as React from 'react';

export default function VerificationBadge({ className = "w-5 h-5" }: { className?: string }) {
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
