import type { ServerRoom } from './rooms';

export function handleSignal(
    room: ServerRoom,
    fromId: string,
    targetId: string,
    signal: any
): void {
    const targetWs = room.connections.get(targetId);
    if (targetWs) {
        try {
            targetWs.send(JSON.stringify({
                type: 'signal',
                payload: { fromId, signal }
            }));
        } catch { }
    }
}
