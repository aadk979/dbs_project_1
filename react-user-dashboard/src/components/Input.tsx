import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-title-sm text-ink">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            bg-canvas text-ink text-body-md rounded-md px-[14px] py-[10px] h-10
            border border-hairline focus:outline-none focus:border-ink
            disabled:opacity-50 disabled:bg-surface-soft
            ${error ? 'border-error focus:border-error' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-caption text-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
