import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
    },
    resolve: {
        alias: {
            'Character':    path.resolve(__dirname, 'src/Character'),
            'Enemy':        path.resolve(__dirname, 'src/Enemy'),
            'Combat':       path.resolve(__dirname, 'src/Combat'),
            'Effects':      path.resolve(__dirname, 'src/Effects'),
            'Game':         path.resolve(__dirname, 'src/Game'),
            'Utils':        path.resolve(__dirname, 'src/Utils'),
            '@Combat':      path.resolve(__dirname, 'src/Combat'),
        },
    },
});
