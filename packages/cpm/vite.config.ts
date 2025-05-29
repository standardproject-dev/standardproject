/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { resolve } from 'path'

export default defineConfig(() => {
  const plugins = [
    tsconfigPaths(),
  ]
  return {
    plugins,
    test: {
      globals: true,
      environment: 'node',
      include: ['test/**/*.test.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      coverage: {
        reporter: ['text', 'json', 'html'],
        exclude: ['**/node_modules/**'],
      },
    },
    resolve: {
      alias: {
        '~': resolve(__dirname, './src'),
      },
    },
  }
})
