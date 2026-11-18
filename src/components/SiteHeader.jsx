'use client';

import { useState } from 'react';
import Link from 'next/link';

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

export default function SiteHeader({ atual = '' }) {
  const [aberto, setAberto] = useState(false);

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
          <Link
            href="/admin/login"
            className="hidden md:inline-flex h-10 items-center rounded-[10px] bg-acao px-4 text-[14.5px]
                       font-medium text-white transition-colors hover:bg-acao-escuro"
          >
            Entrar
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
            href="/admin/login"
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-acao px-4 text-[14.5px] font-medium text-white"
          >
            Entrar
          </Link>
        </div>
      )}
    </header>
  );
}
