import type { Card, CardPack } from '$lib/types';
import baseGray from './base_game_gray.json';
import baseRed from './base_game_red.json';
import expansionGray from './more_cards_box_1_expansion_pack_gray.json';
import expansionRed from './more_cards_box_1_expansion_pack_red.json';

type RawPack = { game_data: { '1': string; '3': string }[] };

function parsePack(id: string, name: string, raw: RawPack): CardPack {
    return {
        id,
        name,
        cards: raw.game_data.map((entry) => ({
            easy: entry['1'],
            hard: entry['3']
        }))
    };
}

export const packs: CardPack[] = [
    parsePack('base_gray', 'Base Game (Gray)', baseGray as RawPack),
    parsePack('base_red', 'Base Game (Red)', baseRed as RawPack),
    parsePack('expansion_gray', 'Expansion Pack (Gray)', expansionGray as RawPack),
    parsePack('expansion_red', 'Expansion Pack (Red)', expansionRed as RawPack)
];

export const allPackIds: string[] = packs.map((p) => p.id);

function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function createShuffledDeck(enabledPackIds: string[]): Card[] {
    const merged: Card[] = [];
    for (const pack of packs) {
        if (enabledPackIds.includes(pack.id)) {
            merged.push(...pack.cards);
        }
    }

    const seen = new Set<string>();
    const deduped: Card[] = [];
    for (const card of merged) {
        const key = `${card.easy.trim().toLowerCase()}|${card.hard.trim().toLowerCase()}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(card);
        }
    }

    return shuffle(deduped);
}
