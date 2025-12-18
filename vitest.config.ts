import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@Character': path.resolve(__dirname, './src/Character'),
      '@Combat': path.resolve(__dirname, './src/Combat'),
      '@Effects': path.resolve(__dirname, './src/Effects'),
      '@Enemy': path.resolve(__dirname, './src/Enemy'),
      '@Game': path.resolve(__dirname, './src/Game'),
      '@Items': path.resolve(__dirname, './src/Items'),
      '@NPCs': path.resolve(__dirname, './src/NPCs'),
      '@Skills': path.resolve(__dirname, './src/Skills'),
      '@Utils': path.resolve(__dirname, './src/Utils'),
      '@World': path.resolve(__dirname, './src/World'),
      'Character': path.resolve(__dirname, './src/Character'),
      'Combat': path.resolve(__dirname, './src/Combat'),
      'Effects': path.resolve(__dirname, './src/Effects'),
      'Enemy': path.resolve(__dirname, './src/Enemy'),
      'Game': path.resolve(__dirname, './src/Game'),
      'Items': path.resolve(__dirname, './src/Items'),
      'NPCs': path.resolve(__dirname, './src/NPCs'),
      'Skills': path.resolve(__dirname, './src/Skills'),
      'Utils': path.resolve(__dirname, './src/Utils'),
      'World': path.resolve(__dirname, './src/World'),
    },
  },
});
