/**
 * Effects content subpath.
 *
 * The engine's bundled effect library — buffs and debuffs registered
 * for lookup by id, name, or type. Consumers that want to ship their
 * own effect data can ignore this subpath and feed their own data into
 * the effects engine.
 */
export {
    lookupEffect,
    getEffectByName,
    getEffectsByType,
    effectsLibrary,
} from '../../effects/effects.library';
