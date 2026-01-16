import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-studio transition-all duration-200',
          {
            // Primary - solid indigo with glow
            'bg-accent-indigo text-white hover:bg-accent-violet shadow-glow-sm hover:shadow-glow-md active:scale-[0.98]':
              variant === 'primary',
            // Secondary - outlined with subtle fill
            'bg-studio-surface text-text-primary border border-studio-border hover:bg-studio-surface-hover hover:border-studio-border active:scale-[0.98]':
              variant === 'secondary',
            // Ghost - minimal, just text
            'text-text-secondary hover:text-text-primary hover:bg-studio-surface-hover active:bg-studio-surface':
              variant === 'ghost',
            // Gradient - full gradient with glow
            'gradient-primary text-white shadow-glow-sm hover:shadow-glow-md active:scale-[0.98]':
              variant === 'gradient',
            // Sizes
            'px-2.5 py-1.5 text-xs': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-5 py-2.5 text-sm': size === 'lg',
            // Disabled state
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
