/**
 * Catálogo de permissões das funções.
 *
 * É o mesmo da base de dados (catalogo_permissoes(), na migração
 * 20261128_tipos_funcoes.sql): a tabela funcoes só aceita estas chaves e
 * as regras de segurança usam-nas através de tem_permissao(...).
 * Um teste confirma que as duas listas são iguais.
 *
 * As descrições usam palavras genéricas; no painel, os termos do tipo
 * de entidade (módulo, trabalho…) substituem-nas.
 */

export const PERMISSOES = [
  { chave: 'submeter_trabalhos',     grupo: 'trabalhos', descricao: 'Submeter trabalhos para aprovação' },
  { chave: 'aprovar_trabalhos',      grupo: 'trabalhos', descricao: 'Aprovar e rejeitar trabalhos' },
  { chave: 'gerir_projetos',         grupo: 'conteudo',  descricao: 'Criar e editar projetos e os seus ficheiros' },
  { chave: 'gerir_conteudo_3d',      grupo: 'conteudo',  descricao: 'Gerir modelos 3D e vídeos de fundo' },
  { chave: 'usar_criador_video',     grupo: 'conteudo',  descricao: 'Usar o criador de vídeo' },
  { chave: 'gerir_modulos',          grupo: 'estrutura', descricao: 'Criar e editar módulos' },
  { chave: 'gerir_programas',        grupo: 'estrutura', descricao: 'Criar e editar programas' },
  { chave: 'gerir_entidade',         grupo: 'estrutura', descricao: 'Editar os dados e o logo da entidade' },
  { chave: 'gerir_membros',          grupo: 'pessoas',   descricao: 'Dar e tirar funções de nível inferior' },
  { chave: 'gerir_funcoes_e_termos', grupo: 'pessoas',   descricao: 'Mudar os termos próprios da entidade' },
  { chave: 'ver_estatisticas',       grupo: 'pessoas',   descricao: 'Ver as estatísticas do painel' },
];

export const CHAVES_PERMISSOES = PERMISSOES.map(p => p.chave);

/** A função (linha de `funcoes`, com o array `permissoes`) tem esta permissão? */
export function funcaoTem(funcao, permissao) {
  return Array.isArray(funcao?.permissoes) && funcao.permissoes.includes(permissao);
}
