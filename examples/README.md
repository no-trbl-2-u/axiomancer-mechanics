# Examples

Minimal smoke tests for `axiomancer-mechanics` consumed as an external library.

| Example | Run from repo root |
|---|---|
| Node CJS  | `npm run build && node examples/node-cjs/index.cjs` |
| Node ESM  | `npm run build && node examples/node-esm/index.mjs` |

Both examples exercise subpath imports (`/character`, `/combat`,
`/persistence`, `/store`, `/game`) and a small end-to-end interaction
(create character, instantiate store, compute advantage).

The npm workspace symlinks `axiomancer-mechanics` to `packages/engine`,
so these examples resolve the package the same way an external consumer
would after `npm install axiomancer-mechanics`.
