<script lang="ts">
  import type { GameSettings, CardPack } from '$lib/types';

  let {
    settings,
    isHost = true,
    onUpdateSettings,
    onStart,
    packs,
    canStart = false,
    startDisabledReason = ''
  }: {
    settings: GameSettings;
    isHost?: boolean;
    onUpdateSettings: (s: GameSettings) => void;
    onStart: () => void;
    packs: CardPack[];
    canStart?: boolean;
    startDisabledReason?: string;
  } = $props();

  function updateField<K extends keyof GameSettings>(field: K, value: GameSettings[K]) {
    onUpdateSettings({ ...settings, [field]: value });
  }

  function togglePack(packId: string) {
    const current = settings.enabledPacks;
    if (current.includes(packId)) {
      if (current.length > 1) {
        updateField('enabledPacks', current.filter((id) => id !== packId));
      }
    } else {
      updateField('enabledPacks', [...current, packId]);
    }
  }

  const totalCards = $derived(
    packs
      .filter((p) => settings.enabledPacks.includes(p.id))
      .reduce((sum, p) => sum + p.cards.length, 0)
  );
</script>

<div class="space-y-5" id="lobby-settings">
  <h2 class="text-2xl font-bold text-cave-text text-center">⚙️ Game Settings</h2>

  <div class="game-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <label for="timer-input" class="font-bold text-cave-text">⏱ Timer (seconds)</label>
      {#if isHost}
        <input
          id="timer-input"
          type="number"
          min="30"
          max="300"
          step="10"
          value={settings.timerSec}
          class="w-24 text-center"
          onchange={(e) => updateField('timerSec', parseInt(e.currentTarget.value) || 90)}
        />
      {:else}
        <span class="font-bold text-cave-brown">{settings.timerSec}s</span>
      {/if}
    </div>

    <div class="flex items-center justify-between">
      <label for="rounds-input" class="font-bold text-cave-text">🔄 Rounds</label>
      {#if isHost}
        <input
          id="rounds-input"
          type="number"
          min="1"
          max="10"
          value={settings.rounds}
          class="w-24 text-center"
          onchange={(e) => updateField('rounds', parseInt(e.currentTarget.value) || 3)}
        />
      {:else}
        <span class="font-bold text-cave-brown">{settings.rounds}</span>
      {/if}
    </div>

    <div class="flex items-center justify-between">
      <label for="points-easy-input" class="font-bold text-cave-text">✅ Points (Easy)</label>
      {#if isHost}
        <input
          id="points-easy-input"
          type="number"
          min="1"
          max="10"
          value={settings.pointsEasy}
          class="w-24 text-center"
          onchange={(e) => updateField('pointsEasy', parseInt(e.currentTarget.value) || 1)}
        />
      {:else}
        <span class="font-bold text-cave-brown">{settings.pointsEasy}</span>
      {/if}
    </div>

    <div class="flex items-center justify-between">
      <label for="points-hard-input" class="font-bold text-cave-text">⭐ Points (Hard)</label>
      {#if isHost}
        <input
          id="points-hard-input"
          type="number"
          min="1"
          max="10"
          value={settings.pointsHard}
          class="w-24 text-center"
          onchange={(e) => updateField('pointsHard', parseInt(e.currentTarget.value) || 3)}
        />
      {:else}
        <span class="font-bold text-cave-brown">{settings.pointsHard}</span>
      {/if}
    </div>

    <div class="flex items-center justify-between">
      <label for="bop-penalty-input" class="font-bold text-cave-text">🦴 Bop Penalty</label>
      {#if isHost}
        <input
          id="bop-penalty-input"
          type="number"
          min="0"
          max="10"
          value={settings.bopPenalty}
          class="w-24 text-center"
          onchange={(e) => updateField('bopPenalty', parseInt(e.currentTarget.value) || 0)}
        />
      {:else}
        <span class="font-bold text-cave-brown">{settings.bopPenalty}</span>
      {/if}
    </div>

    <div class="flex items-center justify-between">
      <label for="bopper-count-input" class="font-bold text-cave-text">👊 Boppers</label>
      {#if isHost}
        <input
          id="bopper-count-input"
          type="number"
          min="1"
          max="4"
          value={settings.bopperCount}
          class="w-24 text-center"
          onchange={(e) => updateField('bopperCount', parseInt(e.currentTarget.value) || 1)}
        />
      {:else}
        <span class="font-bold text-cave-brown">{settings.bopperCount}</span>
      {/if}
    </div>

    <div>
      <p class="font-bold text-cave-text mb-2">🎯 Bopper Assignment</p>
      {#if isHost}
        <div class="flex gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bopper-assignment"
              value="rotate"
              checked={settings.bopperAssignment === 'rotate'}
              onchange={() => updateField('bopperAssignment', 'rotate')}
              class="accent-cave-brown"
            />
            <span>Rotate</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bopper-assignment"
              value="manual"
              checked={settings.bopperAssignment === 'manual'}
              onchange={() => updateField('bopperAssignment', 'manual')}
              class="accent-cave-brown"
            />
            <span>Manual</span>
          </label>
        </div>
      {:else}
        <span class="font-bold text-cave-brown capitalize">{settings.bopperAssignment}</span>
      {/if}
    </div>
  </div>

  <div class="game-card p-5">
    <h3 class="text-lg font-bold text-cave-text mb-3">🃏 Card Packs</h3>
    <div class="space-y-2">
      {#each packs as pack}
        <label class="flex items-center gap-3 p-2 rounded-lg hover:bg-cave-bg transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabledPacks.includes(pack.id)}
            onchange={() => togglePack(pack.id)}
            disabled={!isHost}
            class="accent-cave-brown w-5 h-5"
          />
          <span class="flex-1 font-bold">{pack.name}</span>
          <span class="text-sm text-cave-muted">({pack.cards.length} cards)</span>
        </label>
      {/each}
    </div>
    <div class="mt-3 pt-3 border-t-2 border-cave-border text-center">
      <span class="font-bold text-cave-brown">{totalCards} total cards selected</span>
    </div>
  </div>

  {#if isHost}
    <button
      id="start-game-btn"
      class="btn btn-brown text-xl"
      onclick={onStart}
      disabled={!canStart}
    >
      🎮 Start Game
    </button>
    {#if !canStart && startDisabledReason}
      <p class="text-center text-sm text-bop-red font-bold">{startDisabledReason}</p>
    {/if}
  {/if}
</div>
