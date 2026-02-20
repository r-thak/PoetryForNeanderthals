<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';

  let { children } = $props();
</script>

{@render children()}

<div class="fixed bottom-6 right-6 flex flex-row gap-3 z-50 animate-fade-in">
  <div class="game-card !shadow-none p-2 flex flex-row gap-2 pointer-events-auto border-cave-border/30 bg-white/40 backdrop-blur-md">
    <a href="/" class="social-btn" title="Home">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </a>
    
    {#if $page.url.pathname === '/'}
      <div transition:slide={{ axis: 'x', duration: 300 }} class="flex flex-row gap-2 overflow-hidden">
        <a href="https://github.com/r-thak/PoetryForNeanderthals/" target="_blank" rel="noopener noreferrer" class="social-btn shrink-0" title="GitHub Repository">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
        </a>

        <a href="https://rthak.com/navigator" target="_blank" rel="noopener noreferrer" class="social-btn shrink-0" title="rthak.com">
          <img src="/rthak.svg" alt="rthak" class="w-6 h-6 rounded-full" />
        </a>
      </div>
    {/if}
  </div>
</div>

<style>
  .social-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: var(--color-cave-brown);
    background: transparent;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1px solid transparent;
  }

  .social-btn:hover {
    background-color: white;
    color: var(--color-poet-blue);
  }

  .social-btn:active {
    transform: scale(0.95);
  }

  .social-btn img {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
  }
</style>