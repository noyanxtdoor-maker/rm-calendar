import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09111f',
        surface: '#101d30',
        teal: '#5ad7cc',
        gold: '#f4c66f',
        violet: '#aa9af8'
      }
    }
  },
  plugins: []
} satisfies Config
