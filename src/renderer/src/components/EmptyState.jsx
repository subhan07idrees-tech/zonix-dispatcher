import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-4 ${className}`}>
      {Icon && (
        <div className="text-ink-3 mb-3">
          <Icon className="w-10 h-10" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-sm font-medium text-ink mb-1">{title}</h3>
      {description && <p className="text-[13px] text-ink-2 max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
