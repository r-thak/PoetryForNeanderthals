<script lang="ts">
  import type { TurnCard, GameSettings } from '$lib/types';

  let {
    cards,
    settings
  }: {
    cards: TurnCard[];
    settings: GameSettings;
  } = $props();

  function getPoints(tc: TurnCard): number {
    switch (tc.result) {
      case 'easy': return settings.pointsEasy;
      case 'hard': return settings.pointsHard;
      case 'bop': return -settings.bopPenalty;
      case 'skip': return 0;
    }
  }

  function getResultLabel(result: string): string {
    switch (result) {
      case 'easy': return 'Easy ✓';
      case 'hard': return 'Hard ★';
      case 'bop': return 'BOP! 🦴';
      case 'skip': return 'Skipped';
      default: return result;
    }
  }

  function getResultColor(result: string): string {
    switch (result) {
      case 'easy': return 'text-correct-green';
      case 'hard': return 'text-poet-blue';
      case 'bop': return 'text-bop-red';
      case 'skip': return 'text-cave-muted';
      default: return '';
    }
  }

  function getResultBg(result: string): string {
    switch (result) {
      case 'easy': return 'bg-correct-green/10';
      case 'hard': return 'bg-poet-blue/10';
      case 'bop': return 'bg-bop-red/10';
      case 'skip': return 'bg-cave-bg';
      default: return '';
    }
  }

  const totalGained = $derived(
    cards
      .filter((c) => c.result === 'easy' || c.result === 'hard')
      .reduce((sum, c) => sum + getPoints(c), 0)
  );
  const totalBops = $derived(
    cards.filter((c) => c.result === 'bop').length
  );
  const totalPenalty = $derived(totalBops * settings.bopPenalty);
  const net = $derived(totalGained - totalPenalty);
</script>

<div class="space-y-3" id="turn-review">
  <h2 class="text-2xl font-bold text-center text-cave-text">Turn Review</h2>

  {#if cards.length === 0}
    <p class="text-center text-cave-muted">No cards were attempted.</p>
  {:else}
    <div class="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
      {#each cards as tc, i}
        <div
          class="flex items-center gap-3 p-3 rounded-xl {getResultBg(tc.result)} shadow-sm animate-slide-up"
          style="animation-delay: {i * 50}ms"
        >
          <div class="flex-1 min-w-0">
            <p class="font-bold text-cave-text truncate">{tc.card.easy}</p>
            <p class="text-sm text-cave-muted truncate">{tc.card.hard}</p>
          </div>
          <div class="flex flex-col items-end shrink-0">
            <span class="text-sm font-bold {getResultColor(tc.result)}">
              {getResultLabel(tc.result)}
            </span>
            <span class="text-sm font-bold {getPoints(tc) >= 0 ? 'text-correct-green' : 'text-bop-red'}">
              {getPoints(tc) > 0 ? '+' : ''}{getPoints(tc)}
            </span>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <div class="bg-cave-surface/50 rounded-2xl p-4 mt-4 shadow-sm">
    <div class="grid grid-cols-3 text-center">
      <div>
        <div class="text-sm text-cave-muted">Gained</div>
        <div class="text-xl font-bold text-correct-green">+{totalGained}</div>
      </div>
      <div>
        <div class="text-sm text-cave-muted">Bops</div>
        <div class="text-xl font-bold text-bop-red">−{totalPenalty}</div>
      </div>
      <div>
        <div class="text-sm text-cave-muted">Net</div>
        <div class="text-xl font-bold {net >= 0 ? 'text-correct-green' : 'text-bop-red'}">
          {net >= 0 ? '+' : ''}{net}
        </div>
      </div>
    </div>
  </div>
</div>
