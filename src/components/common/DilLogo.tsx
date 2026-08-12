import React from 'react';

interface DilLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const DilLogo: React.FC<DilLogoProps> = ({ className = 'h-10', variant = 'light' }) => {
  const textColor = variant === 'dark' ? '#FFFFFF' : '#0B192C';
  return (
    <svg className={className} viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* D */}
      <path d="M 12 20 L 32 20 C 46 20 56 28 56 42 C 56 56 46 64 32 64 L 12 64 Z M 24 30 L 24 54 L 31 54 C 38 54 44 49 44 42 C 44 35 38 30 31 30 Z" fill="#2563EB"/>
      {/* i (cyan dot + blue stem) */}
      <rect x="62" y="20" width="9" height="9" rx="1.5" fill="#00D2FF"/>
      <rect x="62" y="32" width="9" height="32" rx="1.5" fill="#2563EB"/>
      {/* L (curved tail) */}
      <path d="M 79 20 L 89 20 L 89 50 C 89 56 93 59 98 57 C 104 55 108 50 113 44 C 111 53 105 63 97 64 C 88 65 79 60 79 50 Z" fill="#2563EB"/>
      {/* Cyan Vertical Bar */}
      <line x1="124" y1="18" x2="124" y2="66" stroke="#00D2FF" strokeWidth={2.5} strokeLinecap="round"/>
      {/* Darma Innovation Lab Text */}
      <text x="138" y="32" fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" fontWeight={800} fontSize={14} fill={textColor} letterSpacing={0.5}>Darma</text>
      <text x="138" y="47" fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" fontWeight={800} fontSize={14} fill={textColor} letterSpacing={0.5}>Innovation</text>
      <text x="138" y="62" fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" fontWeight={800} fontSize={14} fill={textColor} letterSpacing={0.5}>Lab</text>
    </svg>
  );
};

