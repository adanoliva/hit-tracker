/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f0f0f',
        'bg-secondary': '#1a1a1a',
        'bg-tertiary': '#252525',
        border: '#2a2a2a',
        accent: '#ff4444',
        'accent-hover': '#ff6666',
        secondary: '#00d9ff',
        'secondary-hover': '#00f0ff',
        'text-primary': '#e0e0e0',
        'text-secondary': '#a0a0a0',
        'text-muted': '#808080'
      }
    }
  },
  plugins: []
}
