/**
 * Quest Board minigame — tuning constants.
 *
 * One file so the balance loop has a single dial panel. Targets
 * (decided 2026-06-12): one full play of `build-the-boat` lands in
 * 5–10 minutes — roughly 3 laps of a 16-space loop, ~14 rolls,
 * ~5 in-game days. The quest cannot be failed; these dials shape how
 * EXPENSIVE a sloppy run feels and where the outcome tiers cut.
 */

export const QUEST_BOARD_TUNING = Object.freeze({
    /** Bone-die rolls per in-game day. Dusk falls after the last. */
    stretchesPerDay: 3,
    /** Vigor restored by supper at dusk (capped at max). */
    duskVigor: 2,
    /** Fraction of max vigor restored after a collapse (floor'd). */
    collapseRecoverFraction: 0.5,
    /** Charms rolled into the satchel at session start. */
    charmsDealt: 2,
    /** Vows rolled at session start. */
    vowsDealt: 2,
    /** Tier cuts — see `questBoardTierOf`. */
    masterworkMaxDays: 4,
    masterworkMinVows: 2,
    seaworthyMaxDays: 7,
    seaworthyMinVows: 1,
    /** Vow dials. */
    swiftKeelDay: 4,
    unbittenFloor: 3,
    fedLarderFish: 4,
    gullsBaneWins: 2,
    taleCollectorCount: 2,
});

export const QUEST_STRETCHES_PER_DAY = QUEST_BOARD_TUNING.stretchesPerDay;
export const QUEST_CHARMS_DEALT = QUEST_BOARD_TUNING.charmsDealt;
export const QUEST_VOWS_DEALT = QUEST_BOARD_TUNING.vowsDealt;
