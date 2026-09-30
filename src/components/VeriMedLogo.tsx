import React from 'react';

interface VeriMedLogoProps {
  variant?: 'horizontal' | 'stacked' | 'mark-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VeriMedLogo: React.FC<VeriMedLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
}) => {
  const markSizeClasses =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
        ? 'w-16 h-16'
        : 'w-9 h-9';

  const textSizeClasses =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
        ? 'text-2xl sm:text-3xl'
        : 'text-lg';

  const shieldMark = (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${markSizeClasses} shrink-0`}
      aria-hidden="true"
    >
      {/* Lower Shield Arch (Slate Gray) */}
      <path
        d="M 31 64 C 35 73, 42 79, 50 83 C 58 79, 66 72, 70 61"
        stroke="#475467"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Medical Cross inside upper-right of shield (Slate Gray) */}
      <path
        d="M 55 31 H 61 V 37 H 67 V 43 H 61 V 49 H 55 V 43 H 49 V 37 H 55 Z"
        stroke="#475467"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Upper Shield + Continuous ECG Pulse Line (Royal Medical Blue) */}
      <path
        d="M 29 52 C 27 44, 27 34, 28 29 C 29 25, 33 24, 38 23 C 43 22, 47 19, 50 19 C 53 19, 57 22, 62 23 C 67 24, 71 25, 72 29 C 73 35, 73 45, 71 52 C 69 57, 65 58, 60 58 H 56 C 54 58, 53 59, 52 62 L 49 72 L 41 35 L 35 56 C 34.5 57.5, 33.5 58, 31.5 58 H 18"
        stroke="#1558BC"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === 'mark-only') {
    return shieldMark;
  }

  if (variant === 'stacked') {
    return (
      <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
        {shieldMark}
        <div className={`${textSizeClasses} leading-none tracking-tight whitespace-nowrap`}>
          <span className="font-extrabold text-[#1558BC]">VeriMed</span>{' '}
          <span className="font-normal text-[#475467] tracking-wide">HEALTH</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {shieldMark}
      <div className={`${textSizeClasses} leading-none tracking-tight whitespace-nowrap`}>
        <span className="font-extrabold text-[#1558BC]">VeriMed</span>{' '}
        <span className="font-normal text-[#475467] tracking-wide">HEALTH</span>
      </div>
    </div>
  );
};
