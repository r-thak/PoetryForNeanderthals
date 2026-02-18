import type { GameSettings, Player } from '$lib/types';
import { MAX_PLAYERS_VOICE, MAX_PLAYERS_NO_VOICE, DEFAULT_SETTINGS } from '$lib/constants';
import {
    createRoom,
    joinRoom,
    removePlayer,
    getRoom,
    serializeRoom,
    broadcastRoomState,
    startGame,
    handleGotIt,
    handleSkip,
    handleBop,
    endTurn,
    advanceTurn,
    type ServerRoom
} from './rooms';
import { handleSignal } from './signaling';

type WsData = {
    playerId: string | null;
    roomCode: string | null;
};

function sendError(ws: any, message: string) {
    ws.send(JSON.stringify({ type: 'error', payload: { message } }));
}

function sendRoomState(ws: any, room: ServerRoom, playerId: string) {
    ws.send(JSON.stringify({
        type: 'room_state',
        payload: serializeRoom(room, playerId)
    }));
}

export function handleOpen(ws: any) {

}

export function handleClose(ws: any) {
    const data = ws.data as WsData;
    if (data.roomCode && data.playerId) {
        const room = getRoom(data.roomCode);
        if (room) {

            room.connections.delete(data.playerId);


            if (room.host === data.playerId) {
                setTimeout(() => {
                    const currentRoom = getRoom(data.roomCode!);
                    if (currentRoom && !currentRoom.connections.has(data.playerId!)) {

                        const nextPlayer = currentRoom.connections.keys().next().value;
                        if (nextPlayer) {
                            currentRoom.host = nextPlayer;
                            broadcastRoomState(currentRoom);
                        } else {

                        }
                    }
                }, 30000);
            }


            if (room.phase === 'playing' && room.turn) {
                const activeTeam = room.teams[room.turn.teamIndex];
                const clueGiver = activeTeam.players[room.turn.clueGiverIndex];
                if (clueGiver && clueGiver.id === data.playerId) {
                    endTurn(room);
                    broadcastRoomState(room);
                }
            }
        }
    }
}

export function handleMessage(ws: any, message: string) {
    let parsed: { type: string; payload: any };
    try {
        parsed = JSON.parse(message);
    } catch {
        sendError(ws, 'Invalid JSON');
        return;
    }

    const { type, payload } = parsed;
    const data = ws.data as WsData;

    switch (type) {
        case 'create_room': {
            const { playerName, settings, voiceEnabled } = payload;
            const playerId = payload.playerId || crypto.randomUUID();
            const player: Player = { id: playerId, name: playerName };
            const room = createRoom(player, settings || DEFAULT_SETTINGS, voiceEnabled || false);
            room.connections.set(playerId, ws);
            data.playerId = playerId;
            data.roomCode = room.code;
            sendRoomState(ws, room, playerId);
            break;
        }

        case 'join_room': {
            const { code, playerName, playerId: existingId } = payload;
            const playerId = existingId || crypto.randomUUID();
            const player: Player = { id: playerId, name: playerName };

            const result = joinRoom(code, player, ws, MAX_PLAYERS_VOICE, MAX_PLAYERS_NO_VOICE);
            if (typeof result === 'string') {
                sendError(ws, result);
                return;
            }

            data.playerId = playerId;
            data.roomCode = result.code;
            broadcastRoomState(result);
            break;
        }

        case 'update_settings': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room) return;
            if (room.host !== data.playerId) {
                sendError(ws, 'Only the host can update settings');
                return;
            }
            room.settings = payload.settings;
            room.lastActivity = Date.now();
            broadcastRoomState(room);
            break;
        }

        case 'toggle_voice': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room) return;
            if (room.host !== data.playerId) {
                sendError(ws, 'Only the host can toggle voice');
                return;
            }
            if (payload.enabled && room.connections.size > MAX_PLAYERS_VOICE) {
                sendError(ws, `Cannot enable voice with more than ${MAX_PLAYERS_VOICE} players`);
                return;
            }
            room.voiceEnabled = payload.enabled;
            room.lastActivity = Date.now();
            broadcastRoomState(room);
            break;
        }

        case 'join_team': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room) return;

            const { teamIndex } = payload;
            if (teamIndex !== 0 && teamIndex !== 1) return;


            for (const team of room.teams) {
                team.players = team.players.filter(p => p.id !== data.playerId);
            }


            const playerName = payload.playerName || 'Player';

            let name = playerName;
            room.teams[teamIndex].players.push({ id: data.playerId, name });
            room.lastActivity = Date.now();
            broadcastRoomState(room);
            break;
        }

        case 'start_game': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room) return;
            if (room.host !== data.playerId) {
                sendError(ws, 'Only the host can start the game');
                return;
            }
            const error = startGame(room);
            if (error) {
                sendError(ws, error);
                return;
            }
            broadcastRoomState(room);
            break;
        }

        case 'got_it': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room || !room.turn || room.phase !== 'playing') return;


            const activeTeam = room.teams[room.turn.teamIndex];
            const clueGiver = activeTeam.players[room.turn.clueGiverIndex];
            if (!clueGiver || clueGiver.id !== data.playerId) {
                sendError(ws, 'Only the clue-giver can mark answers');
                return;
            }

            handleGotIt(room, payload.difficulty);
            room.lastActivity = Date.now();
            broadcastRoomState(room);
            break;
        }

        case 'skip': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room || !room.turn || room.phase !== 'playing') return;

            const activeTeam2 = room.teams[room.turn.teamIndex];
            const clueGiver2 = activeTeam2.players[room.turn.clueGiverIndex];
            if (!clueGiver2 || clueGiver2.id !== data.playerId) {
                sendError(ws, 'Only the clue-giver can skip');
                return;
            }

            handleSkip(room);
            room.lastActivity = Date.now();
            broadcastRoomState(room);
            break;
        }

        case 'bop': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room || !room.turn || room.phase !== 'playing') return;


            if (!room.turn.boppers.includes(data.playerId)) {
                sendError(ws, 'Only designated boppers can bop');
                return;
            }

            handleBop(room);
            room.lastActivity = Date.now();
            broadcastRoomState(room);
            break;
        }

        case 'next_turn': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room) return;
            if (room.host !== data.playerId) {
                sendError(ws, 'Only the host can advance turns');
                return;
            }
            advanceTurn(room);
            broadcastRoomState(room);
            break;
        }

        case 'signal': {
            if (!data.roomCode || !data.playerId) return;
            const room = getRoom(data.roomCode);
            if (!room) return;
            handleSignal(room, data.playerId, payload.targetId, payload.signal);
            break;
        }

        default:
            sendError(ws, `Unknown message type: ${type}`);
    }
}
