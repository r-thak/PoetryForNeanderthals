import { writable } from 'svelte/store';
import type { LocalAudioSettings } from '$lib/types';

function loadFromLocalStorage(): LocalAudioSettings {
    if (typeof localStorage === 'undefined') {
        return {
            masterVolume: 1.0,
            speakerBoost: 1.5,
            perPlayerVolume: new Map()
        };
    }
    try {
        const stored = localStorage.getItem('p4n_audioSettings');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                masterVolume: parsed.masterVolume ?? 1.0,
                speakerBoost: parsed.speakerBoost ?? 1.5,
                perPlayerVolume: new Map(Object.entries(parsed.perPlayerVolume || {}))
            };
        }
    } catch { }
    return {
        masterVolume: 1.0,
        speakerBoost: 1.5,
        perPlayerVolume: new Map()
    };
}

function saveToLocalStorage(settings: LocalAudioSettings) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem('p4n_audioSettings', JSON.stringify({
            masterVolume: settings.masterVolume,
            speakerBoost: settings.speakerBoost,
            perPlayerVolume: Object.fromEntries(settings.perPlayerVolume)
        }));
    } catch { }
}

function createAudioSettingsStore() {
    const initial = loadFromLocalStorage();
    const { subscribe, set, update } = writable<LocalAudioSettings>(initial);

    return {
        subscribe,
        set(value: LocalAudioSettings) {
            set(value);
            saveToLocalStorage(value);
        },
        update(fn: (s: LocalAudioSettings) => LocalAudioSettings) {
            update((s) => {
                const updated = fn(s);
                saveToLocalStorage(updated);
                return updated;
            });
        }
    };
}

export const audioSettings = createAudioSettingsStore();
