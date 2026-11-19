/**
 * Testes da pesquisa unificada (função public.pesquisar).
 *
 * Corre a migração num PostgreSQL em memória (PGlite) com as extensões
 * unaccent e pg_trgm, as tabelas da plataforma e as políticas RLS de
 * leitura pública, e faz as pesquisas como visitante anónimo (anon),
 * tal como o site público.
 *
 *   npm test
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

const PASTA = join(import.meta.dirname, '..', 'supabase', 'migrations');
const MIGRACAO = join(PASTA, '20261119_pesquisa_unificada.sql');
const PRIVACIDADE = join(PASTA, '20261119_utilizadores_privacidade.sql');

const ANA = '00000000-0000-0000-0000-00000000000a';
const RUI = '00000000-0000-0000-0000-00000000000b';
const SEM_PUBLICADOS = '00000000-0000-0000-0000-00000000000c';

let db;

/** Pesquisa como visitante anónimo do site público. */
async function pesquisar(termo, limite) {
  await db.exec('set role anon');
  try {
    const { rows } = limite === undefined
      ? await db.query('select * from pesquisar($1)', [termo])
      : await db.query('select * from pesquisar($1, $2)', [termo, limite]);
    return rows;
  } finally {
    await db.exec('reset role');
  }
}

const doTipo = (rows, tipo) => rows.filter(r => r.tipo === tipo);
const titulos = (rows, tipo) => doTipo(rows, tipo).map(r => r.titulo);

