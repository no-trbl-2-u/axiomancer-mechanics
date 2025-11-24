import { Enemy } from '../Enemy/types'

export type MapEvents = 'encounter' | 'event' | 'treasure' | 'quest' | 'npc' | 'other';
export type Reward = 'experience' | 'item' | 'money' | 'equipment' | 'skill' | 'other';

export interface MapEvent {
    name: MapEvents;
    description: string;
    enemy: Enemy;
    reward?: Reward;
}

export interface Map {
    name: string;
    description: string;
    numberOfNodes: number;
    enemies: Enemy[]; // TODO: Make mandatory once implemented
    // events?: MapEvent[]; // TODO: Make mandatory once implemented
    // npcs?: NPC[]; // TODO: Make mandatory once implemented
    // images: { mapImage: {alt: string, src: string }, combatImage: {alt: string, src: string } }
}