/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        mono:    ['var(--font-mono)', 'ui-monospace'],
        display: ['var(--font-display)', 'ui-sans-serif'],
      },
      colors: {
        cream: {
          50:  '#FDFAF5',
          100: '#F8F3E8',
          200: '#F2EAD8',
          300: '#E8DEC8',
          400: '#D9CEB5',
          500: '#C8BA9E',
        },
        brand: {
          50:  '#EDFAF7',
          100: '#D0F3EB',
          200: '#A3E8D8',
          300: '#64D4BE',
          400: '#2ABBA0',
          500: '#00A389',   // primary teal
          600: '#008A74',
          700: '#006D5B',
          800: '#005446',
          900: '#003D32',
        },
        channel: {
          twitter:   '#1DA1F2',
          linkedin:  '#0A66C2',
          instagram: '#E1306C',
          email:     '#F59E0B',
          facebook:  '#1877F2',
        },
      },
      boxShadow: {
        'panel':  '0 2px 16px 0 rgba(0,0,0,0.07)',
        'card':   '0 1px 6px 0 rgba(0,0,0,0.06)',
        'lifted': '0 4px 24px 0 rgba(0,0,0,0.10)',
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.25rem',
      },
      animation: {
        'fade-in':   'fadeIn 0.35s ease-out',
        'slide-in':  'slideIn 0.3s ease-out',
        'pop':       'pop 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft':'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn:   { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pop:       { '0%': { transform: 'scale(0.95)' }, '100%': { transform: 'scale(1)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
    },
  },
  plugins: [],
};
