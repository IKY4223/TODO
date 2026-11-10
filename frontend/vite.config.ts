import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/api/schema.d.ts', 'src/main.tsx'],
      reporter: ['text'],
      // The suite fails when less than this share of the code runs under test.
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
})
