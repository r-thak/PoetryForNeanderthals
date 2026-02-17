import { iceConfig } from './ice';
import { routeRemoteStream, removePlayerAudio, cleanup as cleanupAudio } from './audio';
import { send, onMessage } from '$lib/ws/client';
import { getPlayerId } from '$lib/stores/roomState';

const peers = new Map<string, RTCPeerConnection>();
let localStream: MediaStream | null = null;
let unsubMessage: (() => void) | null = null;

export type PeerStatus = 'connecting' | 'connected' | 'failed';
const peerStatuses = new Map<string, PeerStatus>();
let statusCallback: ((statuses: Map<string, PeerStatus>) => void) | null = null;

export function onPeerStatusChange(cb: (statuses: Map<string, PeerStatus>) => void) {
    statusCallback = cb;
}

function updatePeerStatus(peerId: string, status: PeerStatus) {
    peerStatuses.set(peerId, status);
    statusCallback?.(new Map(peerStatuses));
}

export async function initVoice(playerIds: string[]): Promise<boolean> {
    const myId = getPlayerId();
    if (!myId) return false;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
        return false;
    }

    // signaling
    unsubMessage = onMessage((msg) => {
        if (msg.type === 'signal') {
            handleSignal(msg.payload.fromId, msg.payload.signal);
        }
    });

    // connecting
    for (const pid of playerIds) {
        if (pid === myId) continue;
        if (myId < pid) {
            await createOffer(pid);
        }
    }

    return true;
}

async function createPeerConnection(remoteId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(iceConfig);
    peers.set(remoteId, pc);
    updatePeerStatus(remoteId, 'connecting');

    if (localStream) {
        for (const track of localStream.getTracks()) {
            pc.addTrack(track, localStream);
        }
    }

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            send('signal', {
                targetId: remoteId,
                signal: { type: 'ice-candidate', candidate: event.candidate }
            });
        }
    };

    pc.ontrack = (event) => {
        if (event.streams[0]) {
            routeRemoteStream(remoteId, event.streams[0]);
        }
    };

    pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
            case 'connected':
                updatePeerStatus(remoteId, 'connected');
                break;
            case 'failed':
                updatePeerStatus(remoteId, 'failed');
                break;
            case 'disconnected':
                updatePeerStatus(remoteId, 'connecting');
                break;
        }
    };

    return pc;
}

async function createOffer(remoteId: string): Promise<void> {
    const pc = await createPeerConnection(remoteId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    send('signal', {
        targetId: remoteId,
        signal: { type: 'offer', sdp: offer.sdp }
    });
}

async function handleSignal(fromId: string, signal: any): Promise<void> {
    if (signal.type === 'offer') {
        const pc = await createPeerConnection(fromId);
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        send('signal', {
            targetId: fromId,
            signal: { type: 'answer', sdp: answer.sdp }
        });
    } else if (signal.type === 'answer') {
        const pc = peers.get(fromId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
        }
    } else if (signal.type === 'ice-candidate') {
        const pc = peers.get(fromId);
        if (pc && signal.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }
}

export function addPeer(peerId: string): void {
    const myId = getPlayerId();
    if (!myId || peerId === myId) return;

    if (myId < peerId) {
        createOffer(peerId);
    }
}

export function removePeer(peerId: string): void {
    const pc = peers.get(peerId);
    if (pc) {
        pc.close();
        peers.delete(peerId);
    }
    peerStatuses.delete(peerId);
    removePlayerAudio(peerId);
    statusCallback?.(new Map(peerStatuses));
}

export function toggleMute(muted: boolean): void {
    if (localStream) {
        for (const track of localStream.getAudioTracks()) {
            track.enabled = !muted;
        }
    }
}

export function cleanup(): void {
    for (const [id, pc] of peers) {
        pc.close();
    }
    peers.clear();
    peerStatuses.clear();

    if (localStream) {
        for (const track of localStream.getTracks()) {
            track.stop();
        }
        localStream = null;
    }

    if (unsubMessage) {
        unsubMessage();
        unsubMessage = null;
    }

    cleanupAudio();
}