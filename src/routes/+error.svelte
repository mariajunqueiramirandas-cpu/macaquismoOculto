<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head><title>Macaquismo Oculto</title></svelte:head>

<main id="conteudo" class="error-page">
  <h1>{page.status === 404 ? 'Página fora da trilha' : 'O envelope emperrou'}</h1>
  <p>{page.status === 404 ? 'Confira o endereço ou volte para a entrada.' : 'Tente novamente daqui a pouco.'}</p>
  <a class="button" href="/">Voltar para a entrada</a>
</main>

<style>
  .error-page { max-width: 35rem; margin: 3rem auto; padding: 1rem; text-align: center; }
  h1 { font-size: clamp(2.6rem, 6vw, 4.1rem); }
  p { margin: 0.8rem 0 1.5rem; color: var(--muted); }
</style>
