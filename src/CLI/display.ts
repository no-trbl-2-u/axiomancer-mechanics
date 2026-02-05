/**
 * CLI Display Utilities
 * ASCII art, colors, formatting, and visual helpers for the CLI tools.
 */

// ============================================================================
// ANSI COLOR CODES
// ============================================================================

export const Colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',
    blink: '\x1b[5m',
    inverse: '\x1b[7m',
    hidden: '\x1b[8m',
    strikethrough: '\x1b[9m',

    // Foreground
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',

    // Background
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
} as const;

// ============================================================================
// COLOR HELPER FUNCTIONS
// ============================================================================

export const color = (text: string, ...codes: string[]): string =>
    `${codes.join('')}${text}${Colors.reset}`;

export const bold = (text: string): string => color(text, Colors.bold);
export const dim = (text: string): string => color(text, Colors.dim);
export const italic = (text: string): string => color(text, Colors.italic);
export const red = (text: string): string => color(text, Colors.red);
export const green = (text: string): string => color(text, Colors.green);
export const yellow = (text: string): string => color(text, Colors.yellow);
export const blue = (text: string): string => color(text, Colors.blue);
export const magenta = (text: string): string => color(text, Colors.magenta);
export const cyan = (text: string): string => color(text, Colors.cyan);
export const gray = (text: string): string => color(text, Colors.gray);
export const white = (text: string): string => color(text, Colors.white);

// Compound styles
export const boldRed = (text: string): string => color(text, Colors.bold, Colors.red);
export const boldGreen = (text: string): string => color(text, Colors.bold, Colors.green);
export const boldYellow = (text: string): string => color(text, Colors.bold, Colors.yellow);
export const boldBlue = (text: string): string => color(text, Colors.bold, Colors.blue);
export const boldMagenta = (text: string): string => color(text, Colors.bold, Colors.magenta);
export const boldCyan = (text: string): string => color(text, Colors.bold, Colors.cyan);
export const boldWhite = (text: string): string => color(text, Colors.bold, Colors.white);

// ============================================================================
// ASCII ART
// ============================================================================

export const TITLE_ART = `
${color('    ___   _  __ ________  __  ______    _   ______________', Colors.cyan, Colors.bold)}
${color('   /   | | |/ //  _/ __ \\/  |/  /   |  / | / / ____/ ____/', Colors.cyan, Colors.bold)}
${color('  / /| | |   / / // / / / /|_/ / /| | /  |/ / /   / __/   ', Colors.cyan, Colors.bold)}
${color(' / ___ |/   |_/ // /_/ / /  / / ___ |/ /|  / /___/ /___   ', Colors.blue, Colors.bold)}
${color('/_/  |_/_/|_/___/\\____/_/  /_/_/  |_/_/ |_/\\____/_____/   ', Colors.blue, Colors.bold)}
`;

export const COMBAT_ART = [
    '',
    color('   ______                __          __', Colors.red, Colors.bold),
    color('  / ____/___  ____ ___  / /_  ____ _/ /_', Colors.red, Colors.bold),
    color(' / /   / __ \\/ __ `__ \\/ __ \\/ __ `/ __/', Colors.red, Colors.bold),
    color('/ /___/ /_/ / / / / / / /_/ / /_/ / /_  ', Colors.yellow, Colors.bold),
    color('\\____/\\____/_/ /_/ /_/_.___/\\__,_/\\__/  ', Colors.yellow, Colors.bold),
    '',
].join('\n');

export const LIBRARY_ART = [
    '',
    color('   __    _ __                         ', Colors.magenta, Colors.bold),
    color('  / /   (_) /_  _________ ________  __', Colors.magenta, Colors.bold),
    color(' / /   / / __ \\/ ___/ __ `/ ___/ / / /', Colors.magenta, Colors.bold),
    color('/ /___/ / /_/ / /  / /_/ / /  / /_/ / ', Colors.blue, Colors.bold),
    color('/_____/_/_.___/_/   \\__,_/_/   \\__, /  ', Colors.blue, Colors.bold),
    color('                               /____/  ', Colors.blue, Colors.bold),
    '',
].join('\n');

export const GAME_OVER_ART = [
    '',
    color('   ____                        ____                ', Colors.red, Colors.bold),
    color('  / ___| __ _ _ __ ___   ___  / __ \\__   _____ _ __', Colors.red, Colors.bold),
    color(" | |  _ / _` | '_ ` _ \\ / _ \\/ / _` \\ \\ / / _ \\ '__|", Colors.red),
    color(' | |_| | (_| | | | | | |  __/ | (_| |\\ V /  __/ |  ', Colors.gray),
    color('  \\____|\\__,_|_| |_| |_|\\___|  \\__,_| \\_/ \\___|_|  ', Colors.gray),
    '',
].join('\n');

export const VICTORY_ART = `
${color(' __      ___      _                   _ ', Colors.green, Colors.bold)}
${color(' \\ \\    / (_)    | |                 | |', Colors.green, Colors.bold)}
${color('  \\ \\  / / _  ___| |_ ___  _ __ _   _| |', Colors.green, Colors.bold)}
${color('   \\ \\/ / | |/ __| __/ _ \\| \'__| | | | |', Colors.yellow, Colors.bold)}
${color('    \\  /  | | (__| || (_) | |  | |_| |_|', Colors.yellow, Colors.bold)}
${color('     \\/   |_|\\___|\\__\\___/|_|   \\__, (_)', Colors.yellow, Colors.bold)}
${color('                                 __/ |  ', Colors.yellow, Colors.bold)}
${color('                                |___/   ', Colors.yellow, Colors.bold)}
`;

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

