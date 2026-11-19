-- ════════════════════════════════════════════════════════════════════
-- Pesquisa unificada
--
-- Uma só pesquisa para toda a plataforma: projetos, trabalhos dos
-- alunos, disciplinas (módulos), programas e autores.
--
-- · Ignora maiúsculas e acentos ("animacao" encontra "Animação").
-- · Tolera erros de escrita ("modlação" encontra "Modelação 3D"),
--   por semelhança de trigramas (pg_trgm).
-- · Reconhece variações das palavras em português ("animações"
--   encontra "Animação"), com o Full-Text Search do PostgreSQL.
-- · Só devolve conteúdo público: os trabalhos dos alunos aparecem
--   apenas depois de aprovados, e um autor só aparece se tiver
--   trabalhos públicos.
--
-- Uso (Supabase):  supabase.rpc('pesquisar', { termo: 'animação' })
-- ════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- O site corre as pesquisas como anon/authenticated (no Supabase já têm este acesso)
grant usage on schema extensions to anon, authenticated;

-- ─── Texto normalizado: minúsculas e sem acentos ──────────────────

create or replace function public.normalizar(texto text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select lower(unaccent('unaccent'::regdictionary, coalesce(texto, '')))
$$;

-- ─── Pesquisa ─────────────────────────────────────────────────────
-- Devolve no máximo `limite` resultados de cada tipo, do mais para o
-- menos relevante. Termos com menos de 2 letras não devolvem nada.
--
-- Relevância (soma):
--   · título igual, a começar por, ou a conter o termo: 1,0 / 0,8 / 0,6
--   · semelhança do termo com o título (0 a 1)
--   · semelhança com o resto do texto (descrição, autores), com peso 0,3
--   · pontuação do Full-Text Search

create or replace function public.pesquisar(termo text, limite integer default 8)
returns table (
  tipo       text,     -- projeto | trabalho | disciplina | programa | autor
  titulo     text,
  detalhe    text,     -- onde está (disciplina · programa) ou nº de trabalhos
  autores    text,
  caminho    text,     -- link para a página do resultado
  imagem     text,     -- miniatura, quando o conteúdo é uma imagem
  relevancia real,
  trabalhos  jsonb     -- só para autores: [{ titulo, caminho }]
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with
  q as (
    select public.normalizar(btrim(termo))                as t,
           websearch_to_tsquery('portuguese', btrim(termo)) as tsq
     where length(btrim(coalesce(termo, ''))) >= 2
  ),

  -- Cada disciplina com o caminho da sua página
  mods as (
    select m.id_modulo, m.nome, m.codigo, m.descricao, m.ano, m.semestre,
           p.nome   as programa_nome,
           p.codigo as programa_codigo,
           '/' || e.slug || '/' || lower(coalesce(p.codigo, '')) || '/' || m.id_modulo as caminho
      from modulo m
      join programa p on p.id_programa = m.id_programa
      join entidade e on e.id_entidade = p.id_entidade
  ),

  -- Trabalhos dos alunos já aprovados (galeria da disciplina)
  trabalhos_publicos as (
    select mi.id_media_items, mi.titulo, mi.tipo as tipo_media, mi.url,
           u.nome as autor, mo.nome as modulo_nome, mo.programa_codigo,
           mo.caminho || '?ver=' || mi.id_media_items as caminho
      from media_items mi
      join mods mo on mo.id_modulo = mi.id_modulo
      left join utilizadores u on u.id_utilizadores = mi.id_autor
     where mi.status = 'aprovado'
       and nullif(btrim(mi.titulo), '') is not null
  ),

  -- Tudo o que se pode encontrar: `principal` é o título, `resto` o texto secundário
  docs as (
    select 'projeto'::text as tipo,
           pr.titulo,
           concat_ws(' · ', mo.nome, mo.programa_codigo) as detalhe,
           pr.autores,
           mo.caminho || '/' || pr.id_projetos as caminho,
           case when pr.projeto_url ~* '\.(png|jpe?g|webp|gif|avif)(\?|$)' then pr.projeto_url end as imagem,
           pr.titulo as principal,
           concat_ws(' ', pr.descricao, pr.autores) as resto
      from projetos pr
      join mods mo on mo.id_modulo = pr.id_modulo

    union all
    select 'trabalho', tp.titulo,
           concat_ws(' · ', tp.modulo_nome, tp.programa_codigo),
           tp.autor, tp.caminho,
           case when tp.tipo_media in ('imagem', 'imagem_externa', 'gif_gerado')
                  or tp.url ~* '\.(png|jpe?g|webp|gif|avif)(\?|$)' then tp.url end,
           tp.titulo, coalesce(tp.autor, '')
      from trabalhos_publicos tp

    union all
    select 'disciplina', mo.nome,
           concat_ws(' · ', mo.programa_codigo,
                     case when mo.ano is not null then mo.ano || '.º ano' end,
                     case when mo.semestre is not null then mo.semestre || '.º semestre' end),
           null, mo.caminho, null,
           mo.nome, concat_ws(' ', mo.codigo, mo.descricao)
      from mods mo

    union all
    select 'programa', p.nome, concat_ws(' · ', p.codigo, e.nome),
           null, '/' || e.slug || '/' || lower(coalesce(p.codigo, '')), null,
           p.nome, concat_ws(' ', p.codigo, p.descricao)
      from programa p
      join entidade e on e.id_entidade = p.id_entidade
  ),

  -- Autores: nomes em `projetos.autores` (separados por vírgula, ";" ou " e ")
  -- e alunos com trabalhos aprovados. O mesmo nome conta como um só autor.
  autoria as (
    select btrim(a.nome) as nome, pr.titulo, mo.caminho || '/' || pr.id_projetos as caminho
      from projetos pr
      join mods mo on mo.id_modulo = pr.id_modulo
     cross join lateral regexp_split_to_table(coalesce(pr.autores, ''), '\s*[,;]\s*|\s+e\s+') as a(nome)
     where btrim(a.nome) <> ''
    union all
    select btrim(tp.autor), tp.titulo, tp.caminho
      from trabalhos_publicos tp
     where nullif(btrim(tp.autor), '') is not null
  ),
  autores_agrupados as (
    select public.normalizar(nome) as chave,
           min(nome)               as nome,
           count(*)                as n,
           jsonb_agg(jsonb_build_object('titulo', titulo, 'caminho', caminho) order by titulo) as trabalhos
      from autoria
     group by 1
  ),

  candidatos as (
    select d.tipo, d.titulo, d.detalhe, d.autores, d.caminho, d.imagem, null::jsonb as trabalhos,
           public.normalizar(d.principal) as principal_n,
           public.normalizar(d.resto)     as resto_n,
           to_tsvector('portuguese', coalesce(d.principal, '') || ' ' || coalesce(d.resto, '')) as tsv
      from docs d
    union all
    select 'autor', a.nome, a.n || case when a.n = 1 then ' trabalho' else ' trabalhos' end,
           null, null, null, a.trabalhos,
           a.chave, '', to_tsvector('simple', a.chave)
      from autores_agrupados a
  ),

  pontuados as (
    select c.tipo, c.titulo, c.detalhe, c.autores, c.caminho, c.imagem, c.trabalhos,
           ( case when c.principal_n = q.t               then 1.0
                  when starts_with(c.principal_n, q.t)   then 0.8
                  when strpos(c.principal_n, q.t) > 0    then 0.6
                  else 0 end
             + word_similarity(q.t, c.principal_n)
             + 0.3 * word_similarity(q.t, c.resto_n)
             + ts_rank(c.tsv, q.tsq)
           )::real as relevancia
      from candidatos c, q
     where strpos(c.principal_n || ' ' || c.resto_n, q.t) > 0
        or word_similarity(q.t, c.principal_n) >= 0.5
        or word_similarity(q.t, c.resto_n)     >= 0.6
        or c.tsv @@ q.tsq
  ),

  ordenados as (
    select p.*, row_number() over (partition by p.tipo order by p.relevancia desc, p.titulo) as pos
      from pontuados p
  )

  select o.tipo, o.titulo, o.detalhe, o.autores, o.caminho, o.imagem, o.relevancia, o.trabalhos
    from ordenados o
   where o.pos <= greatest(1, least(coalesce(limite, 8), 50))
   order by o.relevancia desc, o.titulo
$$;

grant execute on function public.normalizar(text)          to anon, authenticated;
grant execute on function public.pesquisar(text, integer)  to anon, authenticated;
