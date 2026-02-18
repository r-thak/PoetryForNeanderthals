<script lang="ts">
  import { audioSettings } from '$lib/stores/audioSettings';
  import { toggleMute, onPeerStatusChange, type PeerStatus } from '$lib/voice/mesh';
  import { updateAllGains } from '$lib/voice/audio';
  import type { Player } from '$lib/types';

  let {
    players = [],
    clueGiverId = null
  }: {
    players?: Player[];
    clueGiverId?: string | null;
  } = $props();

  let isOpen = $state(false);
  let isMuted = $state(false);
  let peerStatuses = $state<Map<string, PeerStatus>>(new Map());

  onPeerStatusChange((statuses) => {
    peerStatuses = statuses;
  });

  function handleToggleMute() {
    isMuted = !isMuted;
    toggleMute(isMuted);
  }

  function handleMasterVolumeChange(value: number) {
    audioSettings.update((s) => ({ ...s, masterVolume: value }));
    updateAllGains(clueGiverId, $audioSettings);
  }

  function handleSpeakerBoostChange(value: number) {
    audioSettings.update((s) => ({ ...s, speakerBoost: value }));
    updateAllGains(clueGiverId, $audioSettings);
  }

  function handlePlayerVolumeChange(playerId: string, value: number) {
    audioSettings.update((s) => {
      const newMap = new Map(s.perPlayerVolume);
      newMap.set(playerId, value);
      return { ...s, perPlayerVolume: newMap };
    });
    updateAllGains(clueGiverId, $audioSettings);
  }

  function handlePlayerMuteToggle(playerId: string) {
    const current = $audioSettings.perPlayerVolume.get(playerId) ?? 1.0;
    const newVal = current === 0 ? 1.0 : 0;
    handlePlayerVolumeChange(playerId, newVal);
  }

  function getStatusColor(playerId: string): string {
    const status = peerStatuses.get(playerId);
    switch (status) {
      case 'connected': return 'bg-correct-green';
      case 'connecting': return 'bg-yellow-400';
      case 'failed': return 'bg-bop-red';
      default: return 'bg-cave-muted';
    }
  }

  function getStatusLabel(playerId: string): string {
    const status = peerStatuses.get(playerId);
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'failed': return 'Failed — try an external voice app';
      default: return 'Unknown';
    }
  }
</script>

<button
  class="fixed bottom-4 left-4 z-40 w-14 h-14 rounded-full flex items-center justify-center
         shadow-lg cursor-pointer transition-all duration-200 hover:scale-110
         {isMuted ? 'bg-bop-red text-white' : 'bg-cave-brown text-white'}"
  onclick={() => { isOpen = !isOpen; }}
  id="voice-panel-toggle"
  aria-label="Toggle voice panel"
>
  <span class="text-2xl">{isMuted ? '🔇' : '🎤'}</span>
</button>

{#if isOpen}
  <button
    class="fixed inset-0 bg-black/30 z-40 cursor-default"
    onclick={() => { isOpen = false; }}
    aria-label="Close voice panel"
  ></button>

  <!-- Panel (slides down from top) -->
  <div class="fixed top-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto bg-cave-surface shadow-xl rounded-b-2xl p-5 animate-slide-up" id="voice-panel">
    <div class="container">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-cave-brown">🎤 Voice Chat</h2>
        <button
          class="text-cave-muted hover:text-cave-text text-2xl cursor-pointer"
          onclick={() => { isOpen = false; }}
        >×</button>
      </div>

      <button
        class="btn {isMuted ? 'btn-red' : 'btn-green'} mb-4"
        onclick={handleToggleMute}
        id="mute-toggle"
      >
        {isMuted ? '🔇 Unmute Microphone' : '🎤 Mute Microphone'}
      </button>

      <div class="mb-4">
        <label for="master-volume" class="block font-bold text-sm text-cave-muted mb-1">
          Master Volume ({Math.round($audioSettings.masterVolume * 100)}%)
        </label>
        <input
          id="master-volume"
          type="range"
          min="0"
          max="2"
          step="0.05"
          value={$audioSettings.masterVolume}
          oninput={(e) => handleMasterVolumeChange(parseFloat(e.currentTarget.value))}
          class="w-full accent-cave-brown"
        />
      </div>

      <div class="mb-4">
        <label for="speaker-boost" class="block font-bold text-sm text-cave-muted mb-1">
          📣 Clue-giver Volume Boost ({$audioSettings.speakerBoost.toFixed(1)}×)
        </label>
        <input
          id="speaker-boost"
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={$audioSettings.speakerBoost}
          oninput={(e) => handleSpeakerBoostChange(parseFloat(e.currentTarget.value))}
          class="w-full accent-cave-brown"
        />
      </div>

      {#if players.length > 0}
        <h3 class="font-bold text-cave-text mb-2">Players</h3>
        <div class="space-y-3">
          {#each players as player}
            <div class="p-3 bg-cave-bg rounded-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-3 h-3 rounded-full {getStatusColor(player.id)}"></span>
                <span class="flex-1 font-bold text-cave-text">{player.name}</span>
                <button
                  class="text-sm px-3 py-1 rounded-lg cursor-pointer
                    {($audioSettings.perPlayerVolume.get(player.id) ?? 1.0) === 0
                      ? 'bg-bop-red/10 text-bop-red'
                      : 'bg-cave-border text-cave-muted'}"
                  onclick={() => handlePlayerMuteToggle(player.id)}
                >
                  {($audioSettings.perPlayerVolume.get(player.id) ?? 1.0) === 0 ? '🔇' : '🔊'}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={$audioSettings.perPlayerVolume.get(player.id) ?? 1.0}
                oninput={(e) => handlePlayerVolumeChange(player.id, parseFloat(e.currentTarget.value))}
                class="w-full accent-cave-brown"
              />
              <p class="text-xs text-cave-muted mt-1">{getStatusLabel(player.id)}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}