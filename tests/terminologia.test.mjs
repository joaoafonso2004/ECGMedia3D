/**
 * Testes da terminologia configurável.
 *
 * 1. Base de dados: a migração corre num PostgreSQL em memória (PGlite) com
 *    os roles do Supabase (anon/authenticated), auth.uid() e RLS.
 * 2. src/lib/terminologia.js: precedência dos termos e concordância das frases.
 *
 *   npm test
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import {
  PADRAO, resolverTermos, getTermos,
  contar, novo, nenhum, nenhumEncontrado, ver, verUm, procurar, publicados, oTermo, doTermo, aoTermo, nesteTermo, minuscula,
} from '../src/lib/terminologia.js';

const MIGRACAO = join(import.meta.dirname, '..', 'supabase', 'migrations', '20261119_terminologia.sql');

const ADMIN  = '00000000-0000-0000-0000-00000000000f';
const GESTOR = '00000000-0000-0000-0000-0000000000a1';
const ALUNO  = '00000000-0000-0000-0000-00000000000a';

let db;

async function como(uid, sql, params) {
  await db.exec(uid
    ? `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`
    : `set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

const termoDb = async (tipo, nivel, idioma = 'pt') => (await db.query(
  `select singular, plural, genero from terminologia
    where tipo_entidade is not distinct from $1 and id_entidade is null and nivel = $2 and idioma = $3`,
  [tipo, nivel, idioma])).rows[0];

/* ─── Base de dados ────────────────────────────────────────────── */

