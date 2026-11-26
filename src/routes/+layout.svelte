<script lang="ts">
  import { LockKeyhole } from '@lucide/svelte';
  import { page } from '$app/state';
  import '@fontsource/instrument-serif/latin-400.css';
  import '@fontsource/instrument-serif/latin-400-italic.css';
  import '@fontsource-variable/dm-sans';
  import '../app.css';

  let { children } = $props();
  const inAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

<a href="#conteudo" class="skip-link">Pular para o conteúdo</a>
<header class="site-header">
  <div class="site-header-inner">
    <a class="brand" href="/" aria-label="Macaquismo Oculto, início">
      <img src="/artes/selo-macaco.webp" alt="" width="40" height="40" />
      <span>Macaquismo <em>Oculto</em></span>
    </a>
    {#if inAdmin}
      <a class="header-link" href="/">Revelação</a>
    {:else}
      <a class="header-link" href="/admin" aria-label="Área dos admins"><LockKeyhole size={15} aria-hidden="true" /> Admins</a>
    {/if}
  </div>
</header>

{@render children()}
