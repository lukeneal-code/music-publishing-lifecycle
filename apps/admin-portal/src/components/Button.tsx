import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-notion transition-colors duration-100',
          {
            // Primary - Notion blue style
            'bg-notion-blue-text text-white hover:bg-[#0a5f85] active:bg-[#095274]':
              variant === 'primary',
            // Secondary - subtle border
            'bg-white text-notion-text border border-notion-border hover:bg-notion-bg-hover active:bg-notion-bg-active':
              variant === 'secondary',
            // Ghost - no border, just hover
            'text-notion-text-secondary hover:bg-notion-bg-hover active:bg-notion-bg-active':
              variant === 'ghost',
            // Danger - red style
            'bg-notion-red-text text-white hover:bg-[#c73636] active:bg-[#a82e2e]':
              variant === 'danger',
            // Sizes
            'px-2 py-1 text-xs': size === 'sm',
            'px-3 py-1.5 text-xs': size === 'md',
            'px-4 py-2 text-sm': size === 'lg',
            // Disabled
            'opacity-40 cursor-not-allowed pointer-events-none': disabled,
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
