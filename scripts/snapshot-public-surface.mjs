#!/usr/bin/env node
/**
 * snapshot-public-surface.mjs — Phase 53 unit 1.
 *
 * Walks `dist/index.d.ts` (the post-build canonical surface) and emits
 * a deterministic-sorted JSON listing every exported name + kind. The
 * output is the contract — `scripts/public-surface.expected.json` is
 * the committed fixture, and `scripts/deploy-check.mjs` enforces that
 * the current snapshot matches the fixture.
 *
 * Shape: `{ values: string[], types: string[] }`. Both arrays are
 * sorted, deduplicated. `values` are runtime exports (functions, const,
 * enum); `types` are TS-erased exports (interface, type alias).
 *
 * Per Phase 53 D1, arity / shape hints are deferred — name + kind is
 * sufficient to catch the add / remove / rename drift this phase
 * targets. Shape drift is caught by the existing hermetic tests +
 * type-checker.
 *
 * CLI mode:
 *   node scripts/snapshot-public-surface.mjs               # print JSON to stdout
 *   node scripts/snapshot-public-surface.mjs --write       # overwrite the fixture
 *
 * Library mode (imported by deploy-check.mjs):
 *   import { snapshotPublicSurface } from './snapshot-public-surface.mjs';
 *   const surface = snapshotPublicSurface();
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST_INDEX_DTS = 'dist/index.d.ts'
const FIXTURE_PATH = 'scripts/public-surface.expected.json'

const EXPORT_LINE_RE = /^export\s+(type\s+)?\{\s*([^}]+)\s*\}\s+from\s+'[^']+'\s*;?\s*$/

export function snapshotPublicSurface(distIndexPath = DIST_INDEX_DTS) {
  if (!existsSync(distIndexPath)) {
    throw new Error(
      `[snapshot-public-surface] ${distIndexPath} not found. Run \`npm run build\` first.`
    )
  }

  const text = readFileSync(distIndexPath, 'utf8')
  const values = new Set()
  const types = new Set()

  for (const line of text.split('\n')) {
    const match = line.trim().match(EXPORT_LINE_RE)
    if (!match) continue
    const isTypeExport = Boolean(match[1])
    const names = match[2]
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
    const target = isTypeExport ? types : values
    for (const name of names) target.add(name)
  }

  return {
    values: [...values].sort(),
    types: [...types].sort(),
  }
}

// CLI entry point
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const surface = snapshotPublicSurface()
  const json = JSON.stringify(surface, null, 2) + '\n'

  if (process.argv.includes('--write')) {
    writeFileSync(FIXTURE_PATH, json)
    console.log(
      `[snapshot-public-surface] Wrote ${surface.values.length} values + ` +
      `${surface.types.length} types to ${FIXTURE_PATH}.`
    )
  } else {
    process.stdout.write(json)
  }
}
