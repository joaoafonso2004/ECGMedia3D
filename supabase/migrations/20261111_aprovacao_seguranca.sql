-- ════════════════════════════════════════════════════════════════════
-- Fluxo de aprovação — regras na base de dados
--
-- 1. Só quem pode decidir um pedido o pode aprovar ou rejeitar:
--    o superadmin ou um gestor da disciplina do conteúdo.
--    Antes, a regra existia apenas na interface: um aluno podia
--    aprovar o próprio trabalho chamando a API diretamente.
-- 2. Quando é o próprio autor a retirar um conteúdo da galeria,
--    não recebe a notificação "removido da galeria".
-- ════════════════════════════════════════════════════════════════════

-- ─── 1. Proteção: aprovar/rejeitar ─────────────────────────────────

create or replace function public.validar_decisao_aprovacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Pedidos feitos pelo site (utilizador autenticado). O SQL Editor e a
  -- service_role (auth.uid() nulo) não são afetados.
  if auth.uid() is null then
    return new;
  end if;

  if new.status in ('aprovado', 'rejeitado')
     and new.status is distinct from (case when tg_op = 'UPDATE' then old.status end)
     and not exists (
       select 1
         from tipo_utilizador t
        where t.id_utilizador = auth.uid()
          and (t.role = 'superadmin'
               or (t.role = 'gestor_disciplina' and t.id_modulo = new.id_modulo))
     )
  then
    raise exception 'Só um gestor desta disciplina pode aprovar ou rejeitar este conteúdo.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.validar_decisao_aprovacao() from public, anon, authenticated;

drop trigger if exists media_items_validar_decisao on public.media_items;
create trigger media_items_validar_decisao
  before insert or update of status on public.media_items
  for each row
  execute function public.validar_decisao_aprovacao();

-- ─── 2. Notificações: não avisar o autor de uma ação dele próprio ──

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
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select nome into v_autor  from utilizadores where id_utilizadores = new.id_autor;
  select nome into v_modulo from modulo       where id_modulo       = new.id_modulo;

  -- Pedido de aprovação → gestores da disciplina (ou superadmins, se não houver gestor)
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

  if old.status = 'pendente' then
    update notificacoes
       set lida = true
     where id_media_items = new.id_media_items
       and tipo = 'submissao_pendente'
       and lida = false;
  end if;

  -- Sem autor, ou foi o próprio autor que mudou o estado: não há a quem avisar
  if new.id_autor is null or new.id_autor = auth.uid() then
    return new;
  end if;

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

revoke execute on function public.notificar_estado_media() from public, anon, authenticated;
