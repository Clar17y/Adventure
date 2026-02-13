import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@adventure/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@adventure/game-engine': resolve(__dirname, '../../packages/game-engine/src/index.ts'),
      '@adventure/database': resolve(__dirname, '../../packages/database/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
  },
});
