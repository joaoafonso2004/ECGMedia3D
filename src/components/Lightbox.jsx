'use client';

/* eslint-disable @next/next/no-img-element -- endereços externos (R2, Supabase, outros sites) */
import { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { tipoMedia, NOME_TIPO } from '@/lib/media';
import { IconeAnterior, IconeFechar, IconeSeguinte } from './Icones';

const VisualizadorModelo = dynamic(() => import('./VisualizadorModelo'), {
  ssr: false,
  loading: () => <p className="text-sm text-white/70">A preparar o visualizador…</p>,
});

/**
 * Ficheiro aberto em ecrã inteiro, com o anterior e o seguinte.
 *
 * itens: [{ id, url, tipo, titulo, autor }]
 * Teclado: ← → mudam, Esc fecha. Toque: deslizar para o lado muda,
 * deslizar para baixo fecha (exceto nos modelos 3D, onde arrastar roda o modelo).
 */
export default function Lightbox({ itens, indice, onMudar, onFechar }) {
  const item = itens[indice];
  const total = itens.length;
  const tipo = tipoMedia(item);
  const fecharRef = useRef(null);
  const toqueInicial = useRef(null);

  const anterior = useCallback(() => onMudar((indice - 1 + total) % total), [indice, total, onMudar]);
  const seguinte = useCallback(() => onMudar((indice + 1) % total), [indice, total, onMudar]);

  /* Teclado */
  useEffect(() => {
    function tecla(e) {
      if (e.key === 'Escape') onFechar();
      else if (e.key === 'ArrowLeft' && total > 1) anterior();
      else if (e.key === 'ArrowRight' && total > 1) seguinte();
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [anterior, seguinte, onFechar, total]);

  /* A página por trás não faz scroll; ao fechar, o foco volta ao que estava */
  useEffect(() => {
    const antes = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    fecharRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      antes?.focus?.();
    };
  }, []);

  function inicioToque(e) {
    if (tipo === 'modelo') return;
    const p = e.touches[0];
    toqueInicial.current = { x: p.clientX, y: p.clientY };
  }
  function fimToque(e) {
    const inicio = toqueInicial.current;
    toqueInicial.current = null;
    if (!inicio) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - inicio.x;
    const dy = p.clientY - inicio.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && total > 1) {
      if (dx < 0) seguinte(); else anterior();
    } else if (dy > 80 && dy > Math.abs(dx)) {
      onFechar();
    }
  }

  if (!item) return null;
  const parar = e => e.stopPropagation();
  const nome = item.titulo || NOME_TIPO[tipo];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={nome}
      onClick={onFechar}
      className="fixed inset-0 z-[100] flex flex-col bg-[#0b0904]/95 text-white backdrop-blur-sm"
    >
      {/* Barra de cima */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={parar}>
        <span className="font-mono text-sm tabular-nums text-white/70">{indice + 1} / {total}</span>
        <button
          ref={fecharRef}
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="grid size-11 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        >
          <IconeFechar tamanho={20} />
        </button>
      </div>

      {/* Ficheiro */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
        onTouchStart={inicioToque}
        onTouchEnd={fimToque}
      >
        <div onClick={parar} className="flex max-h-full w-full max-w-5xl items-center justify-center">
          {tipo === 'imagem' && (
            <img key={item.url} src={item.url} alt={item.titulo ?? ''} className="max-h-[calc(100dvh-190px)] max-w-full rounded-lg object-contain" />
          )}
          {tipo === 'video' && (
            <video key={item.url} src={item.url} controls autoPlay loop playsInline className="max-h-[calc(100dvh-190px)] max-w-full rounded-lg" />
          )}
          {tipo === 'modelo' && (
            <VisualizadorModelo key={item.url} url={item.url} titulo={nome} escuro className="h-[min(68dvh,640px)] w-full rounded-xl" />
          )}
          {tipo === 'outro' && (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="botao">Abrir ficheiro</a>
          )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={e => { parar(e); anterior(); }}
              aria-label="Anterior"
              className="absolute left-4 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 sm:grid"
            >
              <IconeAnterior tamanho={22} />
            </button>
            <button
              type="button"
              onClick={e => { parar(e); seguinte(); }}
              aria-label="Seguinte"
              className="absolute right-4 top-1/2 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20 sm:grid"
            >
              <IconeSeguinte tamanho={22} />
            </button>
          </>
        )}
      </div>

      {/* Legenda */}
      <div className="px-4 pb-6 pt-4 text-center" onClick={parar}>
        <h2 className="text-lg font-semibold">{nome}</h2>
        {item.autor && <p className="mt-0.5 text-sm text-white/60">Submetido por {item.autor}</p>}
        {total > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3 sm:hidden">
            <button type="button" onClick={anterior} aria-label="Anterior" className="grid size-10 place-items-center rounded-full bg-white/10">
              <IconeAnterior tamanho={18} />
            </button>
            <span className="text-xs text-white/50">{tipo === 'modelo' ? 'Use as setas para mudar' : 'Deslize para o lado para mudar'}</span>
            <button type="button" onClick={seguinte} aria-label="Seguinte" className="grid size-10 place-items-center rounded-full bg-white/10">
              <IconeSeguinte tamanho={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
