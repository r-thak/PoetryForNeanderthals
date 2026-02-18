<script lang="ts">
  import type { Card } from '$lib/types';

  let {
    card,
    pointsEasy,
    pointsHard
  }: {
    card: Card;
    pointsEasy: number;
    pointsHard: number;
  } = $props();
</script>

<div class="game-card overflow-hidden animate-slide-up">
  <div class="px-6 py-5 border-b-2 border-cave-border">
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm font-bold text-cave-muted uppercase tracking-wider">Easy</span>
      <span class="bg-correct-green/15 text-correct-green text-sm font-bold px-3 py-0.5 rounded-full">
        {pointsEasy} pt
      </span>
    </div>
    <p class="text-2xl font-bold text-cave-text">{card.easy}</p>
  </div>

  <div class="px-6 py-5 bg-poet-blue/5">
    <div class="flex items-center justify-between mb-1">
      <span class="text-sm font-bold text-cave-muted uppercase tracking-wider">Hard</span>
      <span class="bg-poet-blue/15 text-poet-blue text-sm font-bold px-3 py-0.5 rounded-full">
        {pointsHard} pts
      </span>
    </div>
    <p class="text-3xl font-bold text-poet-blue">{card.hard}</p>
  </div>
</div>
