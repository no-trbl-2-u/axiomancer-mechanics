/**
 * Axiomancer Mechanics
 * Turn-based RPG combat mechanics with philosophical themes
 */

export function greet(name: string): string {
    return `Hello, ${name}! Welcome to Axiomancer Mechanics.`;
}

// Example usage
if (require.main === module) {
    console.log(greet("Axiomancer"));
}
