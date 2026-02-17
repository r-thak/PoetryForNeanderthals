import type { GameSettings } from '$lib/types';
import { allPackIds } from '$lib/data/deck';

export const MAX_PLAYERS_VOICE = 8;
export const MAX_PLAYERS_NO_VOICE = 12;

export const DEFAULT_SETTINGS: GameSettings = {
    timerSec: 90,
    rounds: 3,
    pointsEasy: 1,
    pointsHard: 3,
    bopPenalty: 1,
    bopperCount: 1,
    bopperAssignment: 'rotate',
    enabledPacks: [...allPackIds]
};