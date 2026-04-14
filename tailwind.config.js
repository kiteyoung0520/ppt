/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        eng: ['Merriweather', 'serif'],
        chn: ['Noto Sans TC', 'sans-serif'],
      },
      keyframes: {
        'popup-fade': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.7)' },
          '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 15px rgba(249, 115, 22, 0)' },
          '100%': { transform: 'scale(0.9)', boxShadow: '0 0 0 0 rgba(249, 115, 22, 0)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%, 75%': { transform: 'translateX(-5px)' },
          '50%': { transform: 'translateX(5px)' },
        },
        'fadeIn': {
          'from': { opacity: 0 },
          'to': { opacity: 1 },
        },
        'fadeInOut': {
          '0%': { opacity: 0 },
          '20%': { opacity: 1 },
          '80%': { opacity: 1 },
          '100%': { opacity: 0 },
        }
      },
      animation: {
        'popup-fade': 'popup-fade 0.2s ease-out',
        'pulse-ring': 'pulse-ring 1.5s infinite',
        'shake': 'shake 0.3s ease-in-out',
        'fadeIn': 'fadeIn 0.3s',
        'fadeInOut': 'fadeInOut 3s forwards'
      }
    },
  },
  plugins: [],
}
