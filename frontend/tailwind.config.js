/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f2f0ff', 100: '#e6e2ff', 200: '#cfc7ff', 300: '#b0a1ff',
          400: '#8f74ff', 500: '#7c4dff', 600: '#6d34f2', 700: '#5b26cf',
          800: '#4a20a8', 900: '#3d1d85',
        },
        cyanic: {
          400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2',
        },
        ink: {
          950: '#070a1c', 900: '#0b0f2a', 850: '#101637', 800: '#141b43',
        },
      },
      backgroundImage: {
        'grid-dark':
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
        'grid-light':
          'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)',
      },
      backgroundSize: { grid: '44px 44px' },
      boxShadow: {
        glow: '0 0 24px rgba(124,77,255,0.35)',
        'glow-lg': '0 0 60px rgba(124,77,255,0.45)',
        'glow-cyan': '0 0 30px rgba(34,211,238,0.35)',
        glass: '0 10px 40px -12px rgba(8, 8, 40, 0.55)',
        'inner-top': 'inset 0 1px 0 0 rgba(255,255,255,0.08)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(4deg)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(14px,-26px,0) scale(1.05)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-pan': {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        'float-slow': 'float-slow 16s ease-in-out infinite',
        shimmer: 'shimmer 2.2s infinite',
        'gradient-pan': 'gradient-pan 12s ease infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow': 'spin-slow 22s linear infinite',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
