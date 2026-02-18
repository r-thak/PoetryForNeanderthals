import type { Card, GameSettings, Room, Turn, TurnCard, Player, Team } from '$lib/types';
import { createShuffledDeck } from '$lib/data/deck';


export type ServerRoom = Room & {
    timerInterval: ReturnType<typeof setInterval> | null;
    connections: Map<string, any>;
    lastActivity: number;
};

const rooms = new Map<string, ServerRoom>();


function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 100; attempt++) {
        let code = '';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        if (!rooms.has(code)) return code;
    }
    throw new Error('Could not generate unique room code');
}

export function createRoom(host: Player, settings: GameSettings, voiceEnabled: boolean): ServerRoom {
    const code = generateCode();
    const room: ServerRoom = {
        code,
        host: host.id,
        settings,
        phase: 'lobby',
        teams: [
            { name: 'Team 1', players: [host], score: 0 },
            { name: 'Team 2', players: [], score: 0 }
        ],
        deck: [],
        deckIndex: 0,
        round: 0,
        turn: null,
        voiceEnabled,
        timerInterval: null,
        connections: new Map(),
        lastActivity: Date.now()
    };
    rooms.set(code, room);
    return room;
}

export function joinRoom(
    code: string,
    player: Player,
    ws: any,
    maxVoice: number,
    maxNoVoice: number
): ServerRoom | string {
    const room = rooms.get(code.toUpperCase());
    if (!room) return 'Room not found';


    const existingInTeam = room.teams.some(t => t.players.some(p => p.id === player.id));
    if (existingInTeam) {

        room.connections.set(player.id, ws);
        room.lastActivity = Date.now();
        return room;
    }

    if (room.phase !== 'lobby') return 'Game already in progress';

    const cap = room.voiceEnabled ? maxVoice : maxNoVoice;
    const totalPlayers = room.teams[0].players.length + room.teams[1].players.length +
        [...room.connections.keys()].filter(id =>
            !room.teams[0].players.some(p => p.id === id) &&
            !room.teams[1].players.some(p => p.id === id)
        ).length;

    if (totalPlayers >= cap) return 'Room is full';

    room.connections.set(player.id, ws);
    room.lastActivity = Date.now();
    return room;
}

export function removePlayer(code: string, playerId: string): void {
    const room = rooms.get(code);
    if (!room) return;

    room.connections.delete(playerId);


    for (const team of room.teams) {
        team.players = team.players.filter(p => p.id !== playerId);
    }


    if (room.host === playerId) {
        const nextPlayer = room.connections.keys().next().value;
        if (nextPlayer) {
            room.host = nextPlayer;
        }
    }


    if (room.connections.size === 0) {
        room.lastActivity = Date.now();
    }


    if (room.phase === 'playing' && room.turn) {
        const activeTeam = room.teams[room.turn.teamIndex];
        const clueGiver = activeTeam.players[room.turn.clueGiverIndex];
        if (!clueGiver || clueGiver.id === playerId) {
            endTurn(room);
        }


        room.turn.boppers = room.turn.boppers.filter(id => id !== playerId);
    }
}

export function getRoom(code: string): ServerRoom | undefined {
    return rooms.get(code.toUpperCase());
}

export function getAllRooms(): Map<string, ServerRoom> {
    return rooms;
}

export function deleteRoom(code: string): void {
    const room = rooms.get(code);
    if (room?.timerInterval) {
        clearInterval(room.timerInterval);
    }
    rooms.delete(code);
}


export function serializeRoom(room: ServerRoom, forPlayerId?: string): Room {
    const isClueGiver = room.turn && room.phase === 'playing' &&
        room.teams[room.turn.teamIndex].players[room.turn.clueGiverIndex]?.id === forPlayerId;

    return {
        code: room.code,
        host: room.host,
        settings: room.settings,
        phase: room.phase,
        teams: room.teams,
        deck: [],
        deckIndex: room.deckIndex,
        round: room.round,
        turn: room.turn ? {
            ...room.turn,
            currentCard: isClueGiver ? room.turn.currentCard : { easy: '???', hard: '???' }
        } : null,
        voiceEnabled: room.voiceEnabled
    };
}


export function broadcastRoomState(room: ServerRoom): void {
    for (const [playerId, ws] of room.connections) {
        try {
            const serialized = serializeRoom(room, playerId);
            ws.send(JSON.stringify({ type: 'room_state', payload: serialized }));
        } catch { }
    }
}


