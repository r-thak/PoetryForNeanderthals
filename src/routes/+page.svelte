<svelte:head>
  <title>Poetry for Neanderthals</title>
  <meta name="description" content="A party word game where you describe words using only single-syllable words! Play locally or with friends online." />
</svelte:head>

<div class="min-h-dvh flex flex-col items-center justify-center px-4 py-8">
  <div class="container text-center">

    <div class="mb-8 animate-fade-in">
      <div class="text-7xl mb-4">🦴</div>
      <h1 class="text-5xl sm:text-6xl font-bold text-cave-brown leading-tight">
        Poetry for<br />Neanderthals
      </h1>
      <p class="text-lg text-cave-muted mt-3 max-w-sm mx-auto">
        Use only one-syllable words. Big words get you bopped!
      </p>
    </div>


    <div class="flex flex-col gap-4 max-w-sm mx-auto animate-slide-up">
      <a href="/local" class="btn btn-brown text-xl" id="play-local-btn">
        📱 Play on One Device
      </a>
      <a href="/room" class="btn btn-blue text-xl" id="play-online-btn">
        🌐 Create / Join Room
      </a>
    </div>


    <div class="mt-12 text-cave-muted text-sm animate-fade-in" style="animation-delay: 0.3s">
      <p>🪨 Speak small. Think big. Don't get bopped!</p>
    </div>
  </div>
</div>
