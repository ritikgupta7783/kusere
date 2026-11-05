/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette drawn from the logo/pack: leaf green, brand red, indigo "HERBS" tag, plus warm Ayurvedic neutrals.
        cream: { DEFAULT: '#FAF7EF', 100: '#F3EEDD', 200: '#E9E2CB' },
        forest: { DEFAULT: '#1B5E3A', 700: '#164C2F', 800: '#103A24', 900: '#0B2917' },
        leaf: { DEFAULT: '#43A047', 100: '#E6F3E2', 200: '#CDE7C6', 500: '#43A047' },
        turmeric: { DEFAULT: '#E0A21B', 100: '#FCF1D2' },
        brand: { red: '#E53935', indigo: '#3F3D9C' },
        ink: { DEFAULT: '#14261B', 500: '#4A5A50', 400: '#6B7A70' },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(20,38,27,.25)',
        card: '0 1px 2px rgba(20,38,27,.06), 0 8px 24px -12px rgba(20,38,27,.18)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'none' } },
        floaty: { '0%,100%': { transform: 'translateY(0) rotate(-2deg)' }, '50%': { transform: 'translateY(-10px) rotate(-2deg)' } },
      },
      animation: { rise: 'rise .6s ease-out both', floaty: 'floaty 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};
