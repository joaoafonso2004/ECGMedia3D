'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  NOTIFICACOES_POR_PAGINA,
  TIPOS_NOTIFICACAO,
  apagarNotificacao,
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  tempoRelativo,
} from '@/lib/notificacoes';
import { IconTipoNotificacao } from './NotificacoesSino';

/**
 * Histórico completo de notificações (usado em /admin, /gestor e /utilizador).
 */
export default function NotificacoesPagina({ accent = '#a78bfa' }) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [filtro, setFiltro] = useState('todas'); // 'todas' | 'nao_lidas'
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aCarregarMais, setACarregarMais] = useState(false);
  const [haMais, setHaMais] = useState(false);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async (id, modo) => {
    try {
      const dados = await listarNotificacoes(createSupabaseBrowser(), id, {
        apenasNaoLidas: modo === 'nao_lidas',
      });
      setLista(dados);
      setHaMais(dados.length === NOTIFICACOES_POR_PAGINA);
      setErro(null);
    } catch (e) {
      setErro('Não foi possível carregar as notificações.');
      console.error('Notificações:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    createSupabaseBrowser().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Carrega a lista sempre que muda o filtro (ignora respostas de um filtro antigo)
  useEffect(() => {
    if (!userId) return;
    let ativo = true;
    listarNotificacoes(createSupabaseBrowser(), userId, { apenasNaoLidas: filtro === 'nao_lidas' })
      .then(dados => {
        if (!ativo) return;
        setLista(dados);
        setHaMais(dados.length === NOTIFICACOES_POR_PAGINA);
        setErro(null);
      })
      .catch(e => {
        if (!ativo) return;
        setErro('Não foi possível carregar as notificações.');
        console.error('Notificações:', e.message);
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [userId, filtro]);

  async function carregarMais() {
    setACarregarMais(true);
    try {
      const dados = await listarNotificacoes(createSupabaseBrowser(), userId, {
        desde: lista.length,
        apenasNaoLidas: filtro === 'nao_lidas',
      });
      setLista(prev => [...prev, ...dados]);
      setHaMais(dados.length === NOTIFICACOES_POR_PAGINA);
    } catch (e) {
      console.error('Notificações:', e.message);
    } finally {
      setACarregarMais(false);
    }
  }

  async function abrir(n) {
    if (!n.lida) {
      try { await marcarComoLida(createSupabaseBrowser(), n.id_notificacao); } catch {}
    }
    if (n.link) router.push(n.link);
  }

  async function alternarLida(n) {
    const supabase = createSupabaseBrowser();
    const novoValor = !n.lida;
    setLista(prev => prev.map(x => x.id_notificacao === n.id_notificacao ? { ...x, lida: novoValor } : x));
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: novoValor })
      .eq('id_notificacao', n.id_notificacao);
    if (error) carregar(userId, filtro);
  }

  async function apagar(n) {
    setLista(prev => prev.filter(x => x.id_notificacao !== n.id_notificacao));
    try {
      await apagarNotificacao(createSupabaseBrowser(), n.id_notificacao);
    } catch (e) {
      console.error('Notificações:', e.message);
      carregar(userId, filtro);
    }
  }

  async function lerTodas() {
    try {
      await marcarTodasComoLidas(createSupabaseBrowser(), userId);
      carregar(userId, filtro);
    } catch (e) {
      console.error('Notificações:', e.message);
    }
  }

  const temNaoLidas = lista.some(n => !n.lida);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Notificações</h1>
          <p className="text-sm text-white/35 mt-1">Pedidos de aprovação e decisões sobre os conteúdos submetidos.</p>
        </div>
        <button
          type="button"
          onClick={lerTodas}
          disabled={!temNaoLidas}
          className="h-9 px-4 rounded-lg border border-white/10 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition disabled:opacity-30 disabled:cursor-default shrink-0"
        >
          Marcar todas como lidas
        </button>
      </div>

      <div className="flex items-center gap-6 mb-6 border-b border-white/5">
        {[['todas', 'Todas'], ['nao_lidas', 'Por ler']].map(([valor, label]) => (
          <button
            key={valor}
            onClick={() => {
              if (valor === filtro) return;
              setLoading(true);
              setFiltro(valor);
            }}
            className={`pb-3.5 px-1 text-sm font-medium transition-all relative
              ${filtro === valor ? '' : 'text-white/40 hover:text-white/70'}`}
            style={filtro === valor ? { color: accent } : undefined}
          >
            {label}
            {filtro === valor && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 rounded-t-full" style={{ backgroundColor: accent }} />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-20 text-center text-sm text-white/30">A carregar notificações…</p>
      ) : erro ? (
        <p className="py-20 text-center text-sm text-red-400/80">{erro}</p>
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#13131a] py-20 text-center">
          <p className="text-lg font-semibold text-white">
            {filtro === 'nao_lidas' ? 'Está tudo lido' : 'Ainda não tens notificações'}
          </p>
          <p className="text-sm text-white/40 mt-2">Quando houver novidades sobre submissões, aparecem aqui.</p>
        </div>
      ) : (
        <>
          <ul className="rounded-xl border border-white/8 bg-[#13131a] divide-y divide-white/5 overflow-hidden">
            {lista.map(n => (
              <li key={n.id_notificacao} className={`group flex items-start gap-3 px-5 py-4 ${n.lida ? '' : 'bg-white/[0.02]'}`}>
                <IconTipoNotificacao tipo={n.tipo} />
                <button type="button" onClick={() => abrir(n)} className="flex-1 min-w-0 text-left">
                  <span className="flex items-center gap-2">
                    <span className={`text-sm ${n.lida ? 'text-white/60' : 'text-white font-medium'}`}>{n.titulo}</span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold ${TIPOS_NOTIFICACAO[n.tipo]?.cor ?? 'text-white/40'}`}>
                      {TIPOS_NOTIFICACAO[n.tipo]?.label}
                    </span>
                  </span>
                  {n.mensagem && <span className="block text-sm text-white/45 mt-1 leading-relaxed">{n.mensagem}</span>}
                  <span className="block text-xs text-white/25 mt-1.5">
                    {tempoRelativo(n.created_at)} · {new Date(n.created_at).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </button>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition shrink-0">
                  <button
                    type="button"
                    onClick={() => alternarLida(n)}
                    className="h-8 px-2.5 rounded-md text-xs text-white/50 hover:bg-white/5 hover:text-white transition"
                    title={n.lida ? 'Marcar como por ler' : 'Marcar como lida'}
                  >
                    {n.lida ? 'Por ler' : 'Lida'}
                  </button>
                  <button
                    type="button"
                    onClick={() => apagar(n)}
                    className="h-8 w-8 flex items-center justify-center rounded-md text-white/40 hover:bg-red-500/10 hover:text-red-400 transition"
                    title="Apagar notificação"
                    aria-label="Apagar notificação"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {haMais && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={carregarMais}
                disabled={aCarregarMais}
                className="h-9 px-5 rounded-lg border border-white/10 text-sm text-white/60 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
              >
                {aCarregarMais ? 'A carregar…' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
