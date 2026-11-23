/**
 * Consultas partilhadas pelas páginas públicas da hierarquia
 * (entidade → programa → módulo → projeto).
 *
 * `cache` evita repetir a mesma consulta no generateMetadata e na página
 * durante o mesmo pedido.
 */

import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import { getTermos } from '@/lib/terminologia';

/** O código vem do URL: % e _ não podem funcionar como curingas no ilike */
const literal = texto => String(texto).replace(/[\\%_]/g, '\\$&');

export const idDaEntidade = entidade => entidade?.id_entidade ?? entidade?.id;

export const getEntidade = cache(async slug => {
  const { data, error } = await supabase.from('entidade').select('*').eq('slug', slug).maybeSingle();
  return error ? null : data;
});

/** O código no URL está em minúsculas ('ecgm'); na base de dados pode estar 'ECGM' */
export const getPrograma = cache(async (idEntidade, codigo) => {
  const { data, error } = await supabase
    .from('programa')
    .select('id_programa, nome, codigo, descricao, id_entidade')
    .eq('id_entidade', idEntidade)
    .ilike('codigo', literal(codigo))
    .maybeSingle();
  return error ? null : data;
});

/** Aceita o id numérico (links do site) ou o código do módulo */
export const getModulo = cache(async (idPrograma, parametro) => {
  const id = Number(parametro);
  const consulta = supabase.from('modulo').select('*').eq('id_programa', idPrograma);
  const { data, error } = Number.isFinite(id)
    ? await consulta.eq('id_modulo', id).maybeSingle()
    : await consulta.ilike('codigo', literal(parametro)).maybeSingle();
  return error ? null : data;
});

export const getTermosDe = cache(entidade => getTermos(supabase, entidade));
