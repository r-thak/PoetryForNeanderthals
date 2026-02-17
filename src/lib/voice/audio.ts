import type { LocalAudioSettings } from '$lib/types';

let audioContext: AudioContext | null = null;
const gainNodes = new Map<string, GainNode>();
const sources = new Map<string, MediaStreamAudioSourceNode>();

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

export function routeRemoteStream(playerId: string, stream: MediaStream): void {
    const ctx = getAudioContext();

    if (sources.has(playerId)) {
        sources.get(playerId)!.disconnect();
    }
    if (gainNodes.has(playerId)) {
        gainNodes.get(playerId)!.disconnect();
    }

    const source = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();

    source.connect(gain);
    gain.connect(ctx.destination);

    sources.set(playerId, source);
    gainNodes.set(playerId, gain);
}

export function updateGain(
    playerId: string,
    clueGiverId: string | null,
    settings: LocalAudioSettings
): void {
    const gain = gainNodes.get(playerId);
    if (!gain) return;

    const perPlayer = settings.perPlayerVolume.get(playerId) ?? 1.0;
    const boost = playerId === clueGiverId ? settings.speakerBoost : 1.0;
    const effectiveGain = perPlayer * boost * settings.masterVolume;

    gain.gain.value = effectiveGain;
}

export function updateAllGains(
    clueGiverId: string | null,
    settings: LocalAudioSettings
): void {
    for (const playerId of gainNodes.keys()) {
        updateGain(playerId, clueGiverId, settings);
    }
}

export function removePlayerAudio(playerId: string): void {
    if (sources.has(playerId)) {
        sources.get(playerId)!.disconnect();
        sources.delete(playerId);
    }
    if (gainNodes.has(playerId)) {
        gainNodes.get(playerId)!.disconnect();
        gainNodes.delete(playerId);
    }
}

export function cleanup(): void {
    for (const [id] of sources) {
        removePlayerAudio(id);
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
}