export function broadcastMessage(room: ServerRoom, msg: object): void {
    const data = JSON.stringify(msg);
    for (const [, ws] of room.connections) {
        try {
            ws.send(data);
        } catch { }
    }
}



function drawCard(room: ServerRoom): Card {
    if (room.deckIndex >= room.deck.length) {
        room.deck = createShuffledDeck(room.settings.enabledPacks);
        room.deckIndex = 0;
        broadcastMessage(room, { type: 'deck_reshuffled' });
    }
    const card = room.deck[room.deckIndex];
    room.deckIndex++;
    return card;
}

export function startGame(room: ServerRoom): string | null {
    if (room.teams[0].players.length < 2) return 'Team 1 needs at least 2 players';
    if (room.teams[1].players.length < 2) return 'Team 2 needs at least 2 players';
    if (room.settings.enabledPacks.length === 0) return 'Select at least one card pack';

    room.deck = createShuffledDeck(room.settings.enabledPacks);
    room.deckIndex = 0;
    room.phase = 'playing';
    room.round = 1;
    room.teams[0].score = 0;
    room.teams[1].score = 0;

    startTurn(room, 0);
    return null;
}

let turnCounter = 0;

function startTurn(room: ServerRoom, turnNumber: number): void {
    const teamIndex = turnNumber % 2;
    const team = room.teams[teamIndex];
    const clueGiverIndex = Math.floor(turnNumber / 2) % team.players.length;


    const opposingTeam = room.teams[1 - teamIndex];
    const boppers: string[] = [];
    if (room.settings.bopperAssignment === 'rotate') {
        const count = Math.min(room.settings.bopperCount, opposingTeam.players.length);
        const startIdx = Math.floor(turnNumber / 2) % opposingTeam.players.length;
        for (let i = 0; i < count; i++) {
            const idx = (startIdx + i) % opposingTeam.players.length;
            boppers.push(opposingTeam.players[idx].id);
        }
    }

    const card = drawCard(room);

    room.turn = {
        teamIndex,
        clueGiverIndex,
        boppers,
        timeRemaining: room.settings.timerSec,
        cards: [],
        currentCard: card
    };

    room.phase = 'playing';
    turnCounter = turnNumber;


    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
        if (!room.turn) return;
        room.turn.timeRemaining--;
        broadcastMessage(room, { type: 'tick', payload: { timeRemaining: room.turn.timeRemaining } });
        if (room.turn.timeRemaining <= 0) {
            endTurn(room);
            broadcastMessage(room, { type: 'turn_end', payload: { turnCards: room.turn?.cards || [] } });
            broadcastRoomState(room);
        }
    }, 1000);
}

export function handleGotIt(room: ServerRoom, difficulty: 'easy' | 'hard'): void {
    if (!room.turn) return;
    const points = difficulty === 'easy' ? room.settings.pointsEasy : room.settings.pointsHard;
    const turnCard: TurnCard = { card: room.turn.currentCard, result: difficulty };
    room.turn.cards.push(turnCard);
    room.teams[room.turn.teamIndex].score += points;
    room.turn.currentCard = drawCard(room);
}

export function handleSkip(room: ServerRoom): void {
    if (!room.turn) return;
    const turnCard: TurnCard = { card: room.turn.currentCard, result: 'skip' };
    room.turn.cards.push(turnCard);
    room.turn.currentCard = drawCard(room);
}

export function handleBop(room: ServerRoom): void {
    if (!room.turn) return;
    const turnCard: TurnCard = { card: room.turn.currentCard, result: 'bop' };
    room.turn.cards.push(turnCard);
    room.teams[room.turn.teamIndex].score -= room.settings.bopPenalty;
    room.turn.currentCard = drawCard(room);
}

export function endTurn(room: ServerRoom): void {
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
    }
    room.phase = 'turn_review';
}

export function advanceTurn(room: ServerRoom): void {
    const nextTurnNumber = turnCounter + 1;


    if (nextTurnNumber % 2 === 0) {
        room.round++;
    }

    if (nextTurnNumber % 2 === 0 && room.round > room.settings.rounds) {
        room.phase = 'game_over';
        room.turn = null;
        return;
    }

    startTurn(room, nextTurnNumber);
}


setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
        if (room.connections.size === 0 && now - room.lastActivity > 5 * 60 * 1000) {
            deleteRoom(code);
        }
    }
}, 60 * 1000);
