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

{#snippet numberSetting(
  label: string,
  field: keyof GameSettings,
  value: number,
  min: number,
  max: number,
  step: number = 1,
  suffix: string = ''
)}
  <div class="flex items-center justify-between">
    <span class="font-bold text-cave-text whitespace-nowrap">{label}</span>
    {#if isHost}
      <div class="flex items-center gap-2">
        <button
          class="w-10 h-10 flex items-center justify-center rounded-lg bg-cave-bg border-none hover:bg-cave-border/30 text-cave-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          disabled={value <= min}
          onclick={() => updateField(field, Math.max(min, value - step))}
          aria-label="Decrease {label}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        
        <div class="w-20 flex items-center justify-center relative group">
          <input
            type="number"
            {min}
            {max}
            value={value}
            class="w-full text-center font-bold text-xl text-cave-brown bg-transparent outline-none p-0 !border-none focus:ring-0 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text selection:bg-cave-brown/20"
            onchange={(e) => {
              const val = parseInt(e.currentTarget.value);
              if (!isNaN(val)) {
                updateField(field, Math.max(min, Math.min(max, val)));
              } else {
                e.currentTarget.value = value.toString();
              }
            }}
          />
          {#if suffix}
            <span class="font-bold text-xl text-cave-brown absolute right-0 pointer-events-none opacity-50">{suffix}</span>
          {/if}
        </div>

        <button
          class="w-10 h-10 flex items-center justify-center rounded-lg bg-cave-bg border-none hover:bg-cave-border/30 text-cave-brown transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          disabled={value >= max}
          onclick={() => updateField(field, Math.min(max, value + step))}
          aria-label="Increase {label}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    {:else}
      <span class="font-bold text-cave-brown">{value}{suffix}</span>
    {/if}
  </div>
{/snippet}

<div class="space-y-5" id="lobby-settings">
  <h2 class="text-2xl font-bold text-cave-text text-center">Game Settings</h2>

  <div class="bg-cave-surface/50 rounded-2xl p-5 space-y-4 shadow-sm">
    {@render numberSetting('Timer (seconds)', 'timerSec', settings.timerSec, 30, 9999, 10)}
    {@render numberSetting('Rounds', 'rounds', settings.rounds, 1, 10)}
    {@render numberSetting('Points (Easy)', 'pointsEasy', settings.pointsEasy, 1, 10)}
    {@render numberSetting('Points (Hard)', 'pointsHard', settings.pointsHard, 1, 10)}
    {@render numberSetting('Bop Penalty', 'bopPenalty', settings.bopPenalty, 0, 10)}
    {@render numberSetting('Boppers', 'bopperCount', settings.bopperCount, 1, 4)}

    <div class="flex items-center justify-between">
      <span class="font-bold text-cave-text whitespace-nowrap">Bopper Assignment</span>
      {#if isHost}
        <div class="flex gap-3 justify-center w-44">
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

  <div class="bg-cave-surface/50 rounded-2xl p-5 shadow-sm">
    <h3 class="text-lg font-bold text-cave-text mb-3">Card Packs</h3>
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
    <div class="mt-3 pt-3 border-t border-cave-border/20 text-center">
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
      Start Game
    </button>
    {#if !canStart && startDisabledReason}
      <p class="text-center text-sm text-bop-red font-bold">{startDisabledReason}</p>
    {/if}
  {/if}
</div>