/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cosmic color palette from instructions
        'cosmic-deep': '#0B0019',
        'cosmic-dark': '#0B0019', // Alias for cosmic-deep
        'cosmic-purple': '#1A0033',
        'cosmic-primary': '#8A2BE2',
        'cosmic-magenta': '#FF1493',
        'cosmic-violet': '#9400D3',
        'cosmic-accent': '#FF1493',
        'cosmic-yellow': '#FF1493', // Alias now magenta to match accent
        'cosmic-secondary': '#9725C7',
        'cosmic-medium': '#5B25C7',
        'cosmic-bright': '#4B0082',
        'cosmic-error': '#F03E3E',
        'transparent-75': 'rgba(255, 255, 255, 0.75)',
        'transparent-20': 'rgba(255, 255, 255, 0.20)',
        'transparent-10': 'rgba(255, 255, 255, 0.10)',
        'transparent-5': 'rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'tubi': ['Tubi Stans Variable', 'Inter', 'sans-serif'],
      },
      fontWeight: {
        'ultra-light': '190',
        'medium': '500',
        'bold': '700',
        'black': '900',
      },
      borderRadius: {
        'pill': '999px',
      },
      backdropBlur: {
        'cosmic': '20px',
        'cosmic-strong': '30px',
      },
      animation: {
        'cosmic-glow': 'cosmic-glow 3s ease-in-out infinite alternate',
        'planet-rotate': 'planet-rotate 20s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      backgroundImage: {
        'cosmic-gradient': 'linear-gradient(135deg, #000000 0%, #4B0082 100%)',
        'hero-gradient': 'linear-gradient(135deg, #4B0082 0%, #FF1493 50%, #9400D3 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      boxShadow: {
        'cosmic': '0 0 30px rgba(138, 43, 226, 0.3)',
        'cosmic-strong': '0 0 50px rgba(255, 20, 147, 0.4)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
