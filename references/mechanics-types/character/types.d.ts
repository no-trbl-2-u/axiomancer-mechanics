/**
 * Character System Types
 * Core types for character stats, progression, and attributes
 */

/**
 * Base stats representing the three core attributes
 * Heart: Emotion, willpower, charisma
 * Body: Physical strength, constitution
 * Mind: Intelligence, reflexes, perception
 */
export interface BaseStats {
  heart: number;
  body: number;
  mind: number;
}

/**
 * Derived stats calculated from base stats
 * Used in combat and skill checks
 */
export interface DerivedStats {
  // Body-derived
  physicalAttack: number;
  physicalDefense: number;
  constitutionSave: number;

  // Mind-derived
  mindAttack: number;
  mindDefense: number;
  reflexSave: number;
  perception: number;

  // Heart-derived
  ailmentAttack: number;
  ailmentDefense: number;
  willSave: number;

  // Shared
  evasion: number;
  accuracy: number;
  luck: number;
}

/**
 * Character entity with stats and progression
 */
export interface Character {
  id: string;
  name: string;
  level: number;
  experience: number;
  experienceToNextLevel: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  baseStats: BaseStats;
  derivedStats: DerivedStats;
  availableStatPoints: number;
}
