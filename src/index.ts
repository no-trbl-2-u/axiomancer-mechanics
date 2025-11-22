/**
 * Axiomancer Mechanics - Main Export
 * 
 * This is the main entry point for the axiomancer-mechanics package.
 * It re-exports all modules for convenient consumption.
 * 
 * Usage:
 *   import { Character, Enemy, Combat } from 'axiomancer-mechanics';
 *   // or
 *   import { Character } from 'axiomancer-mechanics/Character';
 */

// Re-export all modules
export * from './Character';
export * from './NPCs';
export * from './Enemy';
export * from './Combat';
export * from './Equipment';
export * from './Skills';
export * from './Effects';

// TODO: Add exports as modules grow
