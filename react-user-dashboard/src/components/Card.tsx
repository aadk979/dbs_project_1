import React from 'react';

type CardVariant = 'feature' | 'feature-icon' | 'product-mockup' | 'pricing-tier' | 'featured-tier';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
}

export function Card({ variant = 'feature', children, className = '' }: CardProps) {
  let variantClasses = '';

  switch (variant) {
    case 'feature':
      variantClasses = 'bg-surface-card rounded-lg p-xl';
      break;
    case 'feature-icon':
      variantClasses = 'bg-canvas border border-hairline rounded-lg p-lg';
      break;
    case 'product-mockup':
      variantClasses = 'bg-canvas rounded-lg p-lg';
      break;
    case 'pricing-tier':
      variantClasses = 'bg-canvas rounded-lg p-xl shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.08)]';
      break;
    case 'featured-tier':
      variantClasses = 'bg-surface-dark text-on-dark rounded-lg p-xl';
      break;
  }

  return (
    <div className={`${variantClasses} ${className}`}>
      {children}
    </div>
  );
}
