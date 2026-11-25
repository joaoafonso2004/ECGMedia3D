/**
 * Terminologia configurável.
 *
 * Os nomes dos níveis da hierarquia (entidade → programa → módulo → projeto)
 * vêm da tabela `terminologia`, por tipo de entidade, e uma entidade pode
 * substituir termos só para si. Precedência: entidade → tipo → predefinição.
 *
 * Uso numa página (servidor):
 *   const termos = await getTermos(supabase, entidade);
 *   contar(termos.programa, 3)  → "3 cursos"
 *   novo(termos.modulo)         → "Nova disciplina"
 *
 * Os objetos de termos são simples (podem passar para componentes 'use client').
 * Se a tabela ainda não existir, usa os termos predefinidos e a página não falha.
 */

export const NIVEIS = ['entidade', 'programa', 'modulo', 'projeto'];
export const IDIOMAS = ['pt', 'en'];

/** Termos usados quando não há nada na base de dados (igual à predefinição da migração). */
export const PADRAO = {
  pt: {
    entidade: { singular: 'Instituição', plural: 'Instituições', genero: 'f' },
    programa: { singular: 'Programa',    plural: 'Programas',    genero: 'm' },
    modulo:   { singular: 'Disciplina',  plural: 'Disciplinas',  genero: 'f' },
    projeto:  { singular: 'Projeto',     plural: 'Projetos',     genero: 'm' },
  },
  en: {
    entidade: { singular: 'Institution', plural: 'Institutions', genero: 'f' },
    programa: { singular: 'Programme',   plural: 'Programmes',   genero: 'm' },
    modulo:   { singular: 'Course',      plural: 'Courses',      genero: 'm' },
    projeto:  { singular: 'Project',     plural: 'Projects',     genero: 'm' },
  },
};

const COLUNAS = 'tipo_entidade, id_entidade, idioma, nivel, singular, plural, genero';

/* ─── Resolver ─────────────────────────────────────────────────── */

/**
 * Junta as linhas da tabela pela ordem de precedência e devolve
 * { entidade, programa, modulo, projeto }, cada um { singular, plural, genero, idioma }.
 */
export function resolverTermos(linhas = [], entidade = null, idioma = 'pt') {
  const lingua = IDIOMAS.includes(idioma) ? idioma : 'pt';
  const tipo = entidade?.tipo ? String(entidade.tipo).trim().toLowerCase() : null;
  const id = entidade?.id_entidade ?? entidade?.id ?? null;

  const peso = l => (l.id_entidade != null ? 3 : l.tipo_entidade ? 2 : 1);
  const aplica = l =>
    (l.idioma ?? 'pt') === lingua && (
      (l.id_entidade == null && !l.tipo_entidade) ||
      (l.id_entidade == null && tipo && l.tipo_entidade === tipo) ||
      (l.id_entidade != null && id != null && Number(l.id_entidade) === Number(id))
    );

  const termos = Object.fromEntries(
    NIVEIS.map(n => [n, { ...PADRAO[lingua][n], idioma: lingua }])
  );
  for (const l of linhas.filter(aplica).sort((a, b) => peso(a) - peso(b))) {
    if (!NIVEIS.includes(l.nivel)) continue;
    termos[l.nivel] = {
      singular: l.singular,
      plural: l.plural,
      genero: l.genero === 'f' ? 'f' : 'm',
      idioma: lingua,
    };
  }
  return termos;
}

