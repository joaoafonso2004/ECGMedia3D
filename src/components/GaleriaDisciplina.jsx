'use client';

/* eslint-disable @next/next/no-img-element -- endereços externos (R2, Supabase, outros sites) */
import { useRef, useState } from 'react';
import Link from 'next/link';
import Lightbox from './Lightbox';
import Miniatura from './Miniatura';
import { IconeCubo } from './Icones';
import { tipoDoUrl } from '@/lib/media';
import { resolverTermos, contar, maiuscula, minuscula, publicados, doTermo, nesteTermo, verUm } from '@/lib/terminologia';

/** Imagem do cartão de projeto (projeto_url pode ser imagem, vídeo ou GLB) */
function CapaProjeto({ projeto }) {
  const tipo = tipoDoUrl(projeto.projeto_url);
  return (
    <div className="relative aspect-video overflow-hidden rounded-t-[11px] bg-mosaico">
      {tipo === 'imagem' && (
        <img src={projeto.projeto_url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      )}
      {tipo === 'video' && (
        <video src={`${projeto.projeto_url}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />
      )}
      {(tipo === 'modelo' || !tipo) && (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-tinta/25">
          <IconeCubo tamanho={40} espessura={1.2} />
        </span>
      )}
    </div>
  );
}

function CartaoProjeto({ projeto, href, t }) {
  return (
    <article
      className="group relative flex flex-col rounded-xl border border-linha bg-superficie transition-colors hover:border-tinta
                 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-acao/25"
    >
      <CapaProjeto projeto={projeto} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1 pb-4">
          <h3 className="text-lg font-semibold leading-snug tracking-tight">
            <Link href={href} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-hover:text-acao">
              {projeto.titulo}
            </Link>
          </h3>
          {projeto.descricao && <p className="mt-1.5 line-clamp-2 text-[15px] text-tinta-2">{projeto.descricao}</p>}
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-linha pt-3">
          <p className="min-w-0 text-sm text-tinta-2">
            {projeto.autores && (
              <>
                <span className="mr-1.5 text-[11px] font-medium uppercase tracking-wide text-cinza">Autores</span>
                {projeto.autores}
              </>
            )}
          </p>
          <span className="shrink-0 text-sm font-medium text-acao">
            {verUm(t.projeto)} <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function Vazio({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-linha-2 bg-superficie py-16 text-center">
      <p className="text-sm text-cinza">{children}</p>
    </div>
  );
}

/**
 * Página do módulo: separadores "Projetos publicados" e "Biblioteca da comunidade"
 * (trabalhos dos alunos aprovados pelo gestor). Cada trabalho abre em ecrã inteiro.
 * `abrirId` (?ver=<id>, vindo da pesquisa) abre logo esse trabalho.
 */
export default function GaleriaDisciplina({ projetos = [], comunidade = [], base = '', abrirId = null, termos = null }) {
  const t = termos ?? resolverTermos();

  const itens = comunidade.map(i => ({
    id: i.id_media_items,
    url: i.url,
    tipo: i.tipo,
    titulo: i.titulo,
    autor: i.autor?.nome ?? null,
  }));
  const inicial = abrirId != null ? itens.findIndex(i => String(i.id) === String(abrirId)) : -1;

  const [separador, setSeparador] = useState(inicial >= 0 ? 'biblioteca' : 'projetos');
  const [aberto, setAberto] = useState(inicial >= 0 ? inicial : null);
  const botoes = useRef({});

  const separadores = [
    { chave: 'projetos', curto: maiuscula(t.projeto.plural), longo: publicados(t.projeto), n: projetos.length },
    { chave: 'biblioteca', curto: 'Biblioteca', longo: 'Biblioteca da comunidade', n: itens.length },
  ];

  /* Setas do teclado mudam de separador (padrão ARIA de tabs) */
  function teclaSeparador(e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const outro = separador === 'projetos' ? 'biblioteca' : 'projetos';
    setSeparador(outro);
    botoes.current[outro]?.focus();
  }

  return (
    <section className="pt-8">
      {/* ── Separadores ────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Conteúdo"
        onKeyDown={teclaSeparador}
        className="grid grid-cols-2 gap-1 rounded-xl border border-linha-2 bg-superficie p-1
                   sm:flex sm:gap-8 sm:rounded-none sm:border-0 sm:border-b sm:border-linha sm:bg-transparent sm:p-0"
      >
        {separadores.map(s => {
          const ativo = separador === s.chave;
          return (
            <button
              key={s.chave}
              ref={el => { botoes.current[s.chave] = el; }}
              type="button"
              role="tab"
              id={`separador-${s.chave}`}
              aria-selected={ativo}
              aria-controls={`painel-${s.chave}`}
              tabIndex={ativo ? 0 : -1}
              onClick={() => setSeparador(s.chave)}
              className={`h-11 rounded-lg text-[15px] font-medium transition-colors
                          sm:-mb-px sm:h-auto sm:rounded-none sm:border-b-2 sm:pb-3 sm:text-base
                          ${ativo
                            ? 'bg-tinta text-papel sm:border-tinta sm:bg-transparent sm:font-semibold sm:text-tinta'
                            : 'text-tinta-2 hover:text-tinta sm:border-transparent'}`}
            >
              <span className="sm:hidden">{s.curto}</span>
              <span className="hidden sm:inline">{s.longo}</span>
              <span className={`ml-1 ${ativo ? '' : 'text-cinza'}`}>({s.n})</span>
            </button>
          );
        })}
      </div>

      {/* ── Projetos ───────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id="painel-projetos"
        aria-labelledby="separador-projetos"
        hidden={separador !== 'projetos'}
        className="pt-6"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-tinta-2">{maiuscula(t.projeto.plural)} {doTermo(t.modulo)}</p>
          <span className="rounded-md border border-linha-2 px-2 py-0.5 text-xs text-cinza">{contar(t.projeto, projetos.length)}</span>
        </div>
        {projetos.length === 0 ? (
          <Vazio>{`Ainda não há ${minuscula(publicados(t.projeto))} ${nesteTermo(t.modulo)}.`}</Vazio>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projetos.map(p => (
              <CartaoProjeto key={p.id_projetos} projeto={p} href={`${base}/${p.id_projetos}`} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* ── Biblioteca da comunidade ───────────────────────────── */}
      <div
        role="tabpanel"
        id="painel-biblioteca"
        aria-labelledby="separador-biblioteca"
        hidden={separador !== 'biblioteca'}
        className="pt-6"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-tinta-2">Trabalhos individuais aprovados</p>
          <span className="rounded-md border border-linha-2 px-2 py-0.5 text-xs text-cinza">
            {itens.length} {itens.length === 1 ? 'trabalho' : 'trabalhos'}
          </span>
        </div>
        {itens.length === 0 ? (
          <Vazio>{`Ainda não há trabalhos aprovados na biblioteca ${doTermo(t.modulo)}.`}</Vazio>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {itens.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setAberto(i)}
                  className="group block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-acao/30"
                >
                  <Miniatura item={item} />
                  <span className="mt-2.5 block truncate font-medium">{item.titulo || 'Sem título'}</span>
                  {item.autor && <span className="block truncate text-sm text-cinza">Por {item.autor}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {aberto !== null && (
        <Lightbox itens={itens} indice={aberto} onMudar={setAberto} onFechar={() => setAberto(null)} />
      )}
    </section>
  );
}
