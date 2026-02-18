<script lang="ts">
  let {
    onBop,
    penalty
  }: {
    onBop: () => void;
    penalty: number;
  } = $props();

  let disabled = $state(false);
  let shaking = $state(false);

  function handleBop() {
    if (disabled) return;
    onBop();
    shaking = true;
    disabled = true;
    setTimeout(() => { shaking = false; }, 500);
    setTimeout(() => { disabled = false; }, 500);
  }
</script>

<button
  id="bop-button"
  class="w-full rounded-2xl bg-bop-red text-white font-bold text-3xl py-8 cursor-pointer
         transition-all duration-150 hover:bg-bop-red-dark active:scale-95
         shadow-lg shadow-bop-red/30 border-b-4 border-bop-red-dark
         {shaking ? 'animate-shake' : ''}
         disabled:opacity-50 disabled:cursor-not-allowed"
  style="min-height: 200px;"
  onclick={handleBop}
  {disabled}
>
  <div class="text-5xl mb-2">🦴</div>
  <div>BOP!</div>
  <div class="text-lg mt-1 opacity-80">(−{penalty})</div>
</button>