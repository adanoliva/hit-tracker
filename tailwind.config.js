/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-primary':      'var(--bg-primary)',
        'bg-secondary':    'var(--bg-secondary)',
        'bg-tertiary':     'var(--bg-tertiary)',
        border:            'var(--border)',
        accent:            'var(--accent)',
        'accent-hover':    'var(--accent-hover)',
        secondary:         'var(--secondary)',
        'secondary-hover': 'var(--secondary-hover)',
        'text-primary':    'var(--text-primary)',
        'text-secondary':  'var(--text-secondary)',
        'text-muted':      'var(--text-muted)'
      }
    }
  },
  plugins: []
}
