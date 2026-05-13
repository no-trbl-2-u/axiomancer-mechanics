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
import { existsSync } from 'node:fs'

const DIST = 'dist'

if (!existsSync(DIST)) {
  console.error('[deploy:check] dist/ not found. Run `npm run build` first.')
  console.error('[deploy:check] The verify gate (npm run verify) creates dist/.')
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
