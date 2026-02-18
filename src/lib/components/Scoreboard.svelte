<script lang="ts">
  import type { Team } from '$lib/types';

  let {
    teams,
    activeTeamIndex = null
  }: {
    teams: [Team, Team];
    activeTeamIndex?: number | null;
  } = $props();
</script>

<div class="grid grid-cols-2 gap-3" id="scoreboard">
  {#each teams as team, i}
    <div
      class="game-card p-4 text-center transition-all duration-300 {i === activeTeamIndex ? 'ring-2 ring-cave-brown scale-[1.02]' : ''}"
    >
      <h3 class="text-sm font-bold text-cave-muted uppercase tracking-wider truncate">
        {team.name}
      </h3>
      <div class="text-4xl font-bold mt-1 {i === activeTeamIndex ? 'text-cave-brown' : 'text-cave-text'}">
        {team.score}
      </div>
      <div class="mt-2 flex flex-wrap gap-1 justify-center">
        {#each team.players as player}
          <span class="text-xs bg-cave-bg px-2 py-0.5 rounded-full text-cave-muted">
            {player.name}
          </span>
        {/each}
      </div>
    </div>
  {/each}
</div>