before(async () => {
  db = new PGlite({ extensions: { unaccent, pg_trgm } });

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    alter default privileges in schema public grant select on tables to anon, authenticated;

    create table entidade (id_entidade bigint primary key, nome text, tipo text, slug text);
    create table programa (id_programa bigint primary key, nome text, codigo text, descricao text,
                           id_entidade bigint references entidade);
    create table modulo (id_modulo bigint primary key, nome text, codigo text, descricao text,
                         ano int, semestre int, id_programa bigint references programa);
    create table projetos (id_projetos bigint primary key, titulo text, descricao text, autores text,
                           projeto_url text, id_modulo bigint references modulo);
    create table utilizadores (id_utilizadores uuid primary key, nome text, email text);
    create table media_items (id_media_items bigint primary key, titulo text, url text, tipo text,
                              status text, id_autor uuid references utilizadores,
                              id_modulo bigint references modulo);

    -- Leitura pública como no Supabase; media_items só aprovado ou do próprio autor
    alter table entidade enable row level security;
    alter table programa enable row level security;
    alter table modulo enable row level security;
    alter table projetos enable row level security;
    alter table utilizadores enable row level security;
    alter table media_items enable row level security;
    create policy leitura on entidade for select using (true);
    create policy leitura on programa for select using (true);
    create policy leitura on modulo for select using (true);
    create policy leitura on projetos for select using (true);
    create policy leitura on utilizadores for select using (true);
    create policy leitura on media_items for select
      using (status is null or status = 'aprovado' or id_autor = auth.uid());

    insert into entidade values (1, 'IPVC', 'escola', 'ipvc');
    insert into programa values
      (1, 'Engenharia da Computação Gráfica e Multimédia', 'ECGM', 'Licenciatura em computação gráfica', 1);
    insert into modulo values
      (1, 'Modelação 3D', 'MOD3D', 'Modelação de personagens e objetos', 2, 1, 1),
      (2, 'Animação', 'ANIM', 'Animação por keyframes', 2, 2, 1),
      (3, 'Programação Web', 'PW', null, 1, 2, 1);
    insert into projetos values
      (10, 'Robô industrial', 'Robô com braço articulado', 'Marta Dias, Tiago Reis e Ana Aluna',
           'https://exemplo.pt/robo.png', 1),
      (11, 'Curta de animação', 'Curta-metragem em stop motion', 'Tiago Reis', 'https://exemplo.pt/curta.mp4', 2),
      (12, 'Loja online', 'Site com carrinho de compras', 'Rui Costa; Inês Lopes', null, 3);
    insert into utilizadores values
      ('${ANA}', 'Ana Aluna', 'ana@teste.pt'),
      ('${RUI}', 'Rui Aluno', 'rui@teste.pt'),
      ('${SEM_PUBLICADOS}', 'Zé Pendente', 'ze@teste.pt');
    insert into media_items values
      (1, 'Personagem low-poly', 'https://exemplo.pt/personagem.jpg', 'imagem_externa', 'aprovado', '${ANA}', 1),
      (2, 'Ciclo de caminhada', 'https://exemplo.pt/ciclo.mp4', 'video', 'aprovado', '${RUI}', 2),
      (3, 'Rascunho secreto', 'https://exemplo.pt/r.jpg', 'imagem_externa', 'pendente', '${SEM_PUBLICADOS}', 1),
      (4, 'Dragão rejeitado', 'https://exemplo.pt/d.jpg', 'imagem_externa', 'rejeitado', '${SEM_PUBLICADOS}', 1),
      (5, 'Personagem pessoal', 'https://exemplo.pt/p.jpg', 'imagem_externa', 'pessoal', '${ANA}', 1),
      (6, 'Logo do curso', 'https://exemplo.pt/logo.glb', 'logo3d', null, null, null);
  `);

  await db.exec(readFileSync(MIGRACAO, 'utf8'));
  await db.exec(readFileSync(PRIVACIDADE, 'utf8'));
});

describe('Migração', () => {
  it('pode ser corrida mais do que uma vez', async () => {
    await db.exec(readFileSync(MIGRACAO, 'utf8'));
  });
});

describe('Encontrar conteúdos', () => {
  it('ignora acentos e maiúsculas', async () => {
    assert.ok(titulos(await pesquisar('animacao'), 'disciplina').includes('Animação'));
    assert.ok(titulos(await pesquisar('MODELAÇÃO'), 'disciplina').includes('Modelação 3D'));
  });

  it('tolera erros de escrita', async () => {
    assert.ok(titulos(await pesquisar('modlação'), 'disciplina').includes('Modelação 3D'));
    assert.ok(titulos(await pesquisar('personajem'), 'trabalho').includes('Personagem low-poly'));
  });

  it('reconhece o plural e outras formas da palavra', async () => {
    assert.ok(titulos(await pesquisar('animações'), 'disciplina').includes('Animação'));
    assert.ok(titulos(await pesquisar('robôs'), 'projeto').includes('Robô industrial'));
  });

  it('procura na descrição e nos autores dos projetos', async () => {
    assert.deepEqual(titulos(await pesquisar('stop motion'), 'projeto'), ['Curta de animação']);
    assert.deepEqual(titulos(await pesquisar('Inês Lopes'), 'projeto'), ['Loja online']);
  });

  it('encontra programas', async () => {
    assert.deepEqual(titulos(await pesquisar('multimedia'), 'programa'),
      ['Engenharia da Computação Gráfica e Multimédia']);
  });

  it('põe primeiro o título igual ao termo', async () => {
    const rows = await pesquisar('animação');
    assert.equal(doTipo(rows, 'disciplina')[0].titulo, 'Animação');
  });
});

describe('Visibilidade', () => {
  it('mostra os trabalhos aprovados', async () => {
    assert.deepEqual(titulos(await pesquisar('caminhada'), 'trabalho'), ['Ciclo de caminhada']);
  });

  it('não mostra trabalhos pendentes, rejeitados ou pessoais', async () => {
    assert.equal(doTipo(await pesquisar('rascunho'), 'trabalho').length, 0);
    assert.equal(doTipo(await pesquisar('dragão'), 'trabalho').length, 0);
    assert.ok(!titulos(await pesquisar('personagem'), 'trabalho').includes('Personagem pessoal'));
  });

  it('não mostra autores sem trabalhos públicos', async () => {
    assert.equal(doTipo(await pesquisar('Zé Pendente'), 'autor').length, 0);
  });

  it('um visitante não consegue ler emails da tabela utilizadores', async () => {
    await db.exec('set role anon');
    try {
      await assert.rejects(db.query('select email from utilizadores'), /permission denied/);
      await assert.rejects(db.query('select * from utilizadores'), /permission denied/);
      const { rows } = await db.query('select id_utilizadores, nome from utilizadores');
      assert.equal(rows.length, 3);
    } finally {
      await db.exec('reset role');
    }
  });

  it('não devolve o email dos autores', async () => {
    const rows = await pesquisar('ana');
    assert.ok(!JSON.stringify(rows).includes('@teste.pt'));
  });
});

describe('Autores', () => {
  it('separa os nomes de projetos.autores (vírgula, ";" e " e ")', async () => {
    for (const nome of ['Marta Dias', 'Tiago Reis', 'Rui Costa', 'Inês Lopes']) {
      assert.deepEqual(titulos(await pesquisar(nome), 'autor'), [nome], nome);
    }
  });

  it('junta os projetos e os trabalhos aprovados do mesmo autor', async () => {
    const [ana] = doTipo(await pesquisar('Ana Aluna'), 'autor');
    assert.equal(ana.detalhe, '2 trabalhos');
    assert.deepEqual(ana.trabalhos.map(t => t.titulo).sort(), ['Personagem low-poly', 'Robô industrial']);
  });

  it('conta "1 trabalho" no singular', async () => {
    const [marta] = doTipo(await pesquisar('Marta Dias'), 'autor');
    assert.equal(marta.detalhe, '1 trabalho');
  });
});

describe('Links e miniaturas', () => {
  it('devolve o caminho de cada página', async () => {
    const rows = await pesquisar('robô');
    assert.equal(doTipo(rows, 'projeto')[0].caminho, '/ipvc/ecgm/1/10');
    assert.equal(doTipo(await pesquisar('ANIM'), 'disciplina')[0].caminho, '/ipvc/ecgm/2');
    assert.equal(doTipo(await pesquisar('caminhada'), 'trabalho')[0].caminho, '/ipvc/ecgm/2?ver=2');
    assert.equal(doTipo(await pesquisar('ECGM'), 'programa')[0].caminho, '/ipvc/ecgm');
  });

  it('dá miniatura só a imagens', async () => {
    assert.equal(doTipo(await pesquisar('robô'), 'projeto')[0].imagem, 'https://exemplo.pt/robo.png');
    assert.equal(doTipo(await pesquisar('curta'), 'projeto')[0].imagem, null);
    assert.equal(doTipo(await pesquisar('caminhada'), 'trabalho')[0].imagem, null);
  });

  it('indica a disciplina, o ano e o semestre', async () => {
    assert.equal(doTipo(await pesquisar('Modelação 3D'), 'disciplina')[0].detalhe, 'ECGM · 2.º ano · 1.º semestre');
    assert.equal(doTipo(await pesquisar('robô'), 'projeto')[0].detalhe, 'Modelação 3D · ECGM');
  });
});

describe('Entradas difíceis', () => {
  it('termos com menos de 2 letras não devolvem nada', async () => {
    assert.equal((await pesquisar('a')).length, 0);
    assert.equal((await pesquisar('   ')).length, 0);
    assert.equal((await pesquisar(null)).length, 0);
  });

  it('caracteres especiais não dão erro', async () => {
    for (const termo of ["%", "_%_", "o'neil", 'a & b | !c', '"robô', '(((', '\\', 'robô:*']) {
      await pesquisar(termo);
    }
  });

  it('um termo sem resultados devolve uma lista vazia', async () => {
    assert.equal((await pesquisar('xylofone quântico')).length, 0);
  });

  it('respeita o limite de resultados por tipo', async () => {
    const rows = await pesquisar('ec', 1);
    for (const tipo of ['projeto', 'trabalho', 'disciplina', 'programa', 'autor']) {
      assert.ok(doTipo(rows, tipo).length <= 1, tipo);
    }
  });
});
