/**
 * Default persistence subpath barrel.
 *
 * Exposes ONLY platform-neutral exports — types and the in-memory / no-op
 * adapters. Platform-specific adapters live on their own subpaths so that
 * UI bundlers never see Node's `fs` or browser globals when consumers
 * import this entry point.
 *
 *   axiomancer-mechanics/persistence                 ← here (universal)
 *   axiomancer-mechanics/persistence/node            ← Node-only
 *   axiomancer-mechanics/persistence/async-storage   ← React Native
 *   axiomancer-mechanics/persistence/web-storage     ← browser
 */
export type { PersistenceAdapter } from './types';
export { nullAdapter } from './null';
export { createMemoryAdapter } from './memory';
