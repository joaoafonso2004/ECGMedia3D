'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

const LINKS = [
  { href: '/',               chave: 'inicio',       label: 'Início' },
  { href: '/#instituicoes',  chave: 'instituicoes', label: 'Instituições' },
  { href: '/#como-funciona', chave: 'como',         label: 'Como funciona' },
];

/* Logótipo: três círculos R, G e B (as cores do curso de ECGM) */
export function MarcaRGB({ tamanho = 11 }) {
  const s = { width: tamanho, height: tamanho };
  const sobrepor = { ...s, marginLeft: -tamanho * 0.35 };
  return (
    <span className="inline-flex isolate" aria-hidden="true">
      <i className="block rounded-full bg-ecgm-r mix-blend-multiply" style={s} />
      <i className="block rounded-full bg-ecgm-g mix-blend-multiply" style={sobrepor} />
      <i className="block rounded-full bg-ecgm-b mix-blend-multiply" style={sobrepor} />
    </span>
  );
}

function IconePesquisa({ tamanho = 18, className = '' }) {
  return (
    <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}

/* Painel de cada perfil (o mesmo destino do login) */
function rotaDoPainel(roles) {
  if (roles.includes('superadmin')) return '/admin/dashboard';
  if (roles.includes('gestor') || roles.includes('gestor_disciplina')) return '/gestor/dashboard';
  if (roles.includes('utilizador')) return '/utilizador/dashboard';
  return null;
}

/* Com sessão iniciada devolve o link do painel; sem sessão, null */
function usePainel() {
  const [painel, setPainel] = useState(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let ativo = true;

    async function carregar(user) {
      if (!user) { if (ativo) setPainel(null); return; }
      const { data } = await supabase.from('tipo_utilizador').select('role').eq('id_utilizador', user.id);
      if (ativo) setPainel(rotaDoPainel((data ?? []).map(t => t.role)));
    }

    // Fora do callback: chamar o Supabase dentro dele pode bloquear a sessão
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setTimeout(() => carregar(sessao?.user ?? null), 0);
    });
    return () => { ativo = false; subscription.unsubscribe(); };
  }, []);

  return painel;
}

export default function SiteHeader({ atual = '' }) {
  const [aberto, setAberto] = useState(false);
  const painel = usePainel();
  const entrada = painel
    ? { href: painel, label: 'Painel' }
    : { href: '/admin/login', label: 'Entrar' };

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-linha bg-papel/90 backdrop-blur-md">
      <div className="contentor flex h-full items-center gap-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-tinta">
          <MarcaRGB />
          ECGMedia3D
        </Link>

        <nav aria-label="Principal" className="hidden md:flex gap-6 text-[15px] text-tinta-2">
          {LINKS.map(l => (
            <Link
              key={l.chave}
              href={l.href}
              aria-current={atual === l.chave ? 'page' : undefined}
              className="hover:text-tinta aria-[current=page]:font-semibold aria-[current=page]:text-tinta
                         aria-[current=page]:underline aria-[current=page]:decoration-acao
                         aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          {atual !== 'pesquisa' && (
            <>
              <Form action="/pesquisa" role="search" className="relative hidden lg:block">
                <label htmlFor="cabecalho-pesquisa" className="sr-only">Pesquisar</label>
                <IconePesquisa tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
                <input
                  id="cabecalho-pesquisa"
                  name="q"
                  type="search"
                  required
                  minLength={2}
                  autoComplete="off"
                  placeholder="Pesquisar projetos, autores…"
                  className="h-10 w-64 rounded-[10px] border border-linha-2 bg-superficie pl-9 pr-3 text-[14.5px] text-tinta
                             placeholder:text-cinza focus:border-acao focus:outline-none focus:ring-3 focus:ring-acao/15"
                />
              </Form>
              <Link
                href="/pesquisa"
                aria-label="Pesquisar"
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-[10px]
                           border border-linha-2 bg-superficie text-tinta hover:border-tinta"
              >
                <IconePesquisa />
              </Link>
            </>
          )}
          <Link
            href={entrada.href}
            className="hidden md:inline-flex h-10 items-center rounded-[10px] bg-acao px-4 text-[14.5px]
                       font-medium text-white transition-colors hover:bg-acao-escuro"
          >
            {entrada.label}
          </Link>
          <button
            type="button"
            onClick={() => setAberto(a => !a)}
            aria-expanded={aberto}
            aria-label="Menu"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-[10px]
                       border border-linha-2 bg-superficie text-tinta"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              {aberto ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {aberto && (
        <div className="md:hidden absolute inset-x-0 top-16 border-b border-linha bg-superficie px-4 pb-5 pt-1 shadow-lg">
          {LINKS.map(l => (
            <Link
              key={l.chave}
              href={l.href}
              onClick={() => setAberto(false)}
              className="flex justify-between border-b border-linha py-3.5 text-lg font-medium text-tinta"
            >
              {l.label}<span aria-hidden="true">→</span>
            </Link>
          ))}
          <Link
            href={entrada.href}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-acao px-4 text-[14.5px] font-medium text-white"
          >
            {entrada.label}
          </Link>
        </div>
      )}
    </header>
  );
}
