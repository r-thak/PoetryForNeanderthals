<script lang="ts">
  import type { Team } from '$lib/types';

  let {
    teams,
    onAddPlayer,
    onRemovePlayer,
    onUpdateTeamName
  }: {
    teams: [Team, Team];
    onAddPlayer: (teamIndex: number, name: string) => void;
    onRemovePlayer: (teamIndex: number, playerIndex: number) => void;
    onUpdateTeamName: (teamIndex: number, name: string) => void;
  } = $props();

  let newPlayerNames = $state(['', '']);
  let editingTeamName = $state([false, false]);
  let teamNameInputs = $state(['', '']);

  $effect(() => {
    if (!editingTeamName[0]) teamNameInputs[0] = teams[0].name;
    if (!editingTeamName[1]) teamNameInputs[1] = teams[1].name;
  });

  function addPlayer(teamIndex: number) {
    const name = newPlayerNames[teamIndex].trim();
    if (!name) return;
    onAddPlayer(teamIndex, name);
    newPlayerNames[teamIndex] = '';
  }

  function handleKeydown(e: KeyboardEvent, teamIndex: number) {
    if (e.key === 'Enter') {
      addPlayer(teamIndex);
    }
  }

  function saveTeamName(teamIndex: number) {
    const name = teamNameInputs[teamIndex].trim();
    if (name) {
      onUpdateTeamName(teamIndex, name);
    }
    editingTeamName[teamIndex] = false;
  }

  const teamColors = ['bg-cave-brown/10 border-cave-brown/30', 'bg-poet-blue/10 border-poet-blue/30'];
  const teamAccents = ['text-cave-brown', 'text-poet-blue'];
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 gap-4" id="team-picker">
  {#each teams as team, i}
    <div class="p-4 rounded-2xl {teamColors[i].split(' ')[0]} shadow-sm backdrop-blur-sm">
      <div class="flex items-center gap-2 mb-3">
        {#if editingTeamName[i]}
          <input
            type="text"
            bind:value={teamNameInputs[i]}
            class="flex-1 text-lg font-bold bg-transparent !border-none focus:ring-0 p-0"
            onblur={() => saveTeamName(i)}
            onkeydown={(e) => e.key === 'Enter' && saveTeamName(i)}
          />
        {:else}
          <h3
            class="text-xl font-bold {teamAccents[i]} cursor-pointer hover:opacity-80 flex-1"
            ondblclick={() => { editingTeamName[i] = true; teamNameInputs[i] = team.name; }}
            title="Double-click to edit"
          >
            {team.name}
          </h3>
        {/if}
        <span class="text-sm text-cave-muted">({team.players.length})</span>
      </div>

      <div class="space-y-1 mb-3 min-h-[80px]">
        {#each team.players as player, j}
          <div class="flex items-center gap-2 px-3 py-1.5 bg-cave-surface rounded-lg animate-slide-up">
            <span class="flex-1 font-bold text-cave-text">{player.name}</span>
            <button
              class="text-cave-muted hover:text-bop-red transition-colors text-lg cursor-pointer"
              onclick={() => onRemovePlayer(i, j)}
              aria-label="Remove {player.name}"
            >
              ×
            </button>
          </div>
        {/each}
        {#if team.players.length === 0}
          <p class="text-sm text-cave-muted text-center py-4">No players yet</p>
        {/if}
      </div>

      <div class="flex gap-2">
        <input
          type="text"
          placeholder="Player name..."
          bind:value={newPlayerNames[i]}
          onkeydown={(e) => handleKeydown(e, i)}
          class="flex-1 bg-white/50 !border-none focus:ring-0 rounded-lg text-sm"
        />
        <button
          class="btn btn-brown !w-auto !min-h-0 px-4 py-2 text-base"
          onclick={() => addPlayer(i)}
          disabled={!newPlayerNames[i].trim()}
        >
          +
        </button>
      </div>
    </div>
  {/each}
</div>
