import { writable, get } from 'svelte/store';
import { roomState, setPlayerId } from '$lib/stores/roomState';

export const connected = writable(false);

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let messageCallbacks: ((msg: { type: string; payload: any }) => void)[] = [];

function getWsUrl(): string {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
}

export function connect(): void {
    if (typeof window === 'undefined') return;
    if (ws && ws.readyState === WebSocket.OPEN) return;

    ws = new WebSocket(getWsUrl());

    ws.onopen = () => {
        connected.set(true);
        reconnectDelay = 1000;
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
                case 'room_state':
                    roomState.set(msg.payload);
                    break;
                case 'tick':
                    roomState.update((s) => {
                        if (!s || !s.turn) return s;
                        return {
                            ...s,
                            turn: { ...s.turn, timeRemaining: msg.payload.timeRemaining }
                        };
                    });
                    break;
                case 'error':
                    console.error('Server error:', msg.payload.message);
                    break;
            }

            for (const cb of messageCallbacks) {
                cb(msg);
            }
        } catch { }
    };

    ws.onclose = () => {
        connected.set(false);
        scheduleReconnect();
    };

    ws.onerror = () => {
        connected.set(false);
    };
}

function scheduleReconnect(): void {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 10000);
        connect();
        const playerId = getStoredPlayerId();
        const roomCode = getStoredRoomCode();
        const playerName = getStoredPlayerName();
        if (playerId && roomCode && playerName) { // reconnect if we have stored info
            setTimeout(() => {
                send('join_room', {
                    code: roomCode,
                    playerName,
                    playerId
                });
            }, 500);
        }
    }, reconnectDelay);
}

export function send(type: string, payload: object): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    }
}

export function onMessage(cb: (msg: { type: string; payload: any }) => void): () => void {
    messageCallbacks.push(cb);
    return () => {
        messageCallbacks = messageCallbacks.filter((c) => c !== cb);
    };
}

export function disconnect(): void {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.onclose = null;
        ws.close();
        ws = null;
    }
    connected.set(false);
}

// session storage helpers

export function getStoredPlayerId(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem('p4n_playerId');
}

export function storePlayerId(id: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem('p4n_playerId', id);
}

export function getStoredRoomCode(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem('p4n_roomCode');
}

export function storeRoomCode(code: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem('p4n_roomCode', code);
}

export function getStoredPlayerName(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem('p4n_playerName');
}

export function storePlayerName(name: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem('p4n_playerName', name);
}