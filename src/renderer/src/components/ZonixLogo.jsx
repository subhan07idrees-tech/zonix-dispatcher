import React from 'react';

export default function ZonixLogo({ size = 24, showText = true, className = '', dark = false, version = 'v1.9.30' }) {
  const slateColor = dark ? '#AEB9CC' : '#3B4A63';
  const cobaltColor = dark ? '#5B7CFF' : '#2447D6';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Geometric Z Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 150 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <path d="M0 0H150L57 120L0 150L22 120L89 30H0V0Z" fill={slateColor} />
        <path d="M57 120H150V150H0L57 120Z" fill={cobaltColor} />
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold tracking-[0.14em] text-ink font-sans">
            ZONIX
          </span>
          {version && (
            <span className="text-[11px] font-mono text-ink-3 tracking-normal">
              {version}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
