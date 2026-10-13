import React from 'react';

export default function ProgressBar({ label, current = 0, max = 100, className = '' }) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, Math.round((current / max) * 100))) : 0;

  let fillColor = 'bg-accent';
  if (percentage >= 95) {
    fillColor = 'bg-err';
  } else if (percentage >= 80) {
    fillColor = 'bg-warn';
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-2 font-medium">{label}</span>
          <span className="font-mono text-ink-3 tabular-nums">{percentage}%</span>
        </div>
      )}
      <div className="w-full h-1 bg-[#EDEDE8] rounded-[2px] overflow-hidden">
        <div
          className={`h-full ${fillColor} transition-all duration-120`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
