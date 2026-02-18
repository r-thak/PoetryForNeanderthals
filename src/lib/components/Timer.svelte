<script lang="ts">
  let {
    timeRemaining,
    totalTime
  }: {
    timeRemaining: number;
    totalTime: number;
  } = $props();

  const progress = $derived(timeRemaining / totalTime);
  const isUrgent = $derived(timeRemaining <= 10);
  const isTimesUp = $derived(timeRemaining <= 0);
  const minutes = $derived(Math.floor(Math.max(0, timeRemaining) / 60));
  const seconds = $derived(Math.max(0, timeRemaining) % 60);
  const displayTime = $derived(
    minutes > 0
      ? `${minutes}:${seconds.toString().padStart(2, '0')}`
      : `${seconds}`
  );

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = $derived(circumference * (1 - progress));
</script>

<div class="flex flex-col items-center gap-2" id="timer-display">
  {#if isTimesUp}
    <div class="text-3xl font-bold text-bop-red animate-pop">
      TIME'S UP!
    </div>
  {:else}
    <div class="relative" style="width: {size}px; height: {size}px;">
      <svg
        class="absolute inset-0 -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          stroke-width={strokeWidth}
          fill="none"
          class="text-cave-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          stroke-width={strokeWidth}
          fill="none"
          stroke-linecap="round"
          stroke-dasharray={circumference}
          stroke-dashoffset={strokeDashoffset}
          class="transition-all duration-1000 ease-linear {isUrgent ? 'text-bop-red' : 'text-cave-brown'}"
        />
      </svg>
      <div
        class="absolute inset-0 flex items-center justify-center text-4xl font-bold {isUrgent ? 'text-bop-red animate-pulse-red' : 'text-cave-text'}"
      >
        {displayTime}
      </div>
    </div>
  {/if}
</div>
