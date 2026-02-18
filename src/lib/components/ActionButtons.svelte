<script lang="ts">
  let {
    onGotIt,
    onSkip,
    pointsEasy,
    pointsHard
  }: {
    onGotIt: (difficulty: 'easy' | 'hard') => void;
    onSkip: () => void;
    pointsEasy: number;
    pointsHard: number;
  } = $props();
</script>

<div class="flex flex-col gap-3" id="action-buttons">
  <button
    class="btn btn-green text-xl"
    id="btn-got-it-easy"
    onclick={() => onGotIt('easy')}
  >
    ✓ Got It — Easy ({pointsEasy} pt)
  </button>
  <button
    class="btn btn-blue text-xl"
    id="btn-got-it-hard"
    onclick={() => onGotIt('hard')}
  >
    ★ Got It — Hard ({pointsHard} pts)
  </button>
  <button
    class="btn btn-gray text-xl"
    id="btn-skip"
    onclick={onSkip}
  >
    ⏭ Skip
  </button>
</div>
