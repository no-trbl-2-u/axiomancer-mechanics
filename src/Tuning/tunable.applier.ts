/**
 * Safe numeric applier — the only code that writes a tuned value to disk.
 *
 * Mutates EXACTLY ONE numeric leaf, addressed by a structured `TunableLocator`:
 *   - TS constants: parse the file with the TypeScript compiler API, walk to
 *     the precise NumericLiteral by export name + key path, splice just that
 *     token. Cannot accidentally hit another number.
 *   - JSON data: parse, locate the record by id, set the field, re-serialize.
 *
 * Hard guardrails enforced here (belt-and-suspenders on top of the registry):
 *   - candidate is clamped to bounds + per-run magnitude cap + step;
 *   - the resolved file must not be a denylisted path (public API, type
 *     schemas, resolver/engine logic);
 *   - the locator must resolve to exactly one numeric leaf or the apply is
 *     rejected (no write).
 * Every successful apply returns a full-file `backup` for exact restore.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import type { TunableParam } from './types';
import { clampCandidate } from './tunable.registry';

/** Repo root, resolved relative to this compiled file (src/Tuning → repo). */
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export interface SourceBackup {
    /** Repo-relative path. */
    file: string;
    /** Exact original file contents. */
    content: string;
}

export interface ApplyResult {
    ok: boolean;
    param: TunableParam;
    oldValue: number;
    newValue: number;
    diff: string;
    backup?: SourceBackup;
    reason?: string;
}

/** Resolve a repo-relative path to absolute under the repo root. */
function abs(file: string): string {
    return path.isAbsolute(file) ? file : path.join(REPO_ROOT, file);
}

/**
 * Reject writes to files that hold public contracts, type schemas, or logic.
 * The registry already excludes these; this is a second, independent check.
 */
function isDenied(file: string): boolean {
    const norm = file.replace(/\\/g, '/');
    if (norm.endsWith('src/index.ts')) return true;
    if (/\/index\.ts$/.test(norm) && norm.includes('/src/')) return true;
    if (norm.endsWith('types.ts')) return true;
    if (/\.resolver\.ts$/.test(norm)) return true;
    if (/\.engine\.ts$/.test(norm)) return true;
    return false;
}

function isJsonFile(file: string): boolean {
    return file.toLowerCase().endsWith('.json');
}

// ─── TS AST resolution ────────────────────────────────────────────────────────

function unwrap(node: ts.Node): ts.Node {
    let n = node;
    while (
        ts.isAsExpression(n) ||
        ts.isParenthesizedExpression(n) ||
        ts.isSatisfiesExpression(n)
    ) {
        n = n.expression;
    }
    return n;
}

interface NumericLeaf {
    start: number;
    end: number;
    value: number;
}

function numericLeaf(node: ts.Node, sf: ts.SourceFile): NumericLeaf | undefined {
    const n = unwrap(node);
    if (ts.isNumericLiteral(n)) {
        return { start: n.getStart(sf), end: n.getEnd(), value: Number(n.text) };
    }
    if (
        ts.isPrefixUnaryExpression(n) &&
        n.operator === ts.SyntaxKind.MinusToken &&
        ts.isNumericLiteral(n.operand)
    ) {
        return { start: n.getStart(sf), end: n.getEnd(), value: -Number(n.operand.text) };
    }
    return undefined;
}

/** Find the exported `const <name> = ...` initializer. */
function findExportInitializer(sf: ts.SourceFile, name: string): ts.Node | undefined {
    for (const stmt of sf.statements) {
        if (!ts.isVariableStatement(stmt)) continue;
        for (const decl of stmt.declarationList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === name && decl.initializer) {
                return decl.initializer;
            }
        }
    }
    return undefined;
}

