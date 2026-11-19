-- ════════════════════════════════════════════════════════════════════
-- Privacidade dos utilizadores
--
-- A tabela `utilizadores` tinha leitura pública: qualquer visitante,
-- sem login, conseguia ler o email de todos os utilizadores com a
-- chave pública do site (anon).
--
-- O site público só precisa do nome (autor de um trabalho na galeria
-- e na pesquisa). Os visitantes passam a ler apenas o id e o nome.
-- Quem tem sessão iniciada (painéis do aluno, gestor e administrador)
-- não é afetado.
-- ════════════════════════════════════════════════════════════════════

revoke select on public.utilizadores from anon;
grant  select (id_utilizadores, nome) on public.utilizadores to anon;
