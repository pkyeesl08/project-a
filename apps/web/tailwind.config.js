/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B6B93', light: '#E8F4F8', dark: '#145270' },
        accent: { DEFAULT: '#FF6B35', light: '#FFE5D9' },
        game: {
          reaction: '#FF4444',
          puzzle: '#4488FF',
          action: '#44BB44',
          precision: '#FF8800',
          party: '#BB44FF',
        },
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-in': 'bounceIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