before(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;

    create table entidade (id_entidade bigint primary key, nome text, tipo text, slug text);
    create table tipo_utilizador (id_utilizador uuid, role text);
    insert into entidade values (1, 'IPVC', 'escola', 'ipvc'), (2, 'Câmara Municipal de Viana', 'empresa', 'cmv');
    insert into tipo_utilizador values ('${ADMIN}', 'superadmin'), ('${GESTOR}', 'gestor'), ('${ALUNO}', 'utilizador');
  `);
  await db.exec(readFileSync(MIGRACAO, 'utf8'));
});

describe('Migração da terminologia', () => {
  it('pode ser corrida mais do que uma vez e não apaga alterações do administrador', async () => {
    await db.query(`update terminologia set singular = 'Licenciatura', plural = 'Licenciaturas', genero = 'f'
                     where tipo_entidade = 'escola' and nivel = 'programa' and idioma = 'pt'`);
    await db.exec(readFileSync(MIGRACAO, 'utf8'));
    assert.deepEqual(await termoDb('escola', 'programa'), { singular: 'Licenciatura', plural: 'Licenciaturas', genero: 'f' });
    await db.query(`update terminologia set singular = 'Curso', plural = 'Cursos', genero = 'm'
                     where tipo_entidade = 'escola' and nivel = 'programa' and idioma = 'pt'`);
  });

  it('cria a predefinição dos 4 níveis em PT e EN', async () => {
    const { rows } = await db.query(
      `select idioma, count(*)::int as n from terminologia
        where tipo_entidade is null and id_entidade is null group by idioma order by idioma`);
    assert.deepEqual(rows, [{ idioma: 'en', n: 4 }, { idioma: 'pt', n: 4 }]);
  });

  it('a predefinição da base de dados é igual à do código', async () => {
    for (const idioma of ['pt', 'en']) {
      for (const [nivel, t] of Object.entries(PADRAO[idioma])) {
        assert.deepEqual(await termoDb(null, nivel, idioma), t, `${idioma}/${nivel}`);
      }
    }
  });

  it('a empresa tem Departamentos e Serviços', async () => {
    assert.equal((await termoDb('empresa', 'programa')).plural, 'Departamentos');
    assert.equal((await termoDb('empresa', 'modulo')).plural, 'Serviços');
  });

  it('não aceita o mesmo termo duas vezes (também na predefinição, com nulos)', async () => {
    await assert.rejects(db.query(
      `insert into terminologia (tipo_entidade, idioma, nivel, singular, plural) values (null, 'pt', 'programa', 'X', 'Xs')`),
      /terminologia_unica/);
  });

  it('rejeita valores inválidos', async () => {
    const invalidos = [
      `(null, 1, 'pt', 'programa', 'X', 'Xs', 'm')`.replace('null, 1', `'escola', 1`), // tipo e entidade ao mesmo tempo
      `('escola', null, 'pt', 'curso', 'X', 'Xs', 'm')`,     // nível desconhecido
      `('escola', null, 'fr', 'programa', 'X', 'Xs', 'm')`,  // idioma não suportado
      `('escola', null, 'pt', 'programa', ' ', 'Xs', 'm')`,  // singular vazio
      `('escola', null, 'pt', 'programa', 'X', 'Xs', 'n')`,  // género inválido
      `('Escola', null, 'pt', 'programa', 'X', 'Xs', 'm')`,  // tipo tem de estar em minúsculas
    ];
    for (const v of invalidos) {
      await assert.rejects(db.query(
        `insert into terminologia (tipo_entidade, id_entidade, idioma, nivel, singular, plural, genero) values ${v}`), v);
    }
  });

  it('atualiza a data da última alteração', async () => {
    await db.query(`update terminologia set atualizado_em = '2000-01-01' where tipo_entidade = 'hospital' and nivel = 'modulo' and idioma = 'pt'`);
    const { rows } = await db.query(
      `select atualizado_em > now() - interval '1 minute' as recente from terminologia
        where tipo_entidade = 'hospital' and nivel = 'modulo' and idioma = 'pt'`);
    assert.equal(rows[0].recente, true);
  });
});

describe('Permissões da terminologia (RLS)', () => {
  it('qualquer visitante lê os termos', async () => {
    const { rows } = await como(null, `select count(*)::int as n from terminologia`);
    assert.ok(rows[0].n >= 8);
  });

  it('visitantes, alunos e gestores não alteram os termos', async () => {
    for (const quem of [null, ALUNO, GESTOR]) {
      if (quem === null) {
        await assert.rejects(como(null,
          `insert into terminologia (tipo_entidade, nivel, singular, plural) values ('museu', 'programa', 'Sala', 'Salas')`));
      } else {
        await assert.rejects(como(quem,
          `insert into terminologia (tipo_entidade, nivel, singular, plural) values ('museu', 'programa', 'Sala', 'Salas')`),
          /row-level security/);
        const { rows } = await como(quem,
          `update terminologia set singular = 'Hack' where tipo_entidade = 'escola' returning 1`);
        assert.equal(rows.length, 0, `update de ${quem}`);
        const apagadas = await como(quem, `delete from terminologia returning 1`);
        assert.equal(apagadas.rows.length, 0, `delete de ${quem}`);
      }
    }
    assert.equal((await termoDb('escola', 'programa')).singular, 'Curso');
  });

  it('o superadmin cria, altera e apaga termos', async () => {
    await como(ADMIN, `insert into terminologia (tipo_entidade, nivel, singular, plural, genero)
                       values ('museu', 'programa', 'Sala', 'Salas', 'f')`);
    await como(ADMIN, `update terminologia set singular = 'Galeria', plural = 'Galerias'
                        where tipo_entidade = 'museu' and nivel = 'programa'`);
    assert.equal((await termoDb('museu', 'programa')).singular, 'Galeria');
    await como(ADMIN, `delete from terminologia where tipo_entidade = 'museu'`);
    assert.equal(await termoDb('museu', 'programa'), undefined);
  });

  it('o "Guardar" do painel (upsert) atualiza em vez de duplicar, também na predefinição', async () => {
    // O mesmo SQL que o PostgREST gera para upsert(rows, { onConflict: 'tipo_entidade,id_entidade,idioma,nivel' })
    const upsert = (tipo, singular) => como(ADMIN,
      `insert into terminologia (tipo_entidade, id_entidade, idioma, nivel, singular, plural, genero)
       values ($1, null, 'pt', 'projeto', $2, $2 || 's', 'm')
       on conflict (tipo_entidade, id_entidade, idioma, nivel)
       do update set singular = excluded.singular, plural = excluded.plural, genero = excluded.genero
       returning id_terminologia`, [tipo, singular]);

    await upsert(null, 'Trabalho');
    await upsert('escola', 'Trabalho');
    await upsert('escola', 'Projeto');
    const { rows } = await db.query(
      `select tipo_entidade, singular from terminologia where nivel = 'projeto' and idioma = 'pt'
        and id_entidade is null and (tipo_entidade is null or tipo_entidade = 'escola') order by tipo_entidade nulls first`);
    assert.deepEqual(rows, [{ tipo_entidade: null, singular: 'Trabalho' }, { tipo_entidade: 'escola', singular: 'Projeto' }]);

    await upsert(null, 'Projeto');
    await db.query(`delete from terminologia where tipo_entidade = 'escola' and nivel = 'projeto'`);
  });

  it('o superadmin pode substituir termos só para uma entidade', async () => {
    await como(ADMIN, `insert into terminologia (id_entidade, nivel, singular, plural, genero)
                       values (1, 'programa', 'Licenciatura', 'Licenciaturas', 'f')`);
    const { rows } = await db.query(`select * from terminologia where idioma = 'pt'`);
    const ipvc = resolverTermos(rows, { id_entidade: 1, tipo: 'escola' });
    assert.equal(ipvc.programa.singular, 'Licenciatura');
    assert.equal(ipvc.modulo.singular, 'Disciplina'); // o resto vem do tipo
    await db.query(`delete from terminologia where id_entidade = 1`);
  });

  it('apagar a entidade apaga os seus termos', async () => {
    await db.query(`insert into entidade values (9, 'Temporária', 'escola', 'tmp')`);
    await db.query(`insert into terminologia (id_entidade, nivel, singular, plural) values (9, 'modulo', 'UC', 'UCs')`);
    await db.query(`delete from entidade where id_entidade = 9`);
    const { rows } = await db.query(`select 1 from terminologia where id_entidade = 9`);
    assert.equal(rows.length, 0);
  });
});

/* ─── src/lib/terminologia.js ──────────────────────────────────── */

const LINHAS = [
  { tipo_entidade: null,      id_entidade: null, idioma: 'pt', nivel: 'programa', singular: 'Programa',     plural: 'Programas',     genero: 'm' },
  { tipo_entidade: null,      id_entidade: null, idioma: 'pt', nivel: 'modulo',   singular: 'Disciplina',   plural: 'Disciplinas',   genero: 'f' },
  { tipo_entidade: 'escola',  id_entidade: null, idioma: 'pt', nivel: 'programa', singular: 'Curso',        plural: 'Cursos',        genero: 'm' },
  { tipo_entidade: 'empresa', id_entidade: null, idioma: 'pt', nivel: 'programa', singular: 'Departamento', plural: 'Departamentos', genero: 'm' },
  { tipo_entidade: 'empresa', id_entidade: null, idioma: 'pt', nivel: 'modulo',   singular: 'Serviço',      plural: 'Serviços',      genero: 'm' },
  { tipo_entidade: null,      id_entidade: 7,    idioma: 'pt', nivel: 'modulo',   singular: 'Unidade curricular', plural: 'Unidades curriculares', genero: 'f' },
  { tipo_entidade: null,      id_entidade: null, idioma: 'en', nivel: 'modulo',   singular: 'Course',       plural: 'Courses',       genero: 'm' },
];

describe('Precedência dos termos', () => {
  it('sem linhas usa a predefinição do código', () => {
    const t = resolverTermos([], { tipo: 'escola' });
    assert.equal(t.programa.singular, 'Programa');
    assert.equal(t.projeto.plural, 'Projetos');
  });

  it('o tipo da entidade substitui a predefinição', () => {
    assert.equal(resolverTermos(LINHAS, { tipo: 'escola' }).programa.singular, 'Curso');
    assert.equal(resolverTermos(LINHAS, { tipo: 'empresa' }).modulo.plural, 'Serviços');
  });

  it('o tipo é comparado sem maiúsculas nem espaços', () => {
    assert.equal(resolverTermos(LINHAS, { tipo: ' Empresa ' }).programa.singular, 'Departamento');
  });

  it('o que o tipo não define vem da predefinição', () => {
    assert.equal(resolverTermos(LINHAS, { tipo: 'escola' }).modulo.singular, 'Disciplina');
  });

  it('a entidade substitui o tipo, só para si', () => {
    assert.equal(resolverTermos(LINHAS, { id_entidade: 7, tipo: 'escola' }).modulo.singular, 'Unidade curricular');
    assert.equal(resolverTermos(LINHAS, { id_entidade: 8, tipo: 'escola' }).modulo.singular, 'Disciplina');
    assert.equal(resolverTermos(LINHAS, { id_entidade: '7', tipo: 'escola' }).modulo.singular, 'Unidade curricular');
  });

  it('um tipo desconhecido ou sem entidade usa a predefinição', () => {
    assert.equal(resolverTermos(LINHAS, { tipo: 'museu' }).programa.singular, 'Programa');
    assert.equal(resolverTermos(LINHAS, null).programa.singular, 'Programa');
  });

  it('cada idioma tem os seus termos', () => {
    const t = resolverTermos(LINHAS, { tipo: 'escola' }, 'en');
    assert.equal(t.modulo.singular, 'Course');
    assert.equal(t.programa.singular, 'Programme');
    assert.equal(t.programa.idioma, 'en');
  });

  it('um idioma não suportado usa PT', () => {
    assert.equal(resolverTermos(LINHAS, { tipo: 'escola' }, 'fr').programa.singular, 'Curso');
  });

  it('se a tabela não existir, getTermos devolve a predefinição sem falhar', async () => {
    const semTabela = { from: () => ({ select: () => ({ eq: async () => ({ data: null, error: { message: 'relation does not exist' } }) }) }) };
    const original = console.error;
    console.error = () => {};
    try {
      const t = await getTermos(semTabela, { tipo: 'escola' });
      assert.equal(t.programa.singular, 'Programa');
    } finally {
      console.error = original;
    }
  });
});

describe('Frases com concordância', () => {
  const pt = resolverTermos(LINHAS, { tipo: 'escola' });
  const empresa = resolverTermos(LINHAS, { tipo: 'empresa' });
  const en = resolverTermos(LINHAS, { tipo: 'escola' }, 'en');

  it('contar usa singular e plural', () => {
    assert.equal(contar(pt.programa, 1), '1 curso');
    assert.equal(contar(pt.programa, 3), '3 cursos');
    assert.equal(contar(pt.modulo, 0), '0 disciplinas');
  });

  it('o género muda novo, nenhum, artigos e contrações', () => {
    assert.equal(novo(pt.programa), 'Novo curso');
    assert.equal(novo(pt.modulo), 'Nova disciplina');
    assert.equal(nenhum(pt.modulo), 'Nenhuma disciplina');
    assert.equal(nenhum(empresa.modulo), 'Nenhum serviço');
    assert.equal(oTermo(pt.modulo), 'a disciplina');
    assert.equal(doTermo(pt.programa), 'do curso');
    assert.equal(nesteTermo(pt.modulo), 'nesta disciplina');
    assert.equal(aoTermo(pt.modulo), 'à disciplina');
    assert.equal(aoTermo(pt.programa), 'ao curso');
    assert.equal(aoTermo(en.modulo), 'to the course');
    assert.equal(publicados(pt.projeto), 'Projetos publicados');
    assert.equal(publicados({ singular: 'Obra', plural: 'Obras', genero: 'f' }), 'Obras publicadas');
  });

  it('nenhum encontrado concorda em género', () => {
    assert.equal(nenhumEncontrado(pt.modulo), 'Nenhuma disciplina encontrada');
    assert.equal(nenhumEncontrado(empresa.modulo), 'Nenhum serviço encontrado');
    assert.equal(nenhumEncontrado(en.modulo), 'No courses found');
  });

  it('ver e procurar', () => {
    assert.equal(ver(empresa.modulo), 'Ver serviços');
    assert.equal(procurar(pt.modulo), 'Procurar disciplina');
    assert.equal(verUm(pt.projeto), 'Ver projeto');
    assert.equal(verUm(en.projeto), 'View project');
  });

  it('em inglês', () => {
    assert.equal(novo(en.modulo), 'New course');
    assert.equal(nenhum(en.modulo), 'No courses');
    assert.equal(ver(en.programa), 'View programmes');
    assert.equal(publicados(en.projeto), 'Published projects');
  });

  it('siglas mantêm as maiúsculas a meio da frase', () => {
    assert.equal(minuscula('UC'), 'UC');
    assert.equal(contar({ singular: 'UC', plural: 'UCs', genero: 'f' }, 2), '2 UCs');
    assert.equal(minuscula('Disciplina'), 'disciplina');
  });
});
