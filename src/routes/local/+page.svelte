<script lang="ts">
  import { onDestroy } from 'svelte';
  import { localGame } from '$lib/stores/localGame';
  import { packs } from '$lib/data/deck';
  import type { Player, GameSettings } from '$lib/types';
  import Card from '$lib/components/Card.svelte';
  import Timer from '$lib/components/Timer.svelte';
  import Scoreboard from '$lib/components/Scoreboard.svelte';
  import BopButton from '$lib/components/BopButton.svelte';
  import ActionButtons from '$lib/components/ActionButtons.svelte';
  import TurnReview from '$lib/components/TurnReview.svelte';
  import Lobby from '$lib/components/Lobby.svelte';
  import TeamPicker from '$lib/components/TeamPicker.svelte';

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let nextPlayerId = $state(1);

  let sounds: Record<string, HTMLAudioElement> = {};
  if (typeof window !== 'undefined') {
    sounds = {
      bop: new Audio('/sounds/bop.mp3'),
      correct: new Audio('/sounds/correct.mp3'),
      tick: new Audio('/sounds/tick.mp3'),
      fanfare: new Audio('/sounds/fanfare.mp3')
    };
    Object.values(sounds).forEach((a) => { a.load(); });
  }

  function playSound(name: string) {
    try {
      const audio = sounds[name];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    } catch {}
  }

  $effect(() => {
    if ($localGame.phase === 'playing') {
      stopTimer();
      timerInterval = setInterval(() => {
        localGame.tick();
        const state = $localGame;
        if (state.turn && state.turn.timeRemaining <= 10 && state.turn.timeRemaining > 0) {
          playSound('tick');
        }
        if (state.turn && state.turn.timeRemaining <= 0) {
          stopTimer();
          localGame.endTurn();
        }
      }, 1000);
    }
    return () => {
      if ($localGame.phase !== 'playing') {
        stopTimer();
      }
    };
  });

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  onDestroy(() => {
    stopTimer();
  });

  function addPlayer(teamIndex: number, name: string) {
    localGame.update((s) => {
      const teams = [...s.teams] as [typeof s.teams[0], typeof s.teams[1]];
      const player: Player = { id: `local-${nextPlayerId}`, name };
      nextPlayerId++;
      teams[teamIndex] = {
        ...teams[teamIndex],
        players: [...teams[teamIndex].players, player]
      };
      return { ...s, teams };
    });
  }

  function removePlayer(teamIndex: number, playerIndex: number) {
    localGame.update((s) => {
      const teams = [...s.teams] as [typeof s.teams[0], typeof s.teams[1]];
      teams[teamIndex] = {
        ...teams[teamIndex],
        players: teams[teamIndex].players.filter((_, i) => i !== playerIndex)
      };
      return { ...s, teams };
    });
  }

  function updateTeamName(teamIndex: number, name: string) {
    localGame.update((s) => {
      const teams = [...s.teams] as [typeof s.teams[0], typeof s.teams[1]];
      teams[teamIndex] = { ...teams[teamIndex], name };
      return { ...s, teams };
    });
  }

  function updateSettings(newSettings: GameSettings) {
    localGame.update((s) => ({ ...s, settings: newSettings }));
  }

  function handleGotIt(difficulty: 'easy' | 'hard') {
    playSound('correct');
    localGame.handleGotIt(difficulty);
  }

  function handleSkip() {
    localGame.handleSkip();
  }

  function handleBop() {
    playSound('bop');
    localGame.handleBop();
  }

  function handleNextTurn() {
    localGame.nextTurn();
  }

  function handlePlayAgain() {
    localGame.reset(true);
  }

  const canStart = $derived(
    $localGame.teams[0].players.length >= 2 &&
    $localGame.teams[1].players.length >= 2 &&
    $localGame.settings.enabledPacks.length > 0
  );

  const startDisabledReason = $derived.by(() => {
    if ($localGame.teams[0].players.length < 2 || $localGame.teams[1].players.length < 2) {
      return 'Each team needs at least 2 players';
    }
    if ($localGame.settings.enabledPacks.length === 0) {
      return 'Select at least one card pack';
    }
    return '';
  });

  const clueGiver = $derived(
    $localGame.turn
      ? $localGame.teams[$localGame.turn.teamIndex].players[$localGame.turn.clueGiverIndex]
      : null
  );

  const activeTeamName = $derived(
    $localGame.turn ? $localGame.teams[$localGame.turn.teamIndex].name : ''
  );

  const bopperNames = $derived(
    $localGame.turn
      ? $localGame.turn.boppers
          .map((id) => {
            for (const team of $localGame.teams) {
              const p = team.players.find((pl) => pl.id === id);
              if (p) return p.name;
            }
            return '???';
          })
      : []
  );

  const winner = $derived.by(() => {
    const t0 = $localGame.teams[0];
    const t1 = $localGame.teams[1];
    if (t0.score > t1.score) return t0;
    if (t1.score > t0.score) return t1;
    return null;
  });
