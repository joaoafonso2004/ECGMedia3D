'use client';

/**
 * Estrutura comum dos painéis (administração, gestão e área pessoal),
 * com o mesmo aspeto das páginas públicas: fundo papel, superfícies brancas,
 * texto tinta e verde-azulado para as ações.
 *
 *  • Barra lateral com o menu (vem de uma lista de itens, não está fixa aqui),
 *    "Ver site" e "Terminar sessão". No telemóvel abre por cima da página.
 *  • Topo com o título da página ativa, uma zona para filtros, o sino das
 *    notificações e o nome de quem tem sessão iniciada.
 *
 * Item do menu: { label, href, Icon, contador? } ou { divider: true }.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { MarcaRGB } from '@/components/SiteHeader';
import NotificacoesSino from '@/components/NotificacoesSino';
import BotaoTema from '@/components/BotaoTema';

function itemAtivo(pathname, href) {
  return pathname === href || pathname.startsWith(href + '/');
}

/** Iniciais para o avatar: "Ana Martins" → "AM" */
function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primeira = partes[0][0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

function IconeMenu() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconeFechar() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function IconeSair() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

function IconeExterno() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

/* ─── Barra lateral ─────────────────────────────────────────────── */
function BarraLateral({ area, itens, hrefSair, aoNavegar }) {
  const pathname = usePathname();
  const router = useRouter();

  async function terminarSessao() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push(hrefSair);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Link href="/" className="inline-flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-tinta">
          <MarcaRGB />
          ECGMedia3D
        </Link>
        {area && <p className="mt-1 text-[13px] text-cinza">{area}</p>}
      </div>

      <nav aria-label="Menu do painel" className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {itens.map((item, i) => {
            if (item.divider) return <li key={`d${i}`} aria-hidden="true" className="mx-3 my-3 border-t border-linha" />;
            const { label, href, Icon, contador } = item;
            const ativo = itemAtivo(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={aoNavegar}
                  aria-current={ativo ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14.5px] transition-colors
                    ${ativo ? 'bg-papel font-medium text-tinta' : 'text-tinta-2 hover:bg-papel hover:text-tinta'}`}
                >
                  <span className={ativo ? 'text-acao' : 'text-cinza group-hover:text-tinta-2'}>{Icon && <Icon />}</span>
                  <span className="flex-1 truncate">{label}</span>
                  {contador > 0 && (
                    <span className="min-w-5 rounded-full bg-acao px-1.5 text-center text-[11px] font-semibold leading-5 text-white">
                      {contador > 99 ? '99+' : contador}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-linha px-3 py-4">
        <Link href="/" className="botao w-full">
          Ver site <IconeExterno />
        </Link>
        <button
          type="button"
          onClick={terminarSessao}
          className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-[14.5px] text-tinta-2 transition-colors hover:bg-ecgm-r/5 hover:text-ecgm-r"
        >
          <IconeSair />
          Terminar sessão
        </button>
      </div>
    </div>
  );
}

/* ─── Nome de quem tem sessão iniciada ──────────────────────────── */
function useNomeUtilizador() {
  const [nome, setNome] = useState('');

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('utilizadores').select('nome').eq('id_utilizadores', user.id).maybeSingle();
      if (ativo) setNome(data?.nome || user.email || '');
    }
    carregar();
    // A página Perfil avisa quando o nome muda
    window.addEventListener('profileUpdated', carregar);
    return () => { ativo = false; window.removeEventListener('profileUpdated', carregar); };
  }, []);

  return nome;
}

/* ─── Estrutura ─────────────────────────────────────────────────── */
export default function PainelEstrutura({
  area,
  itens,
  hrefNotificacoes,
  hrefSair = '/admin/login',
  barra = null,
  children,
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const nome = useNomeUtilizador();

  // O título do topo é o item do menu que está ativo
  const titulo = itens.find(i => !i.divider && itemAtivo(pathname, i.href))?.label ?? area ?? '';

  // Fecha o menu do telemóvel com Escape
  useEffect(() => {
    if (!menuAberto) return;
    const fechar = e => { if (e.key === 'Escape') setMenuAberto(false); };
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [menuAberto]);

  return (
    <div className="flex min-h-dvh bg-papel text-tinta">
      {/* Computador: barra lateral fixa */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-linha bg-superficie lg:block">
        <BarraLateral area={area} itens={itens} hrefSair={hrefSair} />
      </aside>

      {/* Telemóvel: a mesma barra por cima da página */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button type="button" aria-label="Fechar o menu" className="absolute inset-0 bg-tinta/30" onClick={() => setMenuAberto(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(300px,85vw)] border-r border-linha bg-superficie shadow-xl">
            <button
              type="button"
              onClick={() => setMenuAberto(false)}
              aria-label="Fechar o menu"
              className="absolute right-3 top-4 grid size-9 place-items-center rounded-[10px] text-tinta-2 hover:bg-papel"
            >
              <IconeFechar />
            </button>
            <BarraLateral area={area} itens={itens} hrefSair={hrefSair} aoNavegar={() => setMenuAberto(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-linha bg-papel/90 px-4 backdrop-blur md:px-8">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir o menu"
            className="-ml-1 grid size-9 place-items-center rounded-[10px] text-tinta-2 hover:bg-superficie lg:hidden"
          >
            <IconeMenu />
          </button>

          {/* No computador, cada página já tem o seu título; o topo só o mostra no telemóvel */}
          <p className="truncate text-[17px] font-semibold tracking-tight lg:hidden">{titulo}</p>

          {barra && <div className="ml-2 hidden min-w-0 items-center gap-2 md:flex">{barra}</div>}

          <div className="ml-auto flex items-center gap-3">
            <BotaoTema className="size-9" />
            {hrefNotificacoes && <NotificacoesSino hrefTodas={hrefNotificacoes} />}
            {nome && (
              <div className="flex items-center gap-2.5">
                <span className="hidden max-w-[180px] truncate text-[14px] text-tinta-2 sm:block">{nome}</span>
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-mosaico text-[12.5px] font-semibold text-tinta-2">
                  {iniciais(nome)}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Filtros também no telemóvel, por baixo do topo */}
        {barra && <div className="flex items-center gap-2 overflow-x-auto border-b border-linha px-4 py-2.5 md:hidden">{barra}</div>}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

/** Ecrã enquanto se verifica a sessão ou se redireciona */
export function PainelAviso({ children }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-papel text-[14px] text-cinza">
      {children}
    </div>
  );
}