/** Linhas da tabela num idioma (a tabela é pequena: lê-se toda). Nunca lança erro. */
export async function getLinhasTerminologia(supabase, idioma = 'pt') {
  try {
    const { data, error } = await supabase.from('terminologia').select(COLUNAS).eq('idioma', idioma);
    if (error) {
      console.error('[Supabase] Terminologia indisponível, a usar termos predefinidos:', error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

/** Termos de uma entidade ({ id_entidade, tipo }), ou os predefinidos se `entidade` for nula. */
export async function getTermos(supabase, entidade = null, idioma = 'pt') {
  return resolverTermos(await getLinhasTerminologia(supabase, idioma), entidade, idioma);
}

/* ─── Frases ───────────────────────────────────────────────────── */
// Recebem um termo ({ singular, plural, genero, idioma }), p. ex. termos.modulo.

const en = t => t?.idioma === 'en';
const fem = t => t?.genero === 'f';

/** Primeira letra minúscula para usar a meio da frase ("disciplinas"), exceto siglas ("UC"). */
export function minuscula(texto = '') {
  if (texto.length > 1 && texto[1] === texto[1].toUpperCase() && texto[1] !== texto[1].toLowerCase()) return texto;
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

export function maiuscula(texto = '') {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "1 disciplina", "3 disciplinas" */
export function contar(t, n) {
  return `${n} ${minuscula(n === 1 ? t.singular : t.plural)}`;
}

/** "Novo programa", "Nova disciplina" · "New course" */
export function novo(t) {
  if (en(t)) return `New ${minuscula(t.singular)}`;
  return `${fem(t) ? 'Nova' : 'Novo'} ${minuscula(t.singular)}`;
}

/** "Nenhum programa", "Nenhuma disciplina" · "No courses" */
export function nenhum(t) {
  if (en(t)) return `No ${minuscula(t.plural)}`;
  return `${fem(t) ? 'Nenhuma' : 'Nenhum'} ${minuscula(t.singular)}`;
}

/** "Nenhuma disciplina encontrada" · "No courses found" */
export function nenhumEncontrado(t) {
  if (en(t)) return `No ${minuscula(t.plural)} found`;
  return `${nenhum(t)} ${fem(t) ? 'encontrada' : 'encontrado'}`;
}

/** "Ainda sem projetos" · "No projects yet" */
export function aindaSem(t) {
  if (en(t)) return `No ${minuscula(t.plural)} yet`;
  return `Ainda sem ${minuscula(t.plural)}`;
}

/** "Ver disciplinas" · "View courses" */
export function ver(t) {
  return `${en(t) ? 'View' : 'Ver'} ${minuscula(t.plural)}`;
}

/** "Ver projeto" · "View project" (um só) */
export function verUm(t) {
  return `${en(t) ? 'View' : 'Ver'} ${minuscula(t.singular)}`;
}

/** "Procurar disciplina" · "Search courses" */
export function procurar(t) {
  return en(t) ? `Search ${minuscula(t.plural)}` : `Procurar ${minuscula(t.singular)}`;
}

/** "Projetos publicados", "Obras publicadas" · "Published projects" */
export function publicados(t) {
  if (en(t)) return `Published ${minuscula(t.plural)}`;
  return `${maiuscula(t.plural)} ${fem(t) ? 'publicadas' : 'publicados'}`;
}

/** Artigo + termo: "o programa", "a disciplina" · "the course" */
export function oTermo(t) {
  if (en(t)) return `the ${minuscula(t.singular)}`;
  return `${fem(t) ? 'a' : 'o'} ${minuscula(t.singular)}`;
}

/** Contração com "de": "do programa", "da disciplina" · "of the course" */
export function doTermo(t) {
  if (en(t)) return `of the ${minuscula(t.singular)}`;
  return `${fem(t) ? 'da' : 'do'} ${minuscula(t.singular)}`;
}

/** Contração com "a": "ao programa", "à disciplina" · "to the course" */
export function aoTermo(t) {
  if (en(t)) return `to the ${minuscula(t.singular)}`;
  return `${fem(t) ? 'à' : 'ao'} ${minuscula(t.singular)}`;
}

/** Contração com "em": "neste programa", "nesta disciplina" · "in this course" */
export function nesteTermo(t) {
  if (en(t)) return `in this ${minuscula(t.singular)}`;
  return `${fem(t) ? 'nesta' : 'neste'} ${minuscula(t.singular)}`;
}