</script>

<svelte:head>
  <title>Local Game — Poetry for Neanderthals</title>
</svelte:head>

<div class="min-h-dvh py-6">
  <div class="container">

    {#if $localGame.phase === 'setup'}
      <div class="animate-fade-in">
        <div class="flex items-center justify-between mb-6">
          <a href="/" class="text-cave-muted hover:text-cave-brown transition-colors text-2xl">← </a>
          <h1 class="text-2xl font-bold text-cave-brown">🦴 Local Game Setup</h1>
          <div class="w-8"></div>
        </div>

        <div class="mb-6">
          <h2 class="text-xl font-bold text-cave-text mb-3">👥 Teams</h2>
          <TeamPicker
            teams={$localGame.teams}
            {addPlayer}
            {removePlayer}
            {updateTeamName}
            onAddPlayer={addPlayer}
            onRemovePlayer={removePlayer}
            onUpdateTeamName={updateTeamName}
          />
        </div>

        <Lobby
          settings={$localGame.settings}
          isHost={true}
          onUpdateSettings={updateSettings}
          onStart={() => localGame.startGame()}
          {packs}
          {canStart}
          {startDisabledReason}
        />
      </div>

    {:else if $localGame.phase === 'interstitial'}
      <div class="min-h-[80dvh] flex flex-col items-center justify-center text-center animate-fade-in">
        <div class="game-card p-8 max-w-sm w-full">
          <div class="text-6xl mb-4">📱</div>
          <h2 class="text-2xl font-bold text-cave-brown mb-2">{activeTeamName}'s Turn!</h2>
          <p class="text-lg text-cave-text mb-2">
            Round {$localGame.round} of {$localGame.settings.rounds}
          </p>
          <div class="mt-4 p-4 bg-cave-bg rounded-xl">
            <p class="text-cave-muted text-sm mb-1">Clue-Giver</p>
            <p class="text-2xl font-bold text-cave-brown">{clueGiver?.name}</p>
          </div>
          {#if bopperNames.length > 0}
            <div class="mt-3 p-3 bg-bop-red/10 rounded-xl">
              <p class="text-cave-muted text-sm mb-1">Bopper{bopperNames.length > 1 ? 's' : ''}</p>
              <p class="text-lg font-bold text-bop-red">{bopperNames.join(', ')}</p>
            </div>
          {/if}
          <p class="mt-4 text-cave-muted">
            Pass the device to <strong class="text-cave-brown">{clueGiver?.name}</strong>
          </p>
          <button
            id="ready-btn"
            class="btn btn-brown mt-6 text-xl"
            onclick={() => localGame.startTurn()}
          >
            Ready! 🚀
          </button>
        </div>
      </div>

    {:else if $localGame.phase === 'playing' && $localGame.turn}
      <div class="flex flex-col gap-4 animate-fade-in">
        {#if $localGame.reshuffleNotification}
          <div class="bg-cave-brown/10 border-2 border-cave-brown/30 rounded-xl p-3 text-center text-cave-brown font-bold animate-slide-up">
            🔄 Deck reshuffled!
          </div>
        {/if}

        <div class="flex items-start justify-between">
          <Scoreboard
            teams={$localGame.teams}
            activeTeamIndex={$localGame.turn.teamIndex}
          />
        </div>

        <div class="flex justify-center">
          <Timer
            timeRemaining={$localGame.turn.timeRemaining}
            totalTime={$localGame.settings.timerSec}
          />
        </div>

        <Card
          card={$localGame.turn.currentCard}
          pointsEasy={$localGame.settings.pointsEasy}
          pointsHard={$localGame.settings.pointsHard}
        />

        <ActionButtons
          onGotIt={handleGotIt}
          onSkip={handleSkip}
          pointsEasy={$localGame.settings.pointsEasy}
          pointsHard={$localGame.settings.pointsHard}
        />

        <BopButton onBop={handleBop} penalty={$localGame.settings.bopPenalty} />

        <p class="text-center text-sm text-cave-muted">
          Cards: {$localGame.turn.cards.length} attempted
        </p>
      </div>

    {:else if $localGame.phase === 'turn_review' && $localGame.turn}
      <div class="flex flex-col gap-4 animate-fade-in">
        <Scoreboard teams={$localGame.teams} activeTeamIndex={null} />

        <TurnReview
          cards={$localGame.turn.cards}
          settings={$localGame.settings}
        />

        <button
          id="next-turn-btn"
          class="btn btn-brown text-xl"
          onclick={handleNextTurn}
        >
          {$localGame.turnNumber % 2 === 1 && $localGame.round >= $localGame.settings.rounds
            ? '🏆 See Results'
            : '➡️ Next Turn'}
        </button>
      </div>

    {:else if $localGame.phase === 'game_over'}
      <div class="flex flex-col gap-5 animate-fade-in">
        <div class="text-center">
          <div class="text-6xl mb-2">🏆</div>
          <h1 class="text-3xl font-bold text-cave-brown">Game Over!</h1>
        </div>

        <Scoreboard teams={$localGame.teams} activeTeamIndex={null} />

        <div class="game-card p-6 text-center">
          {#if winner}
            <p class="text-2xl font-bold text-cave-brown animate-pop">
              🎉 {winner.name} wins!
            </p>
            <p class="text-lg text-cave-muted mt-1">
              {winner.score} points
            </p>
          {:else}
            <p class="text-2xl font-bold text-cave-brown">
              🤝 It's a tie!
            </p>
          {/if}
        </div>

        <div class="game-card p-5">
          <h2 class="text-xl font-bold text-cave-text mb-3">📋 Game Summary</h2>
          {#each $localGame.turnHistory as turn, i}
            <div class="mb-3 p-3 bg-cave-bg rounded-xl">
              <p class="font-bold text-cave-text text-sm mb-2">
                Round {Math.floor(i / 2) + 1} — {$localGame.teams[turn.teamIndex].name}
              </p>
              <div class="flex flex-wrap gap-1">
                {#each turn.cards as tc}
                  <span class="text-xs px-2 py-0.5 rounded-full font-bold
                    {tc.result === 'easy' ? 'bg-correct-green/15 text-correct-green'
                      : tc.result === 'hard' ? 'bg-poet-blue/15 text-poet-blue'
                      : tc.result === 'bop' ? 'bg-bop-red/15 text-bop-red'
                      : 'bg-cave-border text-cave-muted'}">
                    {tc.card.easy}{tc.result === 'bop' ? ' 🦴' : tc.result === 'skip' ? ' ⏭' : ' ✓'}
                  </span>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <div class="flex flex-col gap-3">
          <button
            id="play-again-btn"
            class="btn btn-brown text-xl"
            onclick={handlePlayAgain}
          >
            🔄 Play Again
          </button>
          <a href="/" class="btn btn-outline text-xl" id="home-btn">
            🏠 Home
          </a>
        </div>
      </div>
    {/if}

  </div>
</div>
