import React from 'react';

export default function ZonixLogo({ size = 28, showText = true, className = '', textClassName = '', subtitle = 'DISPATCHER' }) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric SVG Shield / Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <defs>
          {/* Main Shield Gradient */}
          <linearGradient id="zonixShieldBg" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="50%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0B132B" />
          </linearGradient>

          {/* Electric Lightning Z Gradients */}
          <linearGradient id="zonixZGrad" x1="12" y1="10" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>

          <linearGradient id="zonixZWhite" x1="14" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#BAE6FD" />
          </linearGradient>

          {/* Glow Filter */}
          <filter id="zonixShieldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563EB" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Outer Hex-Shield Container */}
        <path
          d="M24 3.5L42 12V27C42 36.2 24 44.5 24 44.5C24 44.5 6 36.2 6 27V12L24 3.5Z"
          fill="url(#zonixShieldBg)"
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeLinejoin="round"
          filter="url(#zonixShieldGlow)"
        />

        {/* Inner Tech Accent Border */}
        <path
          d="M24 7.5L38 14.2V26C38 33.2 24 39.8 24 39.8C24 39.8 10 33.2 10 26V14.2L24 7.5Z"
          stroke="rgba(56, 189, 248, 0.25)"
          strokeWidth="1"
          strokeDasharray="2 2"
          fill="none"
        />

        {/* Dynamic High-Tech Z Path */}
        <path
          d="M15 15.5H33L21.5 27H33V32.5H15L26.5 21H15V15.5Z"
          fill="url(#zonixZGrad)"
        />

        {/* Sharp Inner Z Accent Ridge */}
        <path
          d="M16.5 17H31.5L21.8 26.5H31.5V31H16.5L26.2 21.5H16.5V17Z"
          fill="url(#zonixZWhite)"
          opacity="0.9"
        />

        {/* Cyber Core Flare Dots */}
        <circle cx="33" cy="15.5" r="1.5" fill="#38BDF8" />
        <circle cx="15" cy="32.5" r="1.5" fill="#38BDF8" />
      </svg>

      {showText && (
        <div className={`flex flex-col leading-none ${textClassName}`}>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-widest text-[#0F172A] font-mono text-sm">
              ZONIX
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
          </div>
          {subtitle && (
            <span className="text-[9px] text-[#475569] tracking-wider font-semibold uppercase mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
