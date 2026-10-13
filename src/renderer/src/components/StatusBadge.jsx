import React from 'react';

export default function StatusBadge({ status, label, className = '' }) {
  const norm = (status || label || '').toString().toLowerCase().trim();

  let type = 'neutral';
  if (['active', 'online', 'connected', 'synced', 'ok'].includes(norm)) {
    type = 'ok';
  } else if (['idle'].includes(norm)) {
    type = 'neutral';
  } else if (['degraded', 'unreachable', 'pending', 'warning', 'warn'].includes(norm)) {
    type = 'warn';
  } else if (['failed', 'offline', 'disabled', 'error', 'err'].includes(norm)) {
    type = 'err';
  }

  const displayText = label || (status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Unknown');

  return (
    <span className={`zx-status-badge zx-status-${type} ${className}`}>
      <span className="zx-dot" />
      <span>{displayText}</span>
    </span>
  );
}
