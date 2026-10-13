import React from 'react';

export default function RoleBadge({ role, className = '' }) {
  const displayRole = (role || 'OPERATOR').replace(/_/g, ' ');
  return (
    <span className={`zx-role-badge ${className}`}>
      {displayRole}
    </span>
  );
}
