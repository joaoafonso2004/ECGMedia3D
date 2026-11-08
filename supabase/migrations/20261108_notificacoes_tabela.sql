-- ════════════════════════════════════════════════════════════════════
-- Notificações — tabela, índices e permissões (RLS)
-- Correr no SQL Editor do Supabase.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.notificacoes (
  id_notificacao  bigint generated always as identity primary key,
  id_destinatario uuid not null references public.utilizadores (id_utilizadores) on delete cascade,
  tipo            text not null check (tipo in (
                    'submissao_pendente',   -- gestor: um aluno pediu aprovação
                    'conteudo_aprovado',    -- aluno: o conteúdo foi aprovado
                    'conteudo_rejeitado',   -- aluno: o conteúdo foi rejeitado
                    'conteudo_removido'     -- aluno: o conteúdo saiu da galeria
                  )),
  titulo          text not null,
  mensagem        text,
  link            text,
  id_media_items  bigint references public.media_items (id_media_items) on delete cascade,
  lida            boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.notificacoes is
  'Notificações do painel (gestores, administradores e alunos). Criadas por triggers na tabela media_items.';

-- Lista do sino: últimas notificações de um utilizador e contagem das não lidas
create index if not exists notificacoes_destinatario_idx
  on public.notificacoes (id_destinatario, created_at desc);

create index if not exists notificacoes_nao_lidas_idx
  on public.notificacoes (id_destinatario)
  where lida = false;

-- ─── Permissões ────────────────────────────────────────────────────
-- Cada utilizador só vê, marca como lida e apaga as suas notificações.
-- Não há política de INSERT: as notificações só são criadas pelos
-- triggers (função security definer), nunca diretamente pelo browser.
alter table public.notificacoes enable row level security;

drop policy if exists "notificacoes_select_proprias" on public.notificacoes;
create policy "notificacoes_select_proprias"
  on public.notificacoes for select
  to authenticated
  using (id_destinatario = auth.uid());

drop policy if exists "notificacoes_update_proprias" on public.notificacoes;
create policy "notificacoes_update_proprias"
  on public.notificacoes for update
  to authenticated
  using (id_destinatario = auth.uid())
  with check (id_destinatario = auth.uid());

drop policy if exists "notificacoes_delete_proprias" on public.notificacoes;
create policy "notificacoes_delete_proprias"
  on public.notificacoes for delete
  to authenticated
  using (id_destinatario = auth.uid());

-- O browser só pode alterar o campo "lida"
revoke insert, update on public.notificacoes from anon, authenticated;
grant select, delete on public.notificacoes to authenticated;
grant update (lida) on public.notificacoes to authenticated;
