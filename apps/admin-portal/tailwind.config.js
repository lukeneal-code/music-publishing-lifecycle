/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Notion semantic background colors
    'bg-notion-red-bg',
    'bg-notion-orange-bg',
    'bg-notion-yellow-bg',
    'bg-notion-green-bg',
    'bg-notion-blue-bg',
    'bg-notion-purple-bg',
    'bg-notion-pink-bg',
    'bg-notion-gray-bg',
    // Notion semantic text colors
    'text-notion-red-text',
    'text-notion-orange-text',
    'text-notion-yellow-text',
    'text-notion-green-text',
    'text-notion-blue-text',
    'text-notion-purple-text',
    'text-notion-pink-text',
    'text-notion-gray-text',
    // Notion border left colors
    'border-l-notion-red-text',
    'border-l-notion-orange-text',
    'border-l-notion-yellow-text',
    'border-l-notion-green-text',
    'border-l-notion-blue-text',
    'border-l-notion-purple-text',
    'border-l-notion-pink-text',
    'border-l-notion-gray-text',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Notion-inspired color palette
        notion: {
          // Backgrounds
          bg: {
            DEFAULT: '#ffffff',
            secondary: '#f7f6f3',
            tertiary: '#f1f1ef',
            hover: 'rgba(55, 53, 47, 0.04)',
            active: 'rgba(55, 53, 47, 0.08)',
          },
          // Text
          text: {
            DEFAULT: '#37352f',
            secondary: '#787774',
            tertiary: '#9b9a97',
            inverted: '#ffffff',
          },
          // Borders
          border: {
            DEFAULT: '#e9e9e7',
            light: '#f1f1ef',
            dark: '#d3d1cb',
          },
          // Semantic colors (muted)
          red: {
            bg: '#fbe4e4',
            text: '#e03e3e',
          },
          orange: {
            bg: '#faebdd',
            text: '#d9730d',
          },
          yellow: {
            bg: '#fbf3db',
            text: '#dfab01',
          },
          green: {
            bg: '#dbeddb',
            text: '#0f7b6c',
          },
          blue: {
            bg: '#ddebf1',
            text: '#0b6e99',
          },
          purple: {
            bg: '#eae4f2',
            text: '#6940a5',
          },
          pink: {
            bg: '#f4dfeb',
            text: '#ad1a72',
          },
          gray: {
            bg: '#ebeced',
            text: '#787774',
          },
        },
      },
      boxShadow: {
        notion: '0 1px 2px rgba(0, 0, 0, 0.04)',
        'notion-md': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        'notion-lg': '0 12px 24px rgba(0, 0, 0, 0.08)',
        'notion-popup': 'rgba(15, 15, 15, 0.05) 0px 0px 0px 1px, rgba(15, 15, 15, 0.1) 0px 3px 6px, rgba(15, 15, 15, 0.2) 0px 9px 24px',
      },
      borderRadius: {
        notion: '4px',
        'notion-md': '6px',
        'notion-lg': '8px',
      },
      fontSize: {
        'notion-xs': ['11px', { lineHeight: '1.4' }],
        'notion-sm': ['12px', { lineHeight: '1.5' }],
        'notion-base': ['14px', { lineHeight: '1.6' }],
        'notion-lg': ['16px', { lineHeight: '1.5' }],
        'notion-xl': ['20px', { lineHeight: '1.4' }],
        'notion-2xl': ['24px', { lineHeight: '1.3' }],
        'notion-3xl': ['30px', { lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
};
