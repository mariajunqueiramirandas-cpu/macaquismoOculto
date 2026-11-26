<script lang="ts">
  import { enhance, type SubmitFunction } from '$app/forms';
  import { ArrowLeft, CalendarDays, Gift, LockKeyhole, MapPin, Timer } from '@lucide/svelte';
  import { tick } from 'svelte';
  import { budgetLabel, dateLabel } from '#lib/event.ts';
  import MonkeyPortrait from '#lib/components/MonkeyPortrait.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let sending = $state(false);
  let resultHeading = $state<HTMLElement>();
  const isOpen = $derived(data.state === 'published');

  const submit: SubmitFunction = ({ cancel }) => {
    if (sending) return cancel();
    sending = true;
    return async ({ result, update }) => {
      try {
        await update();
        if (result.type === 'success') {
          await tick();
          resultHeading?.focus({ preventScroll: true });
          window.scrollTo(0, 0);
        }
      } finally {
        sending = false;
      }
    };
  };
</script>

<svelte:head>
  <title>Macaquismo Oculto</title>
  <meta name="description" content="Abra o envelope do amigo secreto da turma com seu código." />
</svelte:head>

<main id="conteudo">
  {#if form?.result}
    {@const result = form.result}
    <section class="reveal" aria-label="Resultado do amigo secreto">
      <article class="paper letter">
        <div class="result-portrait"><MonkeyPortrait avatar={result.avatar} /></div>
        <p class="result-label">Você tirou</p>
        <h1 tabindex="-1" bind:this={resultHeading}>{result.name}</h1>
        <dl class="exchange">
          <div>
            <dt><CalendarDays size={17} aria-hidden="true" /> Data</dt>
            <dd>{dateLabel(result.exchange_date)}</dd>
          </div>
          <div>
            <dt><MapPin size={17} aria-hidden="true" /> Local</dt>
            <dd>{result.location || 'A combinar'}</dd>
          </div>
          <div>
            <dt><Gift size={17} aria-hidden="true" /> Limite do presente</dt>
            <dd>{budgetLabel(result.budget_cents)}</dd>
          </div>
        </dl>
      </article>
      <div class="envelope-pocket" aria-hidden="true">
        <img src="/artes/envelope-aberto.webp" alt="" width="1536" height="1024" />
      </div>
      <a data-sveltekit-reload class="button button-outline back-link" href="/">
        <ArrowLeft size={17} aria-hidden="true" /> Voltar para a entrada
      </a>
    </section>
  {:else}
    <section class="landing" aria-labelledby="prompt">
      <div class="envelope-stage" aria-hidden="true">
        <div class="hero-monkey hero-monkey-left"><MonkeyPortrait avatar={0} /></div>
        <div class="hero-monkey hero-monkey-right"><MonkeyPortrait avatar={1} /></div>
        <img
          src="/artes/envelope-fechado.webp"
          alt=""
          class="closed-envelope"
          width="1536"
          height="1024"
          fetchpriority="high"
        />
      </div>

      <div class="paper reveal-panel">
        <h1 id="prompt">Abra seu envelope</h1>
        <form method="POST" use:enhance={submit} aria-busy={sending}>
          <div class="code-field">
            <div class="code-label">
              <label for="code">Seu código</label>
              <span id="code-hint">Enviado pelo WhatsApp</span>
            </div>
            <input
              name="code"
              id="code"
              placeholder="XXXX-XXXX-XXXX"
              class="code-input"
              spellcheck="false"
              autocomplete="off"
              autocapitalize="characters"
              maxlength="24"
              aria-invalid={form?.message ? 'true' : undefined}
              aria-describedby={form?.message ? 'code-hint code-error' : 'code-hint'}
              disabled={!isOpen}
              required
            />
          </div>

          {#if form?.message}
            <p class="feedback feedback-error" id="code-error" role="alert">{form.message}</p>
          {/if}

          <button class="button" disabled={sending || !isOpen}>
            <LockKeyhole size={17} aria-hidden="true" />
            {sending ? 'Abrindo…' : 'Revelar amigo secreto'}
          </button>
        </form>

        {#if !isOpen}
          <p class="availability">
            <Timer size={16} aria-hidden="true" />
            {data.state === 'closed' ? 'A revelação foi encerrada.' : 'Aguardando a liberação do sorteio.'}
          </p>
        {/if}
      </div>
    </section>
  {/if}
</main>

<style>
  .landing, .reveal {
    width: min(100% - 1.75rem, 30rem);
    margin-inline: auto;
    padding-block: clamp(1.25rem, 4svh, 2.8rem) 2rem;
  }

  .envelope-stage {
    position: relative;
    isolation: isolate;
    aspect-ratio: 2.23;
    margin: 0 auto 0.75rem;
  }

  .envelope-stage::before {
    content: '';
    position: absolute;
    inset: -30% 3% -8%;
    background: radial-gradient(ellipse at 50% 64%, #a9975840, transparent 68%);
  }

  .closed-envelope {
    position: absolute;
    z-index: 1;
    display: block;
    width: 100%;
    height: auto;
    bottom: -1%;
    left: 0;
    filter: drop-shadow(0 0.75rem 0.75rem #01130fa8);
  }

  .hero-monkey {
    position: absolute;
    z-index: 2;
    width: 24%;
    filter: drop-shadow(0 0.35rem 0.5rem #06170bbe);
  }

  .hero-monkey-left { left: 1%; bottom: 13%; transform: rotate(-12deg); }
  .hero-monkey-right { right: 1%; bottom: 13%; transform: rotate(12deg); }

  .reveal-panel {
    border-top: 3px solid #d9bd8b;
    padding: clamp(1.15rem, 5vw, 2rem);
  }

  .reveal-panel h1 {
    font-size: clamp(2.55rem, 10vw, 3.65rem);
    letter-spacing: -0.028em;
  }

  .reveal-panel form { display: grid; gap: 0.8rem; margin-top: 1.25rem; }
  .code-field { display: grid; gap: 0.42rem; }
  .code-label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.15rem 0.65rem;
    font-size: 0.875rem;
  }

  .code-label label { font-weight: 700; }
  .code-label span { color: #605946; }

  .code-input {
    min-height: 3.25rem;
    width: 100%;
    border: 1px solid #8066496b;
    border-radius: 0.55rem;
    padding: 0.7rem 0.82rem;
    background: #fff9ed;
    color: var(--on-paper);
    font: 1rem/1.25 ui-monospace, monospace;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .code-input::placeholder { color: #74644e; }
  .code-input:disabled { background: #f5ebd9; }
  .reveal-panel .button { min-height: 3.25rem; font-size: 0.94rem; }

  .availability {
    color: #555040;
    border-top: 1px solid var(--paper-line);
    margin-top: 1rem;
    padding-top: 0.82rem;
    display: flex;
    align-items: center;
    gap: 0.52rem;
    font-size: 0.875rem;
  }

  .availability :global(svg) { flex-shrink: 0; }

  .reveal { text-align: center; container-type: inline-size; }
  .letter {
    position: relative;
    z-index: 1;
    margin-inline: 5%;
    padding: clamp(1rem, 5.9cqw, 1.8rem) clamp(0.85rem, 5cqw, 1.6rem) 1.5rem;
    border-radius: 0.75rem 0.75rem 0.2rem 0.2rem;
    background: linear-gradient(145deg, #fbf1df, #f3e4cb);
    box-shadow: 0 1rem 2rem #06170b62;
    animation: arrive 280ms ease-out both;
  }

  @keyframes arrive {
    from { opacity: 0.78; transform: translateY(0.5rem); }
  }

  .result-portrait { width: clamp(3.45rem, 19cqw, 5.75rem); margin: 0 auto 0.25rem; }
  .result-label { color: #4f604d; font-size: 0.92rem; }
  .letter h1 {
    font-size: clamp(2.1rem, 9.1cqw, 3.75rem);
    line-height: 0.98;
    text-wrap: balance;
    overflow-wrap: anywhere;
    letter-spacing: -0.025em;
    margin-block: 0.2rem 0.85rem;
  }

  .letter h1:focus { outline-color: #276549; outline-offset: 0.15rem; }
  .exchange { text-align: left; font-size: 0.9rem; }
  .exchange > div {
    display: grid;
    gap: 0.32rem;
    padding-block: 0.62rem;
    border-top: 1px solid var(--paper-line);
  }

  .exchange dt { color: #49604e; display: flex; align-items: center; gap: 0.48rem; }
  .exchange dd { padding-inline-start: 1.55rem; font-weight: 650; overflow-wrap: anywhere; }

  .envelope-pocket {
    position: relative;
    z-index: 2;
    overflow: hidden;
    aspect-ratio: 4.6;
    margin-top: -0.7rem;
  }

  .envelope-pocket img {
    position: absolute;
    left: -15%;
    bottom: -3cqw;
    display: block;
    width: 130%;
    max-width: none;
    height: auto;
  }

  .back-link { margin-top: 1rem; }

  @container (min-width: 23rem) {
    .exchange > div { grid-template-columns: 8.15rem minmax(0, 1fr); align-items: start; gap: 0.7rem; }
    .exchange dd { padding: 0; }
  }

  @media (min-width: 45rem) {
    .landing, .reveal { width: min(100% - 3rem, 31rem); padding-block: clamp(2.5rem, 7svh, 4.4rem) 3.5rem; }
    .envelope-stage { margin-bottom: 1rem; }
  }
</style>
