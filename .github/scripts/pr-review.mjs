/**
 * PR Quality Review — Axiomancer Mechanics
 *
 * One Claude call → one GitHub PR Review submission.
 * Claude returns JSON with inline code comments + a general summary body.
 * Inline comments are pinned to specific diff lines; everything else
 * (description quality, scope, game design) goes in the review body.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY, GITHUB_TOKEN, PR_TITLE, PR_BODY,
 *   PR_NUMBER, COMMIT_SHA, REPO
 */

import fs from 'fs';
import https from 'https';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN      = process.env.GITHUB_TOKEN;
const PR_TITLE          = process.env.PR_TITLE    ?? '(no title)';
const PR_BODY           = process.env.PR_BODY     ?? '';
const PR_NUMBER         = process.env.PR_NUMBER;
const COMMIT_SHA        = process.env.COMMIT_SHA;
const REPO              = process.env.REPO;
const MAX_DIFF_CHARS    = 20_000;

if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
if (!GITHUB_TOKEN)      throw new Error('GITHUB_TOKEN is not set');
if (!PR_NUMBER)         throw new Error('PR_NUMBER is not set');
if (!COMMIT_SHA)        throw new Error('COMMIT_SHA is not set');
if (!REPO)              throw new Error('REPO is not set');

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Diff parser
// Returns Map<filePath, Set<newFileLineNumber>> for every line visible in
// the diff (both context lines and added lines on the RIGHT/new side).
// GitHub's review API requires the line to be inside a hunk.
// ---------------------------------------------------------------------------

function parseValidLines(diffText) {
  const result = new Map();
  let currentFile = null;
  let newLineNum = 0;

  for (const line of diffText.split('\n')) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6).trim();
      if (!result.has(currentFile)) result.set(currentFile, new Set());
    } else if (line.startsWith('@@') && currentFile) {
      const m = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) newLineNum = parseInt(m[1], 10) - 1;
    } else if (currentFile) {
      if (line.startsWith('+')) {
        newLineNum++;
        result.get(currentFile).add(newLineNum);
      } else if (line.startsWith('-')) {
        // deleted line — does not advance new-file counter
      } else {
        // context line
        newLineNum++;
        result.get(currentFile).add(newLineNum);
      }
    }
  }

  return result;
}

