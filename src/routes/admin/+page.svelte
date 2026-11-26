<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import { CalendarDays, Dices, LockKeyhole, LogOut, Shield, Users } from '@lucide/svelte';
  import CopyCode from '#lib/components/CopyCode.svelte';
  import MonkeyPortrait from '#lib/components/MonkeyPortrait.svelte';
  import { stateLabels } from '#lib/event.ts';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  const isOwner = $derived(data.admin.role === 'owner');
  const draft = $derived(data.event.state === 'draft');
  const canIssueCode = $derived(data.event.state === 'drawn' || data.event.state === 'published');
  const namesById = $derived(new Map(data.participants.map(({ id, name }) => [id, name])));
  const revealedCount = $derived(data.participants.filter(({ revealed }) => revealed).length);
</script>

<svelte:head><title>Painel da rodada · Macaquismo Oculto</title></svelte:head>

{#snippet notice(section: string)}
  {#if form?.section === section && !form.code}
    <p class="feedback" class:feedback-error={!form.ok} role={form.ok ? 'status' : 'alert'}>{form.message}</p>
  {/if}
{/snippet}

<main class="dashboard" id="conteudo">
  <div class="dashboard-head">
    <div>
      <h1>Painel da rodada</h1>
      <p>{data.admin.email}</p>
    </div>
    <form method="POST" action="?/logout" use:enhance>
      <button class="button button-outline"><LogOut size={16} aria-hidden="true" /> Sair</button>
    </form>
  </div>

  <nav class="panel-nav" aria-label="Seções do painel">
    <a href="#rodada"><CalendarDays size={16} aria-hidden="true" /> Rodada</a>
    <a href="#participantes"><Users size={16} aria-hidden="true" /> Participantes</a>
    <a href="#bloqueios"><LockKeyhole size={16} aria-hidden="true" /> Bloqueios</a>
    {#if isOwner}<a href="#admins"><Shield size={16} aria-hidden="true" /> Admins</a>{/if}
  </nav>

  <div class="overview" id="rodada">
    <section class="panel">
      <h2>Detalhes da troca</h2>
      <form action="?/details" method="POST" class="stack" use:enhance>
        <div class="two-col">
          <label class="field">
            Data da troca
            <input name="date" type="date" value={data.event.exchange_date ?? ''} />
          </label>
          <label class="field">
            Limite do presente (R$)
            <input name="budget" type="number" inputmode="decimal" min="0" max="10000" step="0.01"
              value={data.event.budget_cents === null ? '' : (data.event.budget_cents / 100).toFixed(2)} />
          </label>
        </div>
        <label class="field">
          Local
          <input name="location" value={data.event.location} maxlength="120" />
        </label>
        <div><button class="button button-outline">Salvar detalhes</button></div>
        {@render notice('event')}
      </form>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <h2>Sorteio</h2>
        <span class="state">{stateLabels[data.event.state]}</span>
      </div>
      <div class="stack">
        {#if draft}
          <p class="muted">Confirme a lista e os bloqueios antes de sortear.</p>
          <form action="?/draw" method="POST" use:enhance>
            <button class="button"><Dices size={18} aria-hidden="true" /> Realizar sorteio</button>
          </form>
        {:else if data.event.state === 'drawn'}
          <p class="muted">A combinação está pronta. Ao liberar, a turma pode consultar o resultado.</p>
          <form action="?/publish" method="POST" use:enhance>
            <button class="button">Liberar revelação</button>
          </form>
        {:else if data.event.state === 'published'}
          <p class="muted">{revealedCount} de {data.participants.length} participantes já revelaram.</p>
          <details>
            <summary>Encerrar revelação</summary>
            <form action="?/close" method="POST" use:enhance>
              <label class="check-field"><input name="confirm" type="checkbox" required /> Confirmo o encerramento das consultas.</label>
              <button class="button button-outline">Encerrar</button>
            </form>
          </details>
        {:else}
          <p class="muted">A revelação terminou com {revealedCount} consultas individuais.</p>
        {/if}

        {#if data.event.state === 'drawn' || (isOwner && !draft)}
          <details>
            <summary>Reabrir rodada</summary>
            <form action="?/reset" method="POST" use:enhance>
              <label class="check-field"><input name="confirm" type="checkbox" required /> Confirmo o cancelamento do sorteio e dos códigos atuais.</label>
              <button class="button button-outline">Reabrir para sortear de novo</button>
            </form>
          </details>
        {/if}
        {@render notice('draw')}
      </div>
    </section>
  </div>

  <section class="panel" id="participantes">
    <div class="panel-heading">
      <h2>Participantes</h2>
      <span class="state">{data.participants.length} na rodada</span>
    </div>
    {#if draft}
      <form action="?/add" method="POST" class="stack addition" use:enhance>
        <label class="field">
          Adicionar participantes
          <textarea name="names" rows="2" placeholder="Um nome por linha" required></textarea>
        </label>
        <div><button class="button">Adicionar à rodada</button></div>
      </form>
    {:else if canIssueCode}
      <p class="muted">Emita os códigos e envie cada um no privado pelo WhatsApp.</p>
    {/if}
    {@render notice('participants')}
    {#if data.participants.length}
      <ul class="rows">
        {#each data.participants as participant (participant.id)}
          <li>
            <div class="list-row">
              <div class="person">
                <span class="avatar"><MonkeyPortrait avatar={participant.avatar} /></span>
                <span class="name">{participant.name}</span>
              </div>
              <div class="row-actions">
                {#if !draft}
                  <span class="row-status">
                    {participant.revealed ? 'Revelado' : participant.code_version > 0 ? 'Código emitido' : 'Sem código'}
                  </span>
                {/if}
                {#if draft || canIssueCode}
                  <form action={draft ? '?/remove' : '?/code'} method="POST" use:enhance>
                    <input type="hidden" name="id" value={participant.id} />
                    <input type="hidden" name="version" value={participant.code_version} />
                    {#if draft}
                      <button class="button button-outline" aria-label={'Remover ' + participant.name}>Remover</button>
                    {:else}
                      <button class="button button-outline" aria-label={(participant.code_version > 0 ? 'Trocar código de ' : 'Emitir código de ') + participant.name}>
                        {participant.code_version > 0 ? 'Trocar código' : 'Emitir código'}
                      </button>
                    {/if}
                  </form>
                {/if}
              </div>
            </div>
            {#if form?.section === 'participants' && form.code && form.target === participant.id}
              <div class="issued" role="status">
                <CopyCode
                  code={form.code}
                  label={participant.name}
                  whatsappMessage={`Macaquismo Oculto

Seu código é ${form.code}. Abra seu envelope em ${page.url.origin}/`}
                />
                <p class="muted">{form.message}</p>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="panel" id="bloqueios">
    <h2>Bloqueios</h2>
    {#if draft && data.participants.length >= 2}
      <form action="?/block" method="POST" class="stack" use:enhance>
        <div class="two-col">
          <div class="field">
            <label for="block-giver">Participante</label>
            <select id="block-giver" name="giver" required>
              <option value="">Selecione</option>
              {#each data.participants as participant (participant.id)}
                <option value={participant.id}>{participant.name}</option>
              {/each}
            </select>
          </div>
          <div class="field">
            <label for="block-recipient">Quem essa pessoa não pode tirar</label>
            <select id="block-recipient" name="recipient" required>
              <option value="">Selecione</option>
              {#each data.participants as participant (participant.id)}
                <option value={participant.id}>{participant.name}</option>
              {/each}
            </select>
          </div>
        </div>
        <label class="check-field"><input name="both" type="checkbox" /> Bloquear nos dois sentidos</label>
        <div><button class="button button-outline">Adicionar bloqueio</button></div>
      </form>
    {:else if draft}
      <p class="muted">Adicione duas pessoas para cadastrar um bloqueio.</p>
    {/if}
    {@render notice('exclusions')}
    {#if data.exclusions.length}
      <ul class="rows">
        {#each data.exclusions as block (`${block.giver_id}:${block.recipient_id}`)}
          <li class="list-row">
            <span class="name"><strong>{namesById.get(block.giver_id)}</strong> não pode tirar <strong>{namesById.get(block.recipient_id)}</strong></span>
            {#if draft}
              <form action="?/unblock" method="POST" use:enhance>
                <input type="hidden" name="giver" value={block.giver_id} />
                <input type="hidden" name="recipient" value={block.recipient_id} />
                <button class="button button-outline" aria-label={'Remover bloqueio de ' + namesById.get(block.giver_id) + ' para ' + namesById.get(block.recipient_id)}>Remover</button>
              </form>
            {/if}
          </li>
        {/each}
      </ul>
    {:else if data.participants.length >= 2}
      <p class="muted">Nenhum bloqueio cadastrado.</p>
    {/if}
  </section>

  {#if isOwner}
    <section class="panel" id="admins">
      <h2>Admins</h2>
      <form action="?/invite" method="POST" class="invite-form" use:enhance>
        <label class="field">
          E-mail da pessoa convidada
          <input name="email" type="email" required maxlength="254" />
        </label>
        <button class="button button-outline">Gerar convite</button>
      </form>
      {@render notice('admins')}
      {#if form?.section === 'admins' && form.code}
        <div class="issued" role="status">
          <CopyCode code={form.code} label={form.label ?? 'ativação'} />
          <p class="muted">{form.message} <a href="/admin/ativar">Página de ativação</a></p>
        </div>
      {/if}
      <ul class="rows">
        {#each data.admins as admin (admin.id)}
          <li class="list-row">
            <span class="name">{admin.email} <span class="row-status">{admin.role === 'owner' ? 'Responsável' : 'Admin'}</span></span>
            {#if admin.role === 'admin'}
              <form action="?/revoke" method="POST" use:enhance>
                <input type="hidden" name="id" value={admin.id} />
                <button class="button button-outline" aria-label={'Revogar acesso de ' + admin.email}>Revogar acesso</button>
              </form>
            {/if}
          </li>
        {/each}
        {#each data.invites as invite (invite.id)}
          <li class="list-row">
            <span class="name">{invite.email} <span class="row-status">Convite pendente</span></span>
            <form action="?/cancelInvite" method="POST" use:enhance>
              <input type="hidden" name="id" value={invite.id} />
              <button class="button button-outline" aria-label={'Cancelar convite de ' + invite.email}>Cancelar convite</button>
            </form>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</main>

<style>
  .dashboard {
    width: min(100% - 2rem, 71rem);
    margin: clamp(1.4rem, 4vw, 3rem) auto 4rem;
    display: grid;
    gap: 1rem;
  }
  .dashboard-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem 1rem;
    flex-wrap: wrap;
  }
  .dashboard-head h1 { font-size: clamp(3rem, 7vw, 5rem); }
  .dashboard-head p { color: var(--muted); overflow-wrap: anywhere; margin-top: 0.35rem; }
  .panel-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem 1.15rem;
    padding-block: 0.25rem;
    border-bottom: 1px solid var(--line);
  }
  .panel-nav a {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    min-height: 2.75rem;
    text-decoration: none;
    font-size: 0.875rem;
  }
  .panel-nav a:hover { text-decoration: underline; }
  .panel-nav :global(svg) { color: var(--gold); }
  .overview {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 1rem;
  }
  .panel {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 0.9rem;
    background: #12291fee;
    border-radius: 0.9rem;
    border: 1px solid var(--line);
    padding: clamp(1rem, 3vw, 1.5rem);
    scroll-margin-top: 1rem;
  }
  .panel-heading { display: flex; align-items: center; gap: 0.45rem 0.9rem; flex-wrap: wrap; }
  h2 { font-size: clamp(2rem, 5vw, 2.5rem); }
  .state {
    color: var(--gold);
    font-size: 0.82rem;
    border: 1px solid var(--line);
    border-radius: 2rem;
    padding: 0.22rem 0.6rem;
  }
  .stack { display: grid; gap: 0.8rem; }
  .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.65rem; }
  .addition { max-width: 34rem; }
  .muted { color: var(--muted); font-size: 0.9rem; }
  summary {
    display: list-item;
    padding-block: 0.48rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--gold);
  }
  details[open] form { padding-block: 0.28rem 0.75rem; }
  .rows { display: grid; padding: 0; margin: 0; list-style: none; }
  .rows > li { border-top: 1px solid var(--line); }
  .list-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem 0.9rem;
    padding-block: 0.55rem;
    min-height: 3.65rem;
  }
  .list-row form { flex-shrink: 0; }
  .person { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
  .avatar {
    display: block;
    flex: 0 0 2.6rem;
    background: #d6b77d1c;
    border: 1px solid var(--line);
    border-radius: 50%;
  }
  .name { overflow-wrap: anywhere; }
  .row-actions { display: flex; align-items: center; gap: 0.4rem 0.75rem; flex-wrap: wrap; }
  .row-status { display: inline-block; font-size: 0.8rem; color: var(--muted); }
  .name .row-status { margin-left: 0.35rem; }
  .issued {
    border: 1px solid var(--line);
    border-radius: 0.7rem;
    background: #0919119c;
    padding: 0.75rem;
    display: grid;
    gap: 0.45rem;
    margin-bottom: 0.8rem;
  }
  .invite-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.65rem; align-items: end; max-width: 32rem; }

  @media (max-width: 48rem) {
    .overview { grid-template-columns: 1fr; }
  }
  @media (max-width: 30rem) {
    .two-col { grid-template-columns: 1fr; }
    .row-actions { justify-content: flex-end; }
  }
  @media (max-width: 23rem) {
    .invite-form { grid-template-columns: 1fr; }
    .row-actions { justify-content: initial; }
    .list-row { flex-wrap: wrap; }
  }
</style>
