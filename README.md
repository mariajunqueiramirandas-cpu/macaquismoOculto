# Macaquismo Oculto

Amigo secreto da turma, em SvelteKit e PostgreSQL. Cada participante ganha uma ilustração sorteada entre 16 macacos. A arte fica associada à pessoa e aparece na revelação.

## Rodar localmente

Copie `.env.example` para `.env`. Gere valores separados para `POSTGRES_PASSWORD`, `APP_SECRET` e `ADMIN_SETUP_TOKEN` com `openssl rand -hex 32`. Use `ORIGIN=http://localhost:3000`.

```sh
docker compose -f compose.yaml -f compose.local.yaml up -d --build --wait
```

Abra [http://localhost:3000/admin/ativar](http://localhost:3000/admin/ativar). Use `ADMIN_SETUP_TOKEN` como código de configuração e crie o e-mail e a senha do responsável.

## Deploy no Dokploy

1. Crie um serviço do tipo **Docker Compose** a partir deste repositório. Selecione a branch `main` e o arquivo `compose.yaml`.
2. Defina as variáveis abaixo na aba de ambiente do serviço.

   | Variável | Valor |
   | --- | --- |
   | `POSTGRES_PASSWORD` | Senha gerada para o PostgreSQL |
   | `APP_SECRET` | Segredo persistente gerado para a validação de códigos e sessões |
   | `ADMIN_SETUP_TOKEN` | Código gerado para a ativação da primeira conta |
   | `ORIGIN` | URL HTTPS exata do site, por exemplo `https://oculto.exemplo.com` |
   | `ADDRESS_HEADER` | `x-forwarded-for` com o Traefik do Dokploy |
   | `XFF_DEPTH` | `1` quando o Traefik é o único proxy |

3. Na aba **Domains**, vincule o domínio ao serviço `app`, porta interna `3000`, com HTTPS. O Compose de produção expõe a aplicação ao proxy e usa uma rede interna dedicada para o banco.
4. Faça o deploy e abra `/admin/ativar` no domínio para criar a conta responsável. O código de configuração vale até a criação dessa conta.

O contêiner aplica as migrações ao iniciar. O Dokploy pode consultar `/healthz` para verificar a conexão com o banco. O volume `postgres-data` guarda contas, participantes e a rodada. Mantenha os mesmos valores de `POSTGRES_PASSWORD` e `APP_SECRET` em redeploys.

Este comando gera um backup no contexto do projeto Compose.

```sh
docker compose exec -T db pg_dump -U macaquismo -d macaquismo -Fc > macaquismo.dump
```

## Organizar a rodada

1. Em **Participantes**, cole um nome por linha. As artes são distribuídas aleatoriamente, com uma por pessoa enquanto houver retratos disponíveis.
2. Em **Bloqueios**, selecione quem dá o presente e quem essa pessoa quer evitar. Marque **Bloquear nos dois sentidos** para aplicar a regra inversa também.
3. Faça o sorteio. Se as opções não formarem uma combinação completa, o painel indica quais participantes revisar.
4. Emita um código por participante e envie cada um no privado pelo WhatsApp. Use **WhatsApp** para abrir uma mensagem com o código e o link da revelação ou **Copiar** para copiar só o código. **Trocar código** invalida o anterior e preserva o resultado. Quem distribui os códigos também tem acesso a eles.
5. Libere a revelação. O painel acompanha quem abriu o envelope. Ao encerrar, a consulta fica indisponível. O responsável pode reabrir a rodada e cancelar os códigos do sorteio anterior.
6. Em **Admins**, o responsável gera convites de uso único, válidos por 48 horas. Envie o código e o link de `/admin/ativar` à pessoa convidada. Revogar uma conta encerra suas sessões.

## Verificações

```sh
npm ci
npm run check
npm test
npm run build
```