// Build a compact summary of changed files + line ranges to orient Claude.
function buildFileSummary(validLines) {
  if (validLines.size === 0) return '(no TypeScript/JSON files changed)';
  const lines = [];
  for (const [file, lineSet] of validLines) {
    const sorted = [...lineSet].sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0], end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) { end = sorted[i]; }
      else { ranges.push(start === end ? `${start}` : `${start}–${end}`); start = end = sorted[i]; }
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    lines.push(`- ${file} (lines ${ranges.join(', ')})`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Claude
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a code and game design reviewer for **Axiomancer Mechanics** — a TypeScript TTRPG engine (Mörk Borg-inspired).

## Project context
- Heart / Body / Mind trinity with rock-paper-scissors advantage (Heart > Body > Mind > Heart).
- Skills themed around logical fallacies and philosophical paradoxes.
- Combat is quick and decisive; failure should be interesting, not just punishing.
- Dice rolls (d4–d20) must be purposeful; stats feel meaningful, no dump stat.
- Reducers are pure: (state, action) => newState — never mutate state.
- File roles: index.ts, types.d.ts, *.reducer.ts, *.library.ts, *.mock.ts, *.test.ts, *.cli.ts.
- Naming: camelCase vars/functions, PascalCase types, SCREAMING_SNAKE_CASE constants.
- All exported functions must have explicit return types.
- No over-engineering: no abstractions for a single use-case, no speculative future code.

## Your output
Respond with **valid JSON only** — no markdown fence, no preamble, no trailing text.

Schema:
{
  "verdict": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  "inline_comments": [
    {
      "path": "relative/path/to/file.ts",
      "line": <integer — must be a line number listed in the valid lines below>,
      "body": "Concise, specific comment about this exact code."
    }
  ],
  "general_body": "<markdown string covering everything not tied to a specific line>"
}

## What goes where

**inline_comments** — specific code issues only:
- State mutation
- Missing return types on exported functions
- Magic numbers that should be named constants
- Naming convention violations
- Impure reducer logic
- Overly complex or speculative abstractions

**general_body** — everything else (use markdown headers):
### Overall: APPROVE | REQUEST_CHANGES | COMMENT
One-sentence verdict.
### Description
- Are "Future Goals", "How to Use This", and "How to Try Out the Code" sections present and substantive?
- Does the description explain the *why*, not just the *what*?
### Scope
- Do the code changes match what the description promises?
- Any unrelated cleanup or refactoring bundled in?
### Game Design
- Do new mechanics have a clear player-facing purpose?
- Are balance implications acknowledged?
- Are feedback loops (what the player sees/feels) considered?
### RPG / TTRPG Design
- Does this respect the Heart / Body / Mind trinity?
- Is randomness purposeful? Do effects carry thematic flavor (fallacies, paradoxes)?
- Are failure paths interesting (Mörk Borg ethos)?
### Action Items
Numbered list of things to fix. "None." if everything looks good.

## Rules
- Only use line numbers listed under "Valid diff lines" in the user message.
- If you have nothing to say about a section, write a single short sentence saying so.
- Be direct and specific. No padding.
`.trim();

async function callClaude(userPrompt) {
  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const res = await httpsRequest(
    {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    payload,
  );

  if (res.status !== 200) {
    throw new Error(`Claude API error ${res.status}: ${res.body}`);
  }

  return JSON.parse(res.body).content[0].text;
}

// ---------------------------------------------------------------------------
// GitHub PR Review submission
// ---------------------------------------------------------------------------

async function submitReview(verdict, inlineComments, generalBody) {
  const [owner, repoName] = REPO.split('/');

  const eventMap = {
    APPROVE: 'APPROVE',
    REQUEST_CHANGES: 'REQUEST_CHANGES',
    COMMENT: 'COMMENT',
  };
  const event = eventMap[verdict] ?? 'COMMENT';

  const payload = JSON.stringify({
    commit_id: COMMIT_SHA,
    body: generalBody,
    event,
    comments: inlineComments.map((c) => ({
      path: c.path,
      line: c.line,
      side: 'RIGHT',
      body: c.body,
    })),
  });

  const res = await httpsRequest(
    {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repoName}/pulls/${PR_NUMBER}/reviews`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'axiomancer-pr-review',
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    payload,
  );

  if (res.status !== 200) {
    throw new Error(`GitHub review API error ${res.status}: ${res.body}`);
  }

  console.log(`Review submitted (${event}) with ${inlineComments.length} inline comment(s).`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rawDiff = fs.existsSync('pr.diff')
    ? fs.readFileSync('pr.diff', 'utf-8')
    : '';

  const diff = rawDiff.length > MAX_DIFF_CHARS
    ? rawDiff.slice(0, MAX_DIFF_CHARS) + '\n\n[diff truncated]'
    : rawDiff;

  const validLines = parseValidLines(diff);
  const fileSummary = buildFileSummary(validLines);

  const userPrompt = `
## PR title
${PR_TITLE}

## PR description
${PR_BODY || '(no description provided)'}

## Valid diff lines (ONLY use these for inline_comments)
${fileSummary}

## Full diff
\`\`\`diff
${diff || '(empty diff)'}
\`\`\`
`.trim();

  console.log('Calling Claude for PR review...');
  const rawResponse = await callClaude(userPrompt);

  // Parse Claude's JSON response
  let review;
  try {
    // Strip a markdown code fence if Claude wrapped it despite instructions
    const cleaned = rawResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    review = JSON.parse(cleaned);
  } catch {
    // Fallback: post whatever Claude returned as a plain comment body
    console.warn('Claude returned non-JSON — falling back to plain comment.');
    review = { verdict: 'COMMENT', inline_comments: [], general_body: rawResponse };
  }

  // Validate inline comments against parsed diff to avoid GitHub API rejections
  const validatedInline = (review.inline_comments ?? []).filter((c) => {
    const lineSet = validLines.get(c.path);
    if (!lineSet) {
      console.warn(`Dropping inline comment: file not in diff — ${c.path}`);
      return false;
    }
    if (!lineSet.has(c.line)) {
      console.warn(`Dropping inline comment: line ${c.line} not in diff for ${c.path}`);
      return false;
    }
    return true;
  });

  await submitReview(
    review.verdict ?? 'COMMENT',
    validatedInline,
    review.general_body ?? '(no summary)',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
