/**
 * Utility functions used across the application
 */

/**
 * Clamps a number between min and max values
 * @param value - The value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns The clamped value
 * @example
 * clamp(15, 0, 10) // Returns 10
 * clamp(-5, 0, 10) // Returns 0
 * clamp(5, 0, 10)  // Returns 5
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Generates a random integer between min and max (inclusive)
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer in the range [min, max]
 * @example
 * randomInt(1, 6) // Returns a number between 1 and 6 (like a die roll)
 */
export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Deep clones an object using JSON serialization
 * @param obj - The object to clone
 * @returns A deep copy of the object
 * @remarks Warning: Does not preserve functions, symbols, undefined values, or circular references
 * @example
 * const original = { name: "Hero", stats: { hp: 100 } };
 * const copy = deepClone(original);
 * copy.stats.hp = 50;
 * console.log(original.stats.hp); // Still 100
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Calculates the average of an array of numbers
 * @param numbers - Numbers to average
 * @returns The average value, or 0 if no numbers provided
 * @example
 * average(1, 2, 3, 4, 5) // Returns 3
 * average(10, 20)        // Returns 15
 */
export function average(...numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Rolls a die with the specified number of sides
 * @param sides - Number of sides on the die
 * @returns Random number between 1 and sides (inclusive)
 * @example
 * rollDie(20) // Returns a number between 1 and 20 (d20)
 * rollDie(6)  // Returns a number between 1 and 6 (d6)
 */
export function rollDie(sides: number): number {
    return randomInt(1, sides);
}

/**
 * Capitalizes the first letter of a string
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 * @example
 * capitalize("hello") // Returns "Hello"
 * capitalize("WORLD") // Returns "WORLD"
 */
export function capitalize(str: string): string {
    if (str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a number as a percentage string
 * @param value - The value to format (0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 * @example
 * formatPercent(75)      // Returns "75%"
 * formatPercent(33.333, 1) // Returns "33.3%"
 */
export function formatPercent(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Checks if a value is within a range (inclusive)
 * @param value - The value to check
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if value is within range
 * @example
 * inRange(5, 1, 10)  // Returns true
 * inRange(15, 1, 10) // Returns false
 */
export function inRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}
