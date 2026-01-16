/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'bg-studio-surface', 'bg-studio-surface-hover', 'bg-studio-bg',
    'text-accent-indigo', 'text-accent-violet', 'text-accent-emerald', 'text-accent-amber', 'text-accent-cyan',
    'gradient-primary', 'gradient-success', 'gradient-earnings', 'gradient-streaming',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Vibrant Studio Dark Theme
        studio: {
          bg: '#0a0a0f',
          surface: '#12121a',
          'surface-hover': '#1a1a24',
          'surface-elevated': '#1e1e2a',
          border: '#2a2a3a',
          'border-light': '#1f1f2e',
        },
        // Accent colors
        accent: {
          indigo: '#6366f1',
          violet: '#8b5cf6',
          emerald: '#10b981',
          'emerald-light': '#34d399',
          amber: '#f59e0b',
          'amber-light': '#fbbf24',
          cyan: '#06b6d4',
          'cyan-light': '#22d3ee',
        },
        // Text colors for dark theme
        text: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          tertiary: '#64748b',
          muted: '#475569',
        },
        // Status colors
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#06b6d4',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-md': '0 0 30px rgba(99, 102, 241, 0.25)',
        'glow-lg': '0 0 40px rgba(99, 102, 241, 0.35)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.25)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.25)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        'studio': '8px',
        'studio-md': '12px',
        'studio-lg': '16px',
        'studio-xl': '20px',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'count-up': 'countUp 1s ease-out',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
