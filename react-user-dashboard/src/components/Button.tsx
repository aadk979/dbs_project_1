import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'icon-circular' | 'text-link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: React.ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed';
  
  let variantClasses = '';
  
  switch (variant) {
    case 'primary':
      variantClasses = 'bg-primary text-on-primary hover:bg-primary-active text-button rounded-md px-5 py-2.5 h-10';
      break;
    case 'secondary':
      variantClasses = 'bg-canvas text-ink border border-hairline hover:bg-surface-soft text-button rounded-md px-5 py-2.5 h-10';
      break;
    case 'icon-circular':
      variantClasses = 'bg-canvas text-ink border border-hairline hover:bg-surface-soft rounded-full w-9 h-9';
      break;
    case 'text-link':
      variantClasses = 'bg-transparent text-ink hover:underline text-nav-link px-2 py-1';
      break;
  }

  return (
    <button className={`${baseClasses} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
