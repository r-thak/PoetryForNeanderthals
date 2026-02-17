import { writable, derived } from 'svelte/store';
import type { Room, Player } from '$lib/types';

export const roomState = writable<Room | null>(null);

let localPlayerId: string | null = null;

export function setPlayerId(id: string) {
    localPlayerId = id;
}

export function getPlayerId(): string | null {
    return localPlayerId;
}

export const myPlayer = derived(roomState, ($room): Player | null => {
    if (!$room || !localPlayerId) return null;
    for (const team of $room.teams) {
        const found = team.players.find((p) => p.id === localPlayerId);
        if (found) return found;
    }
    return null;
});

export const myTeamIndex = derived(roomState, ($room): number | null => {
    if (!$room || !localPlayerId) return null;
    for (let i = 0; i < $room.teams.length; i++) {
        if ($room.teams[i].players.some((p) => p.id === localPlayerId)) return i;
    }
    return null;
});

export const isHost = derived(roomState, ($room): boolean => {
    if (!$room || !localPlayerId) return false;
    return $room.host === localPlayerId;
});

export const isClueGiver = derived(roomState, ($room): boolean => {
    if (!$room || !$room.turn || !localPlayerId) return false;
    const team = $room.teams[$room.turn.teamIndex];
    const clueGiver = team.players[$room.turn.clueGiverIndex];
    return clueGiver?.id === localPlayerId;
});

export const isBopper = derived(roomState, ($room): boolean => {
    if (!$room || !$room.turn || !localPlayerId) return false;
    return $room.turn.boppers.includes(localPlayerId);
});

export const myRole = derived(
    [roomState, isClueGiver, isBopper, myTeamIndex],
    ([$room, $isClueGiver, $isBopper, $myTeamIndex]): 'clue_giver' | 'bopper' | 'teammate' | 'spectator' => {
        if (!$room) return 'spectator';
        if ($isClueGiver) return 'clue_giver';
        if ($isBopper) return 'bopper';
        if ($myTeamIndex !== null) return 'teammate';
        return 'spectator';
    }
);
