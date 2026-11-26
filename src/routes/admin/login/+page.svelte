<script lang="ts">
  import { enhance } from '$app/forms';
  import AuthCard from '#lib/components/AuthCard.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Área dos admins · Macaquismo Oculto</title></svelte:head>

<AuthCard title="Área dos admins">
  <p class="auth-intro">Entre com a sua conta para organizar a rodada.</p>
  <form method="POST" class="auth-form" use:enhance>
    <label class="field">
      E-mail
      <input name="email" type="email" autocomplete="username" required maxlength="254" value={form?.email ?? ''} />
    </label>
    <label class="field">
      Senha
      <input name="password" type="password" autocomplete="current-password" required maxlength="128" />
    </label>
    {#if form?.message}<p class="feedback feedback-error" role="alert">{form.message}</p>{/if}
    <button class="button">Entrar</button>
  </form>
  <a class="auth-link" href="/admin/ativar">
    {data.firstAccess ? 'Ativar primeiro acesso' : 'Aceitar convite'}
  </a>
</AuthCard>