/**
 * Creates a horizontal divider line
 * @param char - Character to use for the divider
 * @param length - Length of the divider
 * @returns Formatted divider string
 */
export function divider(char: string = '─', length: number = 60): string {
    return gray(char.repeat(length));
}

/**
 * Creates a boxed header with a title
 * @param title - The title text
 * @param width - Width of the box
 * @returns Formatted box string
 */
export function boxHeader(title: string, width: number = 60): string {
    const padding = Math.max(0, width - title.length - 4);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    const top = `${gray('┌')}${gray('─'.repeat(width - 2))}${gray('┐')}`;
    const middle = `${gray('│')} ${' '.repeat(leftPad)}${boldCyan(title)}${' '.repeat(rightPad)} ${gray('│')}`;
    const bottom = `${gray('└')}${gray('─'.repeat(width - 2))}${gray('┘')}`;
    return `${top}\n${middle}\n${bottom}`;
}

/**
 * Creates a health bar visualization
 * @param current - Current HP
 * @param max - Maximum HP
 * @param width - Width of the bar
 * @returns Formatted health bar string
 */
export function healthBar(current: number, max: number, width: number = 20): string {
    const percent = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(percent * width);
    const empty = width - filled;

    let barColor: string = Colors.green;
    if (percent <= 0.25) barColor = Colors.red;
    else if (percent <= 0.5) barColor = Colors.yellow;

    const bar = `${color('█'.repeat(filled), barColor)}${gray('░'.repeat(empty))}`;
    const text = `${current}/${max}`;
    return `${bar} ${text}`;
}

/**
 * Creates a mana bar visualization
 * @param current - Current MP
 * @param max - Maximum MP
 * @param width - Width of the bar
 * @returns Formatted mana bar string
 */
export function manaBar(current: number, max: number, width: number = 20): string {
    const percent = Math.max(0, Math.min(1, current / max));
    const filled = Math.round(percent * width);
    const empty = width - filled;

    const bar = `${color('█'.repeat(filled), Colors.blue)}${gray('░'.repeat(empty))}`;
    const text = `${current}/${max}`;
    return `${bar} ${text}`;
}

/**
 * Formats a stat label and value
 * @param label - The stat name
 * @param value - The stat value
 * @returns Formatted stat string
 */
export function statLine(label: string, value: number | string): string {
    return `  ${gray('>')} ${white(label.padEnd(20))} ${boldCyan(String(value))}`;
}

/**
 * Displays a narration-style text block
 * @param text - The narrative text
 * @returns Formatted narrative string
 */
export function narration(text: string): string {
    return `\n  ${italic(gray('"'))}${italic(white(text))}${italic(gray('"'))}\n`;
}

/**
 * Displays a type advantage indicator
 * @param type - heart, body, or mind
 * @returns Colored type string
 */
export function formatType(type: string): string {
    switch (type) {
        case 'heart': return color('Heart', Colors.red, Colors.bold);
        case 'body': return color('Body', Colors.yellow, Colors.bold);
        case 'mind': return color('Mind', Colors.cyan, Colors.bold);
        default: return white(type);
    }
}

/**
 * Formats advantage as colored text
 * @param advantage - advantage, neutral, or disadvantage
 * @returns Colored advantage string
 */
export function formatAdvantage(advantage: string): string {
    switch (advantage) {
        case 'advantage': return boldGreen('ADVANTAGE');
        case 'disadvantage': return boldRed('DISADVANTAGE');
        case 'neutral': return boldYellow('NEUTRAL');
        default: return white(advantage);
    }
}

/**
 * Creates a dice roll animation string
 * @param sides - Number of sides
 * @param result - The roll result
 * @returns Formatted dice roll display
 */
export function diceRoll(sides: number, result: number): string {
    const die = `d${sides}`;
    let resultColor = white;
    if (result === sides) resultColor = boldGreen;  // Max roll
    else if (result === 1) resultColor = boldRed;   // Min roll

    return `${gray('[')}${cyan(die)}${gray(']')} ${resultColor(String(result))}`;
}

/**
 * Delay helper for dramatic pauses
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Prints text with a typewriter effect
 * @param text - Text to print
 * @param speed - Milliseconds between characters
 */
export async function typewriter(text: string, speed: number = 30): Promise<void> {
    for (const char of text) {
        process.stdout.write(char);
        await delay(speed);
    }
    console.log();
}

/**
 * Clears the terminal screen
 */
export function clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * Displays the type advantage triangle
 * @returns Formatted type triangle string
 */
export function typeTriangle(): string {
    return [
        '',
        `  ${formatType('heart')} ${gray('>')} ${formatType('body')} ${gray('>')} ${formatType('mind')} ${gray('>')} ${formatType('heart')}`,
        `  ${dim('(Emotion beats Physical, Physical beats Mental, Mental beats Emotion)')}`,
        '',
    ].join('\n');
}
