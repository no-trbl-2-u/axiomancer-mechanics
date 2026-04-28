import { defineConfig } from 'tsup';

/**
 * tsup configuration — produces dual ESM + CJS bundles plus type declarations
 * for every public subpath. The output layout matches the `exports` map in
 * package.json:
 *
 *   dist/esm/<entry>.js          ESM
 *   dist/esm/<entry>.d.ts        ESM types
 *   dist/cjs/<entry>.cjs         CJS
 *   dist/cjs/<entry>.d.cts       CJS types (when bundleDts emits .d.cts)
 *
 * Adding a subpath is a one-line edit: add the entry-point path to the
 * `entry` array below, then add the matching `exports` block to package.json.
 */
const ENTRY = {
    index: 'src/index.ts',
    'character/index': 'src/character/index.ts',
    'enemy/index': 'src/enemy/index.ts',
    'combat/index': 'src/combat/index.ts',
    'effects/index': 'src/effects/index.ts',
    'items/index': 'src/items/index.ts',
    'skills/index': 'src/skills/index.ts',
    'npcs/index': 'src/npcs/index.ts',
    'world/index': 'src/world/index.ts',
    'game/index': 'src/game/index.ts',
    'store/index': 'src/store/index.ts',
    'utils/index': 'src/utils/index.ts',

    'persistence/index': 'src/persistence/index.ts',
    'persistence/node': 'src/persistence/node.ts',
    'persistence/async-storage': 'src/persistence/async-storage.ts',
    'persistence/web-storage': 'src/persistence/web-storage.ts',

    'content/index': 'src/content/index.ts',
    'content/effects/index': 'src/content/effects/index.ts',
    'content/enemies/index': 'src/content/enemies/index.ts',
    'content/items/index': 'src/content/items/index.ts',
    'content/world/index': 'src/content/world/index.ts',

    'fixtures/index': 'fixtures/index.ts',
};

export default defineConfig([
    {
        entry: ENTRY,
        outDir: 'dist/esm',
        format: ['esm'],
        target: 'es2020',
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: false,
        treeshake: true,
        minify: false,
        outExtension: () => ({ js: '.mjs' }),
        external: ['zustand', 'zustand/vanilla', '@react-native-async-storage/async-storage'],
    },
    {
        entry: ENTRY,
        outDir: 'dist/cjs',
        format: ['cjs'],
        target: 'es2020',
        dts: true,
        sourcemap: true,
        clean: true,
        splitting: false,
        treeshake: true,
        minify: false,
        outExtension: () => ({ js: '.cjs', dts: '.d.cts' }),
        external: ['zustand', 'zustand/vanilla', '@react-native-async-storage/async-storage'],
    },
]);
