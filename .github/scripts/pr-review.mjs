/**
 * PR Quality Review — Axiomancer Mechanics
 *
 * Calls the Claude API to review a pull request against the project's
 * quality bar, then posts (or updates) a single comment on the PR.
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY, GITHUB_TOKEN, PR_TITLE, PR_BODY, PR_NUMBER, REPO
 */

import fs from 'fs';
import https from 'https';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GITHUB_TOKEN      = process.env.GITHUB_TOKEN;
const PR_TITLE          = process.env.PR_TITLE   ?? '(no title)';
const PR_BODY           = process.env.PR_BODY    ?? '';
const PR_NUMBER         = process.env.PR_NUMBER;
const REPO              = process.env.REPO;       // "owner/repo"
const BOT_MARKER        = '<!-- axiomancer-pr-review -->';
const MAX_DIFF_CHARS    = 18_000;

if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
if (!GITHUB_TOKEN)      throw new Error('GITHUB_TOKEN is not set');
if (!PR_NUMBER)         throw new Error('PR_NUMBER is not set');
if (!REPO)              throw new Error('REPO is not set');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function callClaude(systemPrompt, userPrompt) {
  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
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

  const json = JSON.parse(res.body);
  return json.content[0].text;
}

async function getExistingBotComment() {
  const [owner, repoName] = REPO.split('/');
  const res = await httpsRequest({
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repoName}/issues/${PR_NUMBER}/comments?per_page=100`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'User-Agent': 'axiomancer-pr-review',
      Accept: 'application/vnd.github+json',
    },
  });

  const comments = JSON.parse(res.body);
  if (!Array.isArray(comments)) return null;
  return comments.find((c) => c.body?.includes(BOT_MARKER)) ?? null;
}

async function upsertComment(body) {
  const [owner, repoName] = REPO.split('/');
  const existing = await getExistingBotComment();
  const fullBody = `${BOT_MARKER}\n${body}`;

  if (existing) {
    await httpsRequest(
      {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repoName}/issues/comments/${existing.id}`,
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'axiomancer-pr-review',
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
      },
      JSON.stringify({ body: fullBody }),
    );
    console.log('Updated existing review comment.');
  } else {
    await httpsRequest(
      {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repoName}/issues/${PR_NUMBER}/comments`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'User-Agent': 'axiomancer-pr-review',
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
      },
      JSON.stringify({ body: fullBody }),
    );
    console.log('Posted new review comment.');
  }
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a senior code and game design reviewer for **Axiomancer Mechanics** — a TypeScript TTRPG engine inspired by Mörk Borg and D&D.

## Project context
- Combat uses a Heart / Body / Mind trinity with rock-paper-scissors advantage (Heart > Body > Mind > Heart).
- Skills are themed around logical fallacies and philosophical paradoxes.
- Combat should be quick and decisive (Mörk Borg philosophy): failure is interesting, not just punishing.
- Randomness is expressed through dice rolls (d4–d20); stats feel meaningful but not overwhelming.
- The codebase is functional and immutable: reducers are pure (state, action) => newState; no direct mutation.
- File conventions: index.ts exports, types.d.ts, *.reducer.ts, *.library.ts, *.mock.ts, *.test.ts, *.cli.ts.
- Naming: camelCase functions/vars, PascalCase types, SCREAMING_SNAKE_CASE constants.
- All exported functions must have explicit return types.

## Your job
Review the PR against EVERY criterion below and produce a structured markdown report.
Be direct, specific, and actionable. Do not pad with filler. Keep total output under 1 400 words.

### Criteria

**1. Description completeness** (must-have sections)
- [ ] "Future Goals" section present and substantive
- [ ] "How to Use This" section present and substantive
- [ ] "How to Try Out the Code" section present and substantive
- [ ] Description explains *why*, not just *what*
- [ ] Enough detail for a new contributor to understand the change

**2. Scope / on-task**
- [ ] Code changes match what the description promises — no more, no less
- [ ] No unrelated cleanup or refactoring bundled in
- [ ] PR title clearly names the feature or fix

**3. Over-engineering check**
- [ ] No abstractions added for a single use-case
- [ ] No speculative future-proofing ("we might need this later")
- [ ] No unnecessary wrappers, helpers, or layers
- [ ] Complexity matches the actual requirement

**4. General game design theory**
- [ ] New mechanics have a clear player-facing purpose
- [ ] Balance implications are acknowledged in the description
- [ ] Feedback loops (what the player sees/feels) are considered
- [ ] No mechanics that silently fail or produce invisible state

**5. RPG / TTRPG design (Axiomancer-specific)**
- [ ] Changes respect the Heart / Body / Mind trinity
- [ ] Dice randomness is purposeful, not cosmetic
- [ ] Effects/skills carry thematic flavor (fallacies, paradoxes, mythology)
- [ ] Failure paths are interesting (Mörk Borg ethos)
- [ ] Stats feel weighty; no stat is a dump stat

**6. Code quality / conventions**
- [ ] Reducers are pure; no direct mutation
- [ ] Exported functions have explicit return types
- [ ] New constants use SCREAMING_SNAKE_CASE
- [ ] Types documented with JSDoc @property
- [ ] No hardcoded magic numbers

## Output format
Use this exact markdown structure:

### Overall: [PASS / NEEDS WORK / FAIL]

> One-sentence verdict.

---

#### 1. Description completeness
[findings]

#### 2. Scope / on-task
[findings]

#### 3. Over-engineering
[findings]

#### 4. General game design
[findings]

#### 5. RPG / TTRPG design
[findings]

#### 6. Code quality
[findings]

---

#### Action items
Numbered list of specific things to fix. If none, write "None — looks good."
`.trim();

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rawDiff = fs.existsSync('pr.diff')
    ? fs.readFileSync('pr.diff', 'utf-8')
    : '(diff not available)';

  const diff = rawDiff.length > MAX_DIFF_CHARS
    ? rawDiff.slice(0, MAX_DIFF_CHARS) + '\n\n[diff truncated — showing first 18 000 chars]'
    : rawDiff;

  const userPrompt = `
## PR title
${PR_TITLE}

## PR description
${PR_BODY || '(no description provided)'}

## Diff (TypeScript / JSON files)
\`\`\`diff
${diff}
\`\`\`
`.trim();

  console.log('Calling Claude for PR review...');
  const review = await callClaude(SYSTEM_PROMPT, userPrompt);

  const comment = `## Axiomancer PR Quality Review 🎲\n\n${review}`;
  await upsertComment(comment);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
