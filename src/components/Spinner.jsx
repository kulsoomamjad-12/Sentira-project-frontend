import React from 'react';

// The bolt from the site's own logo (logo-icon.png) — just the sign, no
// enclosing square — spinning in place. Used everywhere a page is waiting
// on data (dashboard stats, forms list, feedback table, etc.) so loading
// always shows this same icon instead of plain "Loading..." text.
export default function Spinner({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#00abf0"
      className={`animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

// Convenience wrapper pairing the spinner with a label — the shape every
// page's "still loading" state uses.
export function LoadingState({ label = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-gray-400 text-sm ${className}`}>
      <Spinner size={26} />
      <p>{label}</p>
    </div>
  );
}