/** Descend an object-literal key path to the addressed initializer node. */
function descendKeyPath(node: ts.Node, keyPath: string[]): ts.Node | undefined {
    let current: ts.Node = unwrap(node);
    for (const key of keyPath) {
        if (!ts.isObjectLiteralExpression(current)) return undefined;
        const prop = current.properties.find(
            (p): p is ts.PropertyAssignment =>
                ts.isPropertyAssignment(p) &&
                ((ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === key),
        );
        if (!prop) return undefined;
        current = unwrap(prop.initializer);
    }
    return current;
}

function resolveTsLeaf(text: string, fileName: string, param: TunableParam): NumericLeaf | undefined {
    const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
    const { exportName, keyPath } = param.locator;
    if (!exportName) return undefined;
    const init = findExportInitializer(sf, exportName);
    if (!init) return undefined;
    const target = keyPath && keyPath.length > 0 ? descendKeyPath(init, keyPath) : init;
    if (!target) return undefined;
    return numericLeaf(target, sf);
}

// ─── JSON resolution ──────────────────────────────────────────────────────────

type Json = unknown;

function findRecordById(node: Json, idField: string, id: string): Record<string, Json> | undefined {
    if (Array.isArray(node)) {
        for (const el of node) {
            const found = findRecordById(el, idField, id);
            if (found) return found;
        }
        return undefined;
    }
    if (node && typeof node === 'object') {
        const obj = node as Record<string, Json>;
        if (obj[idField] === id) return obj;
        for (const key of Object.keys(obj)) {
            const found = findRecordById(obj[key], idField, id);
            if (found) return found;
        }
    }
    return undefined;
}

function getNestedField(record: Record<string, Json>, field: string[]): Json {
    let current: Json = record;
    for (const key of field) {
        if (!current || typeof current !== 'object') return undefined;
        current = (current as Record<string, Json>)[key];
    }
    return current;
}

function setNestedField(record: Record<string, Json>, field: string[], value: number): boolean {
    let current: Record<string, Json> = record;
    for (let i = 0; i < field.length - 1; i++) {
        const next = current[field[i]!];
        if (!next || typeof next !== 'object') return false;
        current = next as Record<string, Json>;
    }
    current[field[field.length - 1]!] = value;
    return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Read the current on-disk value for a tunable. Throws if unresolvable. */
export function readTunableValue(param: TunableParam): number {
    const file = abs(param.file);
    const text = fs.readFileSync(file, 'utf8');
    if (isJsonFile(param.file)) {
        const { idField, id, field } = param.locator;
        if (!idField || id === undefined || !field) {
            throw new Error(`readTunableValue: JSON locator incomplete for '${param.id}'.`);
        }
        const record = findRecordById(JSON.parse(text), idField, id);
        if (!record) throw new Error(`readTunableValue: no record id='${id}' in ${param.file}.`);
        const value = getNestedField(record, field);
        if (typeof value !== 'number') {
            throw new Error(`readTunableValue: field ${field.join('.')} is not numeric for '${param.id}'.`);
        }
        return value;
    }
    const leaf = resolveTsLeaf(text, file, param);
    if (!leaf) throw new Error(`readTunableValue: could not resolve TS leaf for '${param.id}'.`);
    return leaf.value;
}

/**
 * Apply a (clamped) value to the tunable. Writes the file and returns a
 * backup. On any safety failure, returns `{ ok: false }` and writes nothing.
 */
export function applyTunableValue(param: TunableParam, proposed: number): ApplyResult {
    const baseFail = (reason: string, oldValue = NaN): ApplyResult => ({
        ok: false, param, oldValue, newValue: NaN, diff: '', reason,
    });

    if (!Number.isFinite(proposed)) return baseFail('proposed value is not finite');
    if (isDenied(param.file)) return baseFail(`denylisted file: ${param.file}`);

    const file = abs(param.file);
    let text: string;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch {
        return baseFail(`cannot read file: ${param.file}`);
    }

    if (isJsonFile(param.file)) {
        const { idField, id, field } = param.locator;
        if (!idField || id === undefined || !field) return baseFail('incomplete JSON locator');
        const data = JSON.parse(text);
        const record = findRecordById(data, idField, id);
        if (!record) return baseFail(`no record id='${id}'`);
        const oldRaw = getNestedField(record, field);
        if (typeof oldRaw !== 'number') return baseFail('target field is not numeric');
        const value = clampCandidate(param, proposed, oldRaw);
        if (!setNestedField(record, field, value)) return baseFail('failed to set field');
        const backup: SourceBackup = { file: param.file, content: text };
        fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
        return {
            ok: true, param, oldValue: oldRaw, newValue: value,
            diff: `${param.id}: ${oldRaw} → ${value}`, backup,
        };
    }

    const leaf = resolveTsLeaf(text, file, param);
    if (!leaf) return baseFail('could not resolve a single numeric leaf');
    const value = clampCandidate(param, proposed, leaf.value);
    const newText = text.slice(0, leaf.start) + String(value) + text.slice(leaf.end);
    // Re-parse to confirm the edit produced exactly the intended value.
    const confirm = resolveTsLeaf(newText, file, param);
    if (!confirm || confirm.value !== value) {
        return baseFail('post-edit verification failed', leaf.value);
    }
    const backup: SourceBackup = { file: param.file, content: text };
    fs.writeFileSync(file, newText, 'utf8');
    return {
        ok: true, param, oldValue: leaf.value, newValue: value,
        diff: `${param.id}: ${leaf.value} → ${value}`, backup,
    };
}

/** Restore a file to its exact pre-apply contents. */
export function restoreBackup(backup: SourceBackup): void {
    fs.writeFileSync(abs(backup.file), backup.content, 'utf8');
}
