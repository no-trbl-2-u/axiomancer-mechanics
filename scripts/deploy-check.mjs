#!/usr/bin/env node
/**
 * deploy-check.mjs — deploy gate for axiomancer-mechanics (npm library).
 *
 * "Deploy" for a library = the package is correctly packable (publishable
 * without errors). Runs `npm pack --dry-run`. Requires dist/ to exist
 * (run `npm run build` first via the verify gate).
 *
 * Exit codes:
 *   0 — package is publishable (green)
 *   1 — package is NOT publishable (red — check output)
 *   3 — config error (e.g. package.json malformed)
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const SRC = 'src'

if (!existsSync(DIST)) {
  console.error('[deploy:check] dist/ not found. Run `npm run build` first.')
  console.error('[deploy:check] The verify gate (npm run verify) creates dist/.')
  process.exit(1)
}

// Phase 50 guard — every src/<Module>/types.ts must emit a matching
// dist/<Module>/types.d.ts. Catches the regression that filed GH#64
// (mobile handoff Issue 2) cheaply, without enumerating every public name.
function countModuleTypesFiles(root, declarationOnly) {
  let count = 0
  const moduleDirs = readdirSync(root, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
  for (const mod of moduleDirs) {
    const file = declarationOnly
      ? join(root, mod, 'types.d.ts')
      : join(root, mod, 'types.ts')
    if (existsSync(file) && statSync(file).isFile()) {
      count += 1
    }
  }
  return count
}

const srcTypesCount = countModuleTypesFiles(SRC, false)
const distTypesCount = countModuleTypesFiles(DIST, true)

if (distTypesCount < srcTypesCount) {
  console.error(
    `[deploy:check] dist/<Module>/types.d.ts emission shortfall: ` +
    `expected ${srcTypesCount} (one per src/<Module>/types.ts), got ${distTypesCount}.`
  )
  console.error(
    '[deploy:check] A module-level types.ts was likely re-introduced as types.d.ts ' +
    '(tsc does not emit pre-existing .d.ts files). See plan/phases/phase_50_engine_handoff.md.'
  )
  process.exit(1)
}

try {
  const out = execSync('npm pack --dry-run 2>&1', { encoding: 'utf8' })

  if (out.toLowerCase().includes('npm error') || out.toLowerCase().includes('npm warn pack')) {
    // npm warn pack is usually benign — only fail on actual errors
    const lines = out.split('\n')
    const errors = lines.filter(l => l.toLowerCase().includes('npm error'))
    if (errors.length > 0) {
      console.error('[deploy:check] npm pack --dry-run reported errors:')
      errors.forEach(e => console.error(' ', e))
      process.exit(1)
    }
  }

  // Show the packed file list (the useful part of dry-run output)
  const packedLines = out.split('\n').filter(l => l.trim().startsWith('-') || l.includes('npm notice'))
  if (packedLines.length > 0) {
    console.log('[deploy:check] Package contents (dry run):')
    packedLines.slice(0, 20).forEach(l => console.log(' ', l))
  }

  console.log('[deploy:check] Package is publishable — dry-run passed.')
  process.exit(0)
} catch (err) {
  console.error('[deploy:check] npm pack --dry-run failed:')
  console.error(err.stdout || err.message)
  process.exit(1)
}
