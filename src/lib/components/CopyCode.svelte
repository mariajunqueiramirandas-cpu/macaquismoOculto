<script lang="ts">
  import { Check, Copy, MessageCircle } from '@lucide/svelte';

  let { code, label, whatsappMessage }: {
    code: string;
    label: string;
    whatsappMessage?: string;
  } = $props();
  let input: HTMLInputElement;
  let copied = $state('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = code;
    } catch {
      input?.select();
    }
  }
</script>

<div class="copy-code" class:shareable={whatsappMessage}>
  <label class="field">
    Código de {label}
    <input readonly value={code} bind:this={input} />
  </label>
  <div class="code-actions">
    <button class="button button-outline" type="button" onclick={copy} aria-live="polite">
      {#if copied === code}
        <Check size={16} aria-hidden="true" /> Copiado
      {:else}
        <Copy size={16} aria-hidden="true" /> Copiar
      {/if}
    </button>
    {#if whatsappMessage}
      <a
        class="button"
        href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Enviar código no WhatsApp"
      >
        <MessageCircle size={17} aria-hidden="true" /> WhatsApp
      </a>
    {/if}
  </div>
</div>

<style>
  .copy-code {
    align-items: end;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.65rem;
    max-width: 29rem;
  }
  .shareable { grid-template-columns: minmax(0, 1fr); }
  .code-actions { display: flex; gap: 0.55rem; flex-wrap: wrap; }
  input { font-family: ui-monospace, monospace; }
</style>
