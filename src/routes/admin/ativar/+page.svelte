<script lang="ts">
  import { enhance } from '$app/forms';
  import AuthCard from '#lib/components/AuthCard.svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head><title>Ativar acesso · Macaquismo Oculto</title></svelte:head>

<AuthCard title={data.firstAccess ? 'Ativar primeiro acesso' : 'Aceitar convite'}>
  <p class="auth-intro">
    {data.firstAccess
      ? 'Use o código de configuração para criar a conta responsável.'
      : 'Use o código que o responsável enviou e crie sua senha.'}
  </p>
  <form method="POST" class="auth-form" use:enhance>
    <label class="field">
      E-mail
      <input name="email" type="email" autocomplete="username" required maxlength="254" value={form?.email ?? ''} />
    </label>
    <label class="field">
      Senha (mínimo de 12 caracteres)
      <input name="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128" />
    </label>
    <label class="field">
      {data.firstAccess ? 'Código de configuração' : 'Código do convite'}
      <input name="token" type="password" autocomplete="off" required maxlength="256" />
    </label>
    {#if form?.message}<p class="feedback feedback-error" role="alert">{form.message}</p>{/if}
    <button class="button">Ativar conta</button>
  </form>
  <a class="auth-link" href="/admin/login">Voltar para o login</a>
</AuthCard>
