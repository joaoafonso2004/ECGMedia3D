'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  EVENTO_NOTIFICACAO_NOVA,
  TIPOS_NOTIFICACAO,
  contarNaoLidas,
  listarNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  tempoRelativo,
} from '@/lib/notificacoes';

const LIMITE_SINO = 8;

function IconSino({ className = 'w-[18px] h-[18px]' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

export function IconTipoNotificacao({ tipo }) {
  const estilo = TIPOS_NOTIFICACAO[tipo] ?? TIPOS_NOTIFICACAO.conteudo_removido;
  const caminhos = {
    submissao_pendente: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    conteudo_aprovado:  'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    conteudo_rejeitado: 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    conteudo_removido:  'M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776',
  };

  return (
    <span className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${estilo.fundo} ${estilo.cor}`}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={caminhos[tipo] ?? caminhos.conteudo_removido} />
      </svg>
    </span>
  );
}

/**
 * Sino de notificações para os painéis (admin, gestor e aluno).
 * Mostra o número de notificações por ler, as mais recentes num menu
 * e recebe as novas em tempo real (Supabase Realtime).
 *
 * @param {string} hrefTodas  página com o histórico completo
 * @param {string} accent     cor de destaque do painel (hex)
 */
export default function NotificacoesSino({ hrefTodas, accent = '#a78bfa' }) {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [, setRelogio] = useState(0); // força o "há x min" a atualizar
  const [tempoReal, setTempoReal] = useState(null); // null = a ligar, true = ligado, false = em baixo
  const [aviso, setAviso] = useState(null);         // notificação acabada de chegar (aviso no ecrã)
  const tempoRealRef = useRef(null);
  const pathname = usePathname();
  const caixaRef = useRef(null);

  const carregar = useCallback(async (id) => {
    const supabase = createSupabaseBrowser();
    try {
      const [lista, total] = await Promise.all([
        listarNotificacoes(supabase, id, { limite: LIMITE_SINO }),
        contarNaoLidas(supabase, id),
      ]);
      setNotificacoes(lista);
      setNaoLidas(total);
      setErro(null);
    } catch (e) {
      setErro('Não foi possível carregar as notificações.');
      console.error('Notificações:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Utilizador autenticado + carga inicial ──────────────────────
  useEffect(() => {
    let ativo = true;
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!ativo || !user) return;
      setUserId(user.id);
      carregar(user.id);
    });
    return () => { ativo = false; };
  }, [carregar]);

  // ─── Tempo real: novas notificações e alterações noutras abas ────
  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowser();

    const canal = supabase
      .channel(`notificacoes-${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `id_destinatario=eq.${userId}` },
        ({ new: nova }) => {
          setNotificacoes(prev => [nova, ...prev.filter(n => n.id_notificacao !== nova.id_notificacao)].slice(0, LIMITE_SINO));
          if (!nova.lida) setNaoLidas(n => n + 1);
          setAviso(nova);
          // Outras partes do painel (ex.: Aprovações) podem reagir sem ter a sua própria ligação
          window.dispatchEvent(new CustomEvent(EVENTO_NOTIFICACAO_NOVA, { detail: nova }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notificacoes', filter: `id_destinatario=eq.${userId}` },
        () => carregar(userId)
      )
      .subscribe(estado => {
        if (estado === 'SUBSCRIBED') {
          // (Re)ligado: recupera o que possa ter chegado enquanto a ligação esteve em baixo
          if (tempoRealRef.current === false) carregar(userId);
          tempoRealRef.current = true;
          setTempoReal(true);
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
          tempoRealRef.current = false;
          setTempoReal(false);
        }
      });

    return () => { supabase.removeChannel(canal); };
  }, [userId, carregar]);

  // Sem tempo real (rede instável, firewall…): consulta a cada 30 segundos
  useEffect(() => {
    if (!userId || tempoReal !== false) return;
    const t = setInterval(() => carregar(userId), 30_000);
    return () => clearInterval(t);
  }, [userId, tempoReal, carregar]);

  // Aviso no ecrã desaparece sozinho
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  // Número de notificações por ler no título do separador: "(2) ECGMedia3d"
  useEffect(() => {
    const semContador = document.title.replace(/^\(\d+\+?\)\s*/, '');
    document.title = naoLidas > 0 ? `(${naoLidas > 99 ? '99+' : naoLidas}) ${semContador}` : semContador;
  }, [naoLidas, pathname]);

  // Volta a sincronizar quando a janela recupera o foco (ex.: depois de uma suspensão)
  useEffect(() => {
    if (!userId) return;
    const onFocus = () => carregar(userId);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [userId, carregar]);

  useEffect(() => {
    const t = setInterval(() => setRelogio(r => r + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  // ─── Fechar ao clicar fora ou com Escape ─────────────────────────
  useEffect(() => {
    if (!aberto) return;
    function onClick(e) {
      if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [aberto]);

  async function abrirNotificacao(n) {
    setAberto(false);
    if (!n.lida) {
      setNotificacoes(prev => prev.map(x => x.id_notificacao === n.id_notificacao ? { ...x, lida: true } : x));
      setNaoLidas(c => Math.max(0, c - 1));
      try {
        await marcarComoLida(createSupabaseBrowser(), n.id_notificacao);
      } catch (e) {
        console.error('Notificações:', e.message);
      }
    }
    if (n.link) router.push(n.link);
  }

  async function lerTodas() {
    if (!userId || naoLidas === 0) return;
    setNotificacoes(prev => prev.map(x => ({ ...x, lida: true })));
    setNaoLidas(0);
    try {
      await marcarTodasComoLidas(createSupabaseBrowser(), userId);
    } catch (e) {
      console.error('Notificações:', e.message);
      carregar(userId);
    }
  }

  const badge = naoLidas > 99 ? '99+' : naoLidas;

  return (
    <div className="relative" ref={caixaRef}>
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all
          ${aberto ? 'bg-white/8 border-white/10 text-white' : 'border-transparent text-white/45 hover:bg-white/5 hover:text-white/80'}`}
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} por ler)` : 'Notificações'}
        aria-expanded={aberto}
        aria-haspopup="true"
      >
        <IconSino />
        {naoLidas > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center text-black"
            style={{ backgroundColor: accent }}
          >
            {badge}
          </span>
        )}
        {tempoReal === false && (
          <span
            className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-white/30 ring-2 ring-[#0c0c0f]"
            title="Sem ligação em tempo real: a atualizar a cada 30 segundos"
          />
        )}
      </button>

      {/* Leitores de ecrã anunciam as notificações novas */}
      <span className="sr-only" aria-live="polite">
        {aviso ? `Nova notificação: ${aviso.titulo}` : ''}
      </span>

      {/* Aviso no canto do ecrã quando chega uma notificação */}
      {aviso && (
        <div className="fixed bottom-6 right-6 z-[60] w-[340px] max-w-[calc(100vw-3rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#13131a] p-4 shadow-2xl shadow-black/60">
            <IconTipoNotificacao tipo={aviso.tipo} />
            <button type="button" onClick={() => { const n = aviso; setAviso(null); abrirNotificacao(n); }} className="flex-1 min-w-0 text-left">
              <span className="block text-sm font-medium text-white">{aviso.titulo}</span>
              {aviso.mensagem && <span className="block text-xs text-white/50 mt-0.5 line-clamp-2 leading-relaxed">{aviso.mensagem}</span>}
              <span className="block text-[11px] font-medium mt-1.5" style={{ color: accent }}>Abrir</span>
            </button>
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="text-white/30 hover:text-white/70 transition text-lg leading-none"
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {aberto && (
        <div
          className="absolute right-0 top-11 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#13131a] shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Notificações</span>
              {naoLidas > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: accent, backgroundColor: `${accent}1a` }}>
                  {naoLidas} por ler
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={lerTodas}
              disabled={naoLidas === 0}
              className="text-xs font-medium text-white/40 hover:text-white/80 transition disabled:opacity-30 disabled:cursor-default"
            >
              Marcar todas como lidas
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-10 text-center text-sm text-white/30">A carregar…</p>
            ) : erro ? (
              <p className="px-4 py-10 text-center text-sm text-red-400/80">{erro}</p>
            ) : notificacoes.length === 0 ? (
              <div className="px-4 py-12 flex flex-col items-center text-center">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 text-white/25 mb-3">
                  <IconSino className="w-6 h-6" />
                </span>
                <p className="text-sm font-medium text-white/70">Sem notificações</p>
                <p className="text-xs text-white/35 mt-1">Avisamos-te aqui quando houver novidades.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {notificacoes.map(n => (
                  <li key={n.id_notificacao}>
                    <button
                      type="button"
                      onClick={() => abrirNotificacao(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]
                        ${n.lida ? '' : 'bg-white/[0.02]'}`}
                      role="menuitem"
                    >
                      <IconTipoNotificacao tipo={n.tipo} />
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm truncate ${n.lida ? 'text-white/60' : 'text-white font-medium'}`}>
                          {n.titulo}
                        </span>
                        {n.mensagem && (
                          <span className="block text-xs text-white/40 mt-0.5 line-clamp-2 leading-relaxed">{n.mensagem}</span>
                        )}
                        <span className="block text-[11px] text-white/25 mt-1">{tempoRelativo(n.created_at)}</span>
                      </span>
                      {!n.lida && (
                        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent }} aria-label="Por ler" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {hrefTodas && (
            <Link
              href={hrefTodas}
              onClick={() => setAberto(false)}
              className="block px-4 py-2.5 text-center text-xs font-medium border-t border-white/5 hover:bg-white/[0.04] transition"
              style={{ color: accent }}
            >
              Ver todas as notificações
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
