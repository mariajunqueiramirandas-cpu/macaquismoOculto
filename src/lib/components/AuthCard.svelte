<script lang="ts">
  import { LockKeyhole } from '@lucide/svelte';
  import type { Snippet } from 'svelte';

  let { title, children }: { title: string; children: Snippet } = $props();
</script>

<main id="conteudo" class="auth">
  <section class="paper auth-card" aria-labelledby="auth-title">
    <div class="auth-icon"><LockKeyhole size={24} aria-hidden="true" /></div>
    <h1 id="auth-title">{title}</h1>
    {@render children()}
  </section>
</main>

<style>
  .auth {
    width: min(100% - 2rem, 30rem);
    margin: clamp(2rem, 8vw, 6rem) auto 3rem;
  }
  .auth-card { padding: clamp(1.25rem, 5vw, 2.5rem); }
  .auth-icon {
    display: grid;
    place-items: center;
    width: 2.8rem;
    height: 2.8rem;
    color: #305640;
    border: 1px solid var(--paper-line);
    background: #e3d0b18c;
    border-radius: 0.75rem;
    margin-bottom: 1rem;
  }
  h1 { font-size: clamp(2.85rem, 7vw, 3.75rem); }
  .auth-card :global(.auth-intro) { color: #555547; margin-top: 0.6rem; }
  .auth-card :global(.auth-form) { display: grid; gap: 0.9rem; margin-top: 1.35rem; }
  .auth-card :global(.auth-link) { display: inline-block; margin-top: 1.25rem; font-size: 0.9rem; font-weight: 650; }
</style>
