#!/usr/bin/env ts-node
import fs from 'fs';
import path from 'path';
import { runPlaytestScenario } from './playtest.runner';
import { renderPlaytestMarkdown } from './report';
import type { PlaytestScenario } from './types';

interface CliFlags {
    scenarioPath: string;
    outDir: string;
    json: boolean;
}

function parseArgs(args: string[]): CliFlags {
    const flags: CliFlags = {
        scenarioPath: 'automation/playtest/scenarios/late-game-coastal-tyrant.json',
        outDir: 'automation/playtest/reports',
        json: true,
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i]!;
        if (arg === '--scenario') {
            const value = args[++i];
            if (!value) throw new Error('--scenario requires a path.');
            flags.scenarioPath = value;
        } else if (arg.startsWith('--scenario=')) {
            flags.scenarioPath = arg.slice('--scenario='.length);
        } else if (arg === '--out-dir') {
            const value = args[++i];
            if (!value) throw new Error('--out-dir requires a path.');
            flags.outDir = value;
        } else if (arg.startsWith('--out-dir=')) {
            flags.outDir = arg.slice('--out-dir='.length);
        } else if (arg === '--no-json') {
            flags.json = false;
        } else {
            throw new Error(`Unknown playtest flag: ${arg}`);
        }
    }
    return flags;
}

function readScenario(filePath: string): PlaytestScenario {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as PlaytestScenario;
}

function safeFileStem(id: string): string {
    return id.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'playtest-report';
}

function main(): void {
    const flags = parseArgs(process.argv.slice(2));
    const scenarioPath = path.resolve(flags.scenarioPath);
    const outDir = path.resolve(flags.outDir);
    const scenario = readScenario(scenarioPath);
    const report = runPlaytestScenario(scenario);
    fs.mkdirSync(outDir, { recursive: true });
    const stem = safeFileStem(report.scenarioId);
    const mdPath = path.join(outDir, `${stem}.md`);
    fs.writeFileSync(mdPath, renderPlaytestMarkdown(report), 'utf-8');
    let jsonPath: string | undefined;
    if (flags.json) {
        jsonPath = path.join(outDir, `${stem}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
    }
    process.stdout.write(`Playtest complete: ${report.scenarioId}\n`);
    process.stdout.write(`Markdown: ${mdPath}\n`);
    if (jsonPath) process.stdout.write(`JSON: ${jsonPath}\n`);
    process.stdout.write(`Findings: ${report.findings.length}\n`);
}

main();
