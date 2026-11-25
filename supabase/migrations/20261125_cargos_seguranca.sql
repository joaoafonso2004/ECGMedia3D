-- ════════════════════════════════════════════════════════════════════
-- Cargos: quem pode dar e tirar papéis (tabela tipo_utilizador)
--
-- Antes, qualquer gestor podia inserir linhas em tipo_utilizador com
-- qualquer role, incluindo 'superadmin' para si próprio. Agora:
--   · superadmin: dá e tira qualquer cargo;
--   · gestor de disciplina: só associa e desassocia alunos ('utilizador')
--     nas disciplinas que gere (é o que a página Alunos do gestor faz);
--   · cada conta nova: só pode dar a si própria o role 'utilizador',
--     sem disciplina (é o que o registo faz).
-- Alterar uma linha existente fica só para o superadmin.
--
-- Pode ser corrida mais do que uma vez.
-- ════════════════════════════════════════════════════════════════════

create or replace function public.e_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tipo_utilizador
     where id_utilizador = auth.uid() and role = 'superadmin'
  );
$$;

grant execute on function public.e_superadmin() to anon, authenticated;

-- O utilizador com sessão iniciada é gestor desta disciplina?
create or replace function public.gere_modulo(p_modulo bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tipo_utilizador
     where id_utilizador = auth.uid()
       and role = 'gestor_disciplina'
       and id_modulo = p_modulo
  );
$$;

grant execute on function public.gere_modulo(bigint) to authenticated;

alter table public.tipo_utilizador enable row level security;

-- Tira todas as regras de escrita que existam (os nomes podem variar entre
-- bases de dados); as regras são somadas, por isso uma antiga mais larga
-- anularia as novas
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'tipo_utilizador' and cmd <> 'SELECT'
  loop
    execute format('drop policy %I on public.tipo_utilizador', p.policyname);
  end loop;
end $$;

-- Leitura: igual ao que já existia (precisa de sessão iniciada)
drop policy if exists "tipo_utilizador_leitura" on public.tipo_utilizador;
create policy "tipo_utilizador_leitura" on public.tipo_utilizador
  for select to authenticated using (true);

create policy "tipo_utilizador_insert" on public.tipo_utilizador
  for insert to authenticated
  with check (
    public.e_superadmin()
    or (role = 'utilizador' and id_modulo is not null and public.gere_modulo(id_modulo))
    or (role = 'utilizador' and id_modulo is null and id_utilizador = auth.uid())
  );

create policy "tipo_utilizador_update" on public.tipo_utilizador
  for update to authenticated
  using (public.e_superadmin())
  with check (public.e_superadmin());

create policy "tipo_utilizador_delete" on public.tipo_utilizador
  for delete to authenticated
  using (
    public.e_superadmin()
    or (role = 'utilizador' and id_modulo is not null and public.gere_modulo(id_modulo))
  );
