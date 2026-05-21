import React from 'react';

type BadgeColor = 'surface-card' | 'orange' | 'pink' | 'violet' | 'emerald' | 'success' | 'warning' | 'error';

interface BadgePillProps {
  color?: BadgeColor;
  children: React.ReactNode;
  className?: string;
}

export function BadgePill({ color = 'surface-card', children, className = '' }: BadgePillProps) {
  let colorClass = '';

  switch (color) {
    case 'surface-card':
      colorClass = 'bg-surface-card text-ink';
      break;
    case 'orange':
      colorClass = 'bg-badge-orange text-white';
      break;
    case 'pink':
      colorClass = 'bg-badge-pink text-white';
      break;
    case 'violet':
      colorClass = 'bg-badge-violet text-white';
      break;
    case 'emerald':
      colorClass = 'bg-badge-emerald text-white';
      break;
    case 'success':
      colorClass = 'bg-success text-white';
      break;
    case 'warning':
      colorClass = 'bg-warning text-white';
      break;
    case 'error':
      colorClass = 'bg-error text-white';
      break;
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-pill text-caption ${colorClass} ${className}`}>
      {children}
    </span>
  );
}
