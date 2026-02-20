<svelte:head>
  <title>Poetry for Neanderthals</title>
</svelte:head>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { connect, send, onMessage, storePlayerId, storeRoomCode, storePlayerName } from '$lib/ws/client';
  import { roomState, setPlayerId } from '$lib/stores/roomState';
  import { onMount, onDestroy } from 'svelte';

  let playerName = $state('');
  let roomCode = $state('');
  let voiceEnabled = $state(false);
  let error = $state('');
  let loading = $state(false);
  let mode = $state<'choose' | 'create' | 'join'>('choose');

  let unsubMessage: (() => void) | null = null;

  onMount(() => {
    connect();
    unsubMessage = onMessage((msg) => {
      if (msg.type === 'room_state' && msg.payload?.code) {
        loading = false;

        const state = msg.payload;
        storeRoomCode(state.code);
        storePlayerName(playerName);
        goto(`/room/${state.code}`);
      }
      if (msg.type === 'error') {
        loading = false;
        error = msg.payload.message;
      }
    });
  });

  onDestroy(() => {
    if (unsubMessage) unsubMessage();
  });

  function handleCreate() {
    if (!playerName.trim()) {
      error = 'Please enter your name';
      return;
    }
    error = '';
    loading = true;
    const playerId = crypto.randomUUID();
    setPlayerId(playerId);
    storePlayerId(playerId);
    send('create_room', { 
      playerName: playerName.trim(), 
      voiceEnabled,
      playerId
    });
  }

  function handleJoin() {
    if (!playerName.trim()) {
      error = 'Please enter your name';
      return;
    }
    const code = roomCode.toUpperCase().trim();
    if (!/^[A-Z]{4}$/.test(code)) {
      error = 'Room code must be exactly 4 letters';
      return;
    }
    error = '';
    loading = true;
    const playerId = crypto.randomUUID();
    setPlayerId(playerId);
    storePlayerId(playerId);
    send('join_room', { 
      code,
      playerName: playerName.trim(),
      playerId
    });
  }
</script>

<div class="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
  <div class="container max-w-sm">
    <div class="flex items-center justify-between mb-6">
      <a href="/" class="text-cave-muted hover:text-cave-brown transition-colors text-2xl">← </a>
      <h1 class="text-2xl font-bold text-cave-brown">🌐 Online Room</h1>
      <div class="w-8"></div>
    </div>

    {#if mode === 'choose'}
      <div class="flex flex-col gap-4 animate-fade-in">
        <button
          class="btn btn-brown text-xl"
          id="create-room-btn"
          onclick={() => { mode = 'create'; }}
        >
          ✨ Create Room
        </button>
        <button
          class="btn btn-blue text-xl"
          id="join-room-btn"
          onclick={() => { mode = 'join'; }}
        >
          🚪 Join Room
        </button>
      </div>
    {:else if mode === 'create'}
      <div class="bg-cave-surface/50 rounded-2xl p-6 space-y-4 shadow-sm animate-slide-up">
        <h2 class="text-xl font-bold text-cave-text text-center">Create a Room</h2>
        <div>
          <label for="create-name" class="block font-bold text-sm text-cave-muted mb-1">Your Name</label>
          <input
            id="create-name"
            type="text"
            placeholder="Enter your name..."
            bind:value={playerName}
            class="border-none focus:ring-0 bg-white/50 rounded-lg"
          />
        </div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={voiceEnabled}
            class="accent-cave-brown w-5 h-5"
          />
          <span class="font-bold">🎤 Enable voice chat</span>
        </label>
        {#if error}
          <p class="text-bop-red text-sm font-bold text-center">{error}</p>
        {/if}
        <button class="btn btn-brown text-xl" onclick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create Room'}
        </button>
        <button class="btn btn-outline text-base" onclick={() => { mode = 'choose'; error = ''; }}>
          ← Back
        </button>
      </div>
    {:else}
      <div class="bg-cave-surface/50 rounded-2xl p-6 space-y-4 shadow-sm animate-slide-up">
        <h2 class="text-xl font-bold text-cave-text text-center">Join a Room</h2>
        <div>
          <label for="join-name" class="block font-bold text-sm text-cave-muted mb-1">Your Name</label>
          <input
            id="join-name"
            type="text"
            placeholder="Enter your name..."
            bind:value={playerName}
            class="border-none focus:ring-0 bg-white/50 rounded-lg"
          />
        </div>
        <div>
          <label for="join-code" class="block font-bold text-sm text-cave-muted mb-1">Room Code</label>
          <input
            id="join-code"
            type="text"
            placeholder="e.g. GRUG"
            bind:value={roomCode}
            maxlength={4}
            class="uppercase tracking-widest text-center text-2xl border-none focus:ring-0 bg-white/50 rounded-lg"
          />
        </div>
        {#if error}
          <p class="text-bop-red text-sm font-bold text-center">{error}</p>
        {/if}
        <button class="btn btn-blue text-xl" onclick={handleJoin} disabled={loading}>
          {loading ? 'Joining...' : 'Join Room'}
        </button>
        <button class="btn btn-outline text-base" onclick={() => { mode = 'choose'; error = ''; }}>
          ← Back
        </button>
      </div>
    {/if}
  </div>
</div>
