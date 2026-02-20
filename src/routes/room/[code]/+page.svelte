<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { roomState, myRole, isHost, isClueGiver, isBopper, myTeamIndex, getPlayerId, setPlayerId } from '$lib/stores/roomState';
  import { connect, send, connected, onMessage, storePlayerId, storeRoomCode, storePlayerName, getStoredPlayerId, getStoredRoomCode, getStoredPlayerName, disconnect } from '$lib/ws/client';
  import { packs } from '$lib/data/deck';
  import type { GameSettings } from '$lib/types';
  import Card from '$lib/components/Card.svelte';
  import Timer from '$lib/components/Timer.svelte';
  import Scoreboard from '$lib/components/Scoreboard.svelte';
  import BopButton from '$lib/components/BopButton.svelte';
  import ActionButtons from '$lib/components/ActionButtons.svelte';
  import TurnReview from '$lib/components/TurnReview.svelte';
  import Lobby from '$lib/components/Lobby.svelte';

  const roomCode = $derived($page.params.code);
  let unsubMessage: (() => void) | null = null;
  let joinAttempted = $state(false);
  let error = $state('');
  let playerName = $state('');

  let sounds: Record<string, HTMLAudioElement> = {};
  if (typeof window !== 'undefined') {
    sounds = {
      bop: new Audio('/sounds/bop.mp3'),
      correct: new Audio('/sounds/correct.mp3'),
      tick: new Audio('/sounds/tick.mp3'),
      fanfare: new Audio('/sounds/fanfare.mp3')
    };
    Object.values(sounds).forEach((a) => a.load());
  }

  function playSound(name: string) {
    try {
      const audio = sounds[name];
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
    } catch {}
  }

  onMount(() => {
    connect();


    const storedPlayerId = getStoredPlayerId();
    const storedRoomCode = getStoredRoomCode();
    const storedName = getStoredPlayerName();

    if (storedPlayerId && storedRoomCode === roomCode && storedName) {
      setPlayerId(storedPlayerId);
      playerName = storedName;

      const checkConnect = setInterval(() => {
        if ($connected) {
          send('join_room', { code: roomCode, playerName: storedName, playerId: storedPlayerId });
          joinAttempted = true;
          clearInterval(checkConnect);
        }
      }, 200);
    }

    unsubMessage = onMessage((msg) => {
      if (msg.type === 'error') {
        error = msg.payload.message;
      }
      if (msg.type === 'tick' && msg.payload.timeRemaining <= 10 && msg.payload.timeRemaining > 0) {
        playSound('tick');
      }
    });
  });

  onDestroy(() => {
    if (unsubMessage) unsubMessage();
  });


  function joinTeam(teamIndex: number) {
    send('join_team', { teamIndex, playerName });
  }


  function handleGotIt(difficulty: 'easy' | 'hard') {
    playSound('correct');
    send('got_it', { difficulty });
  }

  function handleSkip() {
    send('skip', {});
  }

  function handleBop() {
    playSound('bop');
    send('bop', {});
  }

  function handleNextTurn() {
    send('next_turn', {});
  }

  function handleStartGame() {
    send('start_game', {});
  }

  function handleUpdateSettings(settings: GameSettings) {
    send('update_settings', { settings });
  }

  function handleLeave() {
    disconnect();
    roomState.set(null);
    goto('/room');
  }

  function handlePlayAgain() {

    goto('/room');
  }


  const clueGiver = $derived.by(() => {
    const room = $roomState;
    if (!room?.turn) return null;
    return room.teams[room.turn.teamIndex].players[room.turn.clueGiverIndex] || null;
  });

  const activeTeamName = $derived(
    $roomState?.turn ? $roomState.teams[$roomState.turn.teamIndex].name : ''
  );

  const bopperNames = $derived.by(() => {
    const room = $roomState;
    if (!room?.turn) return [];
    return room.turn.boppers.map((id) => {
      for (const team of room.teams) {
        const p = team.players.find((pl) => pl.id === id);
        if (p) return p.name;
      }
      return '???';
    });
  });

  const canStart = $derived(
    $roomState
      ? $roomState.teams[0].players.length >= 2 &&
        $roomState.teams[1].players.length >= 2 &&
        $roomState.settings.enabledPacks.length > 0
      : false
  );

  const startDisabledReason = $derived.by(() => {
    const room = $roomState;
    if (!room) return '';
    if (room.teams[0].players.length < 2 || room.teams[1].players.length < 2) {
      return 'Each team needs at least 2 players';
    }
    if (room.settings.enabledPacks.length === 0) return 'Select at least one card pack';
    return '';
  });

  const winner = $derived.by(() => {
    const room = $roomState;
    if (!room) return null;
    const t0 = room.teams[0];
    const t1 = room.teams[1];
    if (t0.score > t1.score) return t0;
    if (t1.score > t0.score) return t1;
    return null;
  });
