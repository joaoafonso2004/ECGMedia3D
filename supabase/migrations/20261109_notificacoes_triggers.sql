-- ════════════════════════════════════════════════════════════════════
-- Notificações — criação automática a partir do fluxo de aprovação
--
-- O estado do conteúdo está em media_items.status:
--   pessoal → pendente (aluno pede aprovação) → aprovado | rejeitado
--   aprovado → pessoal (gestor remove da galeria)
--
-- Quem é avisado:
--   • pendente            → gestores da disciplina (tipo_utilizador.role = 'gestor_disciplina').
--                           Se a disciplina não tiver gestor, avisa os superadmins,
--                           para nenhuma submissão ficar esquecida.
--   • aprovado/rejeitado  → o autor do conteúdo
--   • aprovado → pessoal  → o autor do conteúdo
-- Quando um pedido deixa de estar pendente, as notificações desse pedido
-- que os outros gestores ainda não leram ficam marcadas como lidas.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.notificar_estado_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_titulo   text := coalesce(nullif(trim(new.titulo), ''), 'Sem título');
  v_autor    text;
  v_modulo   text;
  v_avisados integer;
begin
  -- Só interessa quando o estado muda (ou quando o conteúdo já nasce pendente)
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select nome into v_autor  from utilizadores where id_utilizadores = new.id_autor;
  select nome into v_modulo from modulo       where id_modulo       = new.id_modulo;

  -- ─── 1. Pedido de aprovação → gestores da disciplina ─────────────
  if new.status = 'pendente' then
    insert into notificacoes (id_destinatario, tipo, titulo, mensagem, link, id_media_items)
    select distinct t.id_utilizador,
           'submissao_pendente',
           'Novo pedido de aprovação',
           coalesce(v_autor, 'Um aluno') || ' submeteu "' || v_titulo || '"'
             || coalesce(' em ' || v_modulo, '') || '.',
           '/gestor/aprovacoes',
           new.id_media_items
      from tipo_utilizador t
     where t.role = 'gestor_disciplina'
       and t.id_modulo = new.id_modulo
       and t.id_utilizador is distinct from new.id_autor;

    get diagnostics v_avisados = row_count;

    if v_avisados = 0 then
      insert into notificacoes (id_destinatario, tipo, titulo, mensagem, link, id_media_items)
      select distinct t.id_utilizador,
             'submissao_pendente',
             'Pedido de aprovação sem gestor',
             coalesce(v_autor, 'Um aluno') || ' submeteu "' || v_titulo || '"'
               || coalesce(' em ' || v_modulo, '')
               || ', mas a disciplina não tem gestor atribuído.',
             '/gestor/aprovacoes',
             new.id_media_items
        from tipo_utilizador t
       where t.role = 'superadmin';
    end if;

    return new;
  end if;

  if tg_op <> 'UPDATE' then
    return new;
  end if;

  -- O pedido foi decidido (ou cancelado): limpa os avisos dos outros gestores
  if old.status = 'pendente' then
    update notificacoes
       set lida = true
     where id_media_items = new.id_media_items
       and tipo = 'submissao_pendente'
       and lida = false;
  end if;

  if new.id_autor is null then
    return new;
  end if;

  -- ─── 2. Decisão do gestor → autor ────────────────────────────────
  if old.status = 'pendente' and new.status = 'aprovado' then
    insert into notificacoes (id_destinatario, tipo, titulo, mensagem, link, id_media_items)
    values (new.id_autor, 'conteudo_aprovado', 'Conteúdo aprovado',
            '"' || v_titulo || '" foi aprovado' || coalesce(' em ' || v_modulo, '')
              || ' e já está visível na galeria.',
            '/utilizador/biblioteca', new.id_media_items);

  elsif old.status = 'pendente' and new.status = 'rejeitado' then
    insert into notificacoes (id_destinatario, tipo, titulo, mensagem, link, id_media_items)
    values (new.id_autor, 'conteudo_rejeitado', 'Conteúdo não aprovado',
            '"' || v_titulo || '" não foi aprovado' || coalesce(' em ' || v_modulo, '')
              || '. Podes rever o trabalho e voltar a submeter.',
            '/utilizador/biblioteca', new.id_media_items);

  -- ─── 3. Removido da galeria → autor ──────────────────────────────
  elsif old.status = 'aprovado' and new.status = 'pessoal' then
    insert into notificacoes (id_destinatario, tipo, titulo, mensagem, link, id_media_items)
    values (new.id_autor, 'conteudo_removido', 'Conteúdo removido da galeria',
            '"' || v_titulo || '" foi removido da galeria'
              || coalesce(' de ' || v_modulo, '') || ' e voltou à tua biblioteca.',
            '/utilizador/biblioteca', new.id_media_items);
  end if;

  return new;
end;
$$;

-- A função só é chamada pelo trigger
revoke execute on function public.notificar_estado_media() from public, anon, authenticated;

drop trigger if exists media_items_notificar_estado on public.media_items;
create trigger media_items_notificar_estado
  after insert or update of status on public.media_items
  for each row
  execute function public.notificar_estado_media();

-- ─── Tempo real ────────────────────────────────────────────────────
-- Permite ao painel receber notificações novas sem recarregar a página.
-- O Supabase Realtime aplica as políticas RLS: cada utilizador só recebe as suas.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notificacoes'
  ) then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end $$;
