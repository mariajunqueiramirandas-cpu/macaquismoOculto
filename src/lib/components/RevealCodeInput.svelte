<script lang="ts">
  import { onMount } from 'svelte';
  import { legacyRevealCodeLength, normalizeRevealCode, revealCodeLength } from '#lib/reveal-code.ts';

  let { value = $bindable(''), disabled, invalid }: {
    value?: string;
    disabled: boolean;
    invalid: boolean;
  } = $props();

  const legacy = $derived(value.length > revealCodeLength);
  const slotCount = $derived(legacy ? legacyRevealCodeLength : revealCodeLength);
  const groups = $derived(Array.from({ length: slotCount / revealCodeLength }, (_, group) =>
    Array.from({ length: revealCodeLength }, (_, slot) => group * revealCodeLength + slot)
  ));
  let enhanced = $state(false);
  let caret = $state(0);

  onMount(() => {
    enhanced = true;
  });

  function cleanInput(text: string): string {
    return text.replace(/[^a-zA-Z0-9]/g, '').slice(0, legacyRevealCodeLength).toUpperCase();
  }

  function trackCaret(event: Event & { currentTarget: HTMLInputElement }) {
    caret = event.currentTarget.selectionStart ?? value.length;
  }

  function oninput(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    const next = cleanInput(input.value);
    const position = cleanInput(input.value.slice(0, input.selectionStart ?? input.value.length)).length;
    if (next !== input.value) {
      input.value = next;
      input.setSelectionRange(position, position);
    }
    value = next;
    caret = position;
  }

  function onpaste(event: ClipboardEvent & { currentTarget: HTMLInputElement }) {
    const code = normalizeRevealCode(event.clipboardData?.getData('text') ?? '');
    if (!code) return;

    event.preventDefault();
    const input = event.currentTarget;
    input.value = code;
    input.setSelectionRange(code.length, code.length);
    value = code;
    caret = code.length;
  }

  function onclick(event: MouseEvent & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget;
    if (event.detail !== 1 || input.selectionStart !== input.selectionEnd) return;

    const slots = input.parentElement?.querySelectorAll('.code-slot');
    if (!slots) return;

    const index = Array.from(slots).findIndex((slot) => event.clientX < slot.getBoundingClientRect().right);
    const start = Math.min(index < 0 ? slotCount - 1 : index, value.length);
    input.setSelectionRange(start, Math.min(start + 1, value.length));
    caret = start;
  }
</script>

<div class="code-entry" class:enhanced class:invalid class:disabled class:legacy>
  <div class="code-slots" aria-hidden="true">
    {#each groups as group}
      <div class="code-group">
        {#each group as index}
          <span class="code-slot" class:filled={value[index]} class:active={index === Math.min(caret, slotCount - 1)}>
            {value[index] ?? ''}
          </span>
        {/each}
      </div>
    {/each}
  </div>

  <input
    name="code"
    id="code"
    value={value}
    placeholder="XXXX"
    spellcheck="false"
    autocomplete="one-time-code"
    autocapitalize="characters"
    minlength={revealCodeLength}
    maxlength={24}
    aria-invalid={invalid || undefined}
    aria-describedby={invalid ? 'code-hint code-error' : 'code-hint'}
    {disabled}
    required
    {oninput}
    {onpaste}
    {onclick}
    onfocus={trackCaret}
    onkeyup={trackCaret}
    onselect={trackCaret}
  />
</div>

<style>
  .code-entry {
    position: relative;
    container-type: inline-size;
  }

  .code-slots {
    display: none;
    align-items: center;
    width: min(100%, 18rem);
    margin-inline: auto;
    min-height: 2.75rem;
    pointer-events: none;
    user-select: none;
  }

  .enhanced .code-slots { display: grid; }

  .code-group {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: clamp(0.45rem, 3cqw, 0.72rem);
  }

  .legacy .code-slots {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(0.38rem, 2.7cqw, 0.72rem);
  }

  .legacy .code-group { gap: clamp(0.12rem, 1.1cqw, 0.35rem); }

  .code-slot {
    display: grid;
    aspect-ratio: 1;
    place-items: center;
    color: var(--on-paper);
    background: #fbf1e1;
    border: 1px solid #80664985;
    border-radius: 0.55rem;
    font: 650 clamp(1.35rem, 8.5cqw, 1.8rem)/1 ui-monospace, monospace;
  }

  .legacy .code-slot {
    border-radius: clamp(0.2rem, 1.25cqw, 0.38rem);
    font-size: clamp(0.82rem, 5cqw, 1.1rem);
  }

  .code-slot.filled { background: #fff9ee; border-color: #806649ad; }
  .disabled .code-slot:not(.filled) { background: #f0e4cd; }
  .invalid .code-slot { border-color: #a84e3b; }
  .code-entry:focus-within .code-slot.active { border-color: #276549; box-shadow: 0 0 0 1px #276549; }

  input {
    min-height: 2.75rem;
    width: 100%;
    border: 1px solid #80664985;
    border-radius: 0.55rem;
    padding: 0.65rem 0.78rem;
    background: #fff9ed;
    color: var(--on-paper);
    font: 1rem/1.25 ui-monospace, monospace;
    text-transform: uppercase;
  }

  input::placeholder { color: #74644e; }
  input:disabled { background: #f5ebd9; }

  .enhanced input {
    position: absolute;
    inset: 0;
    height: 100%;
    opacity: 0;
  }
</style>
