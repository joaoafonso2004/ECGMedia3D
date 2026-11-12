/**
 * Funções partilhadas do sistema de notificações.
 * As notificações são criadas pela base de dados (trigger em media_items);
 * aqui só se lêem, marcam como lidas e apagam.
 */

export const NOTIFICACOES_POR_PAGINA = 20;

/** Evento de janela emitido pelo sino quando chega uma notificação em tempo real. */
export const EVENTO_NOTIFICACAO_NOVA = 'notificacoes:nova';

export const TIPOS_NOTIFICACAO = {
  submissao_pendente: { label: 'Pedido de aprovação', cor: 'text-yellow-400', fundo: 'bg-yellow-500/10' },
  conteudo_aprovado:  { label: 'Aprovado',            cor: 'text-green-400',  fundo: 'bg-green-500/10'  },
  conteudo_rejeitado: { label: 'Não aprovado',        cor: 'text-red-400',    fundo: 'bg-red-500/10'    },
  conteudo_removido:  { label: 'Removido',            cor: 'text-white/60',   fundo: 'bg-white/5'       },
};

const CAMPOS = 'id_notificacao, tipo, titulo, mensagem, link, id_media_items, lida, created_at';

export async function listarNotificacoes(supabase, userId, { limite = NOTIFICACOES_POR_PAGINA, desde = 0, apenasNaoLidas = false } = {}) {
  let query = supabase
    .from('notificacoes')
    .select(CAMPOS)
    .eq('id_destinatario', userId)
    .order('created_at', { ascending: false })
    .range(desde, desde + limite - 1);

  if (apenasNaoLidas) query = query.eq('lida', false);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function contarNaoLidas(supabase, userId) {
  const { count, error } = await supabase
    .from('notificacoes')
    .select('id_notificacao', { count: 'exact', head: true })
    .eq('id_destinatario', userId)
    .eq('lida', false);

  if (error) throw error;
  return count ?? 0;
}

export async function marcarComoLida(supabase, idNotificacao) {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id_notificacao', idNotificacao);

  if (error) throw error;
}

export async function marcarTodasComoLidas(supabase, userId) {
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id_destinatario', userId)
    .eq('lida', false);

  if (error) throw error;
}

export async function apagarNotificacao(supabase, idNotificacao) {
  const { error } = await supabase
    .from('notificacoes')
    .delete()
    .eq('id_notificacao', idNotificacao);

  if (error) throw error;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" ou a data. */
export function tempoRelativo(data) {
  const segundos = Math.floor((Date.now() - new Date(data).getTime()) / 1000);
  if (segundos < 60) return 'agora';

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;

  return new Date(data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
}