</script>

<svelte:head>
  <title>Poetry for Neanderthals</title>
</svelte:head>

<div class="min-h-dvh py-6">
  <div class="container">


    {#if !$connected}
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="game-card p-8 text-center">
          <div class="text-4xl mb-3">📡</div>
          <p class="text-xl font-bold text-cave-brown">Reconnecting...</p>
          <div class="mt-3 w-8 h-8 border-4 border-cave-brown border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    {/if}

    {#if !$roomState}

      <div class="min-h-[80dvh] flex flex-col items-center justify-center text-center">
        <div class="text-4xl mb-3">⏳</div>
        <p class="text-xl font-bold text-cave-brown">Loading room {roomCode}...</p>
        {#if error}
          <p class="text-bop-red font-bold mt-3">{error}</p>
          <a href="/room" class="btn btn-outline mt-4 !w-auto">← Back to Rooms</a>
        {/if}
      </div>

    {:else if $roomState.phase === 'lobby'}

      <div class="animate-fade-in">
        <div class="flex items-center justify-between mb-4">
          <button onclick={handleLeave} class="text-cave-muted hover:text-cave-brown transition-colors text-xl cursor-pointer">← Leave</button>
          <div class="text-center">
            <h1 class="text-xl font-bold text-cave-brown">Room: {roomCode}</h1>
            <p class="text-sm text-cave-muted">Share this code with friends!</p>
          </div>
          <div class="w-16"></div>
        </div>


        <div class="game-card p-4 text-center mb-5">
          <p class="text-sm text-cave-muted mb-1">Room Code</p>
          <p class="text-4xl font-bold text-cave-brown tracking-[0.3em]">{roomCode}</p>
        </div>


        <div class="grid grid-cols-2 gap-3 mb-5">
          {#each $roomState.teams as team, i}
            <div class="game-card p-4 {$myTeamIndex === i ? 'ring-2 ring-cave-brown' : ''}">
              <h3 class="text-lg font-bold text-center {i === 0 ? 'text-cave-brown' : 'text-poet-blue'} mb-3">
                {team.name}
              </h3>
              <div class="space-y-1 mb-3 min-h-[60px]">
                {#each team.players as player}
                  <div class="flex items-center gap-2 px-2 py-1 bg-cave-bg rounded-lg text-sm">
                    <span class="flex-1">{player.name}</span>
                    {#if player.id === $roomState.host}
                      <span class="text-xs bg-cave-brown text-white px-2 py-0.5 rounded-full">Host</span>
                    {/if}
                  </div>
                {/each}
              </div>
              <button
                class="btn {i === 0 ? 'btn-brown' : 'btn-blue'} !min-h-[40px] text-sm"
                onclick={() => joinTeam(i)}
                disabled={$myTeamIndex === i}
              >
                {$myTeamIndex === i ? 'Joined ✓' : 'Join'}
              </button>
            </div>
          {/each}
        </div>


        <Lobby
          settings={$roomState.settings}
          isHost={$isHost}
          onUpdateSettings={handleUpdateSettings}
          onStart={handleStartGame}
          {packs}
          {canStart}
          {startDisabledReason}
        />
      </div>

    {:else if $roomState.phase === 'playing' && $roomState.turn}

      <div class="flex flex-col gap-4 animate-fade-in">

        <Scoreboard
          teams={$roomState.teams}
          activeTeamIndex={$roomState.turn.teamIndex}
        />


        <div class="flex justify-center">
          <Timer
            timeRemaining={$roomState.turn.timeRemaining}
            totalTime={$roomState.settings.timerSec}
          />
        </div>

        {#if $myRole === 'clue_giver'}

          <div class="text-center">
            <span class="bg-cave-brown/10 text-cave-brown font-bold text-sm px-4 py-1 rounded-full">
              You are the Clue-Giver!
            </span>
          </div>

          <Card
            card={$roomState.turn.currentCard}
            pointsEasy={$roomState.settings.pointsEasy}
            pointsHard={$roomState.settings.pointsHard}
          />

          <ActionButtons
            onGotIt={handleGotIt}
            onSkip={handleSkip}
            pointsEasy={$roomState.settings.pointsEasy}
            pointsHard={$roomState.settings.pointsHard}
          />

        {:else if $myRole === 'bopper'}

          <div class="text-center mt-4">
            <span class="bg-bop-red/10 text-bop-red font-bold text-lg px-6 py-2 rounded-full">
              🦴 You are the Bopper!
            </span>
            <p class="text-cave-muted mt-2">Listen carefully — bop if they use big words!</p>
          </div>

          <div class="mt-4">
            <BopButton onBop={handleBop} penalty={$roomState.settings.bopPenalty} />
          </div>

        {:else if $myRole === 'teammate'}

          <div class="text-center mt-8">
            <div class="text-6xl mb-4">👂</div>
            <p class="text-2xl font-bold text-cave-brown">Listen and Guess!</p>
            <p class="text-cave-muted mt-2">
              {clueGiver?.name} is giving clues. Guess the word!
            </p>
          </div>

        {:else}

          <div class="text-center mt-8">
            <div class="text-6xl mb-4">👀</div>
            <p class="text-xl font-bold text-cave-muted">Watching the game...</p>
          </div>
        {/if}


        <p class="text-center text-sm text-cave-muted mt-2">
          Cards attempted: {$roomState.turn.cards.length}
        </p>
      </div>

    {:else if $roomState.phase === 'turn_review' && $roomState.turn}

      <div class="flex flex-col gap-4 animate-fade-in">
        <Scoreboard teams={$roomState.teams} activeTeamIndex={null} />

        <TurnReview
          cards={$roomState.turn.cards}
          settings={$roomState.settings}
        />

        {#if $isHost}
          <button
            id="next-turn-btn"
            class="btn btn-brown text-xl"
            onclick={handleNextTurn}
          >
            ➡️ Next Turn
          </button>
        {:else}
          <p class="text-center text-cave-muted">Waiting for host to continue...</p>
        {/if}
      </div>

    {:else if $roomState.phase === 'game_over'}

      <div class="flex flex-col gap-5 animate-fade-in">
        <div class="text-center">
          <div class="text-6xl mb-2">🏆</div>
          <h1 class="text-3xl font-bold text-cave-brown">Game Over!</h1>
        </div>

        <Scoreboard teams={$roomState.teams} activeTeamIndex={null} />

        <div class="game-card p-6 text-center">
          {#if winner}
            <p class="text-2xl font-bold text-cave-brown animate-pop">
              🎉 {winner.name} wins!
            </p>
            <p class="text-lg text-cave-muted mt-1">{winner.score} points</p>
          {:else}
            <p class="text-2xl font-bold text-cave-brown">🤝 It's a tie!</p>
          {/if}
        </div>

        <div class="flex flex-col gap-3">
          <button class="btn btn-outline text-xl" onclick={handleLeave} id="leave-room-btn">
            🚪 Leave Room
          </button>
        </div>
      </div>
    {/if}

  </div>
</div>
