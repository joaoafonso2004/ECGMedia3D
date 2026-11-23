'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useModelViewer, ancoraDoPalco } from '@/context/ModelViewerContext';
import { resolverTermos, ver } from '@/lib/terminologia';
import { useToque } from '@/lib/useMedia';
import { IconeCubo, IconeParar } from './Icones';

/**
 * Cartão de um módulo na página do programa.
 *
 * Computador: ao passar o rato, o modelo 3D do módulo anima por cima do palco
 * (e sai do cartão). Telemóvel: não há rato, por isso o modelo só aparece
 * quando se toca em "Ver 3D"; "Parar" (ou o cartão sair do ecrã) termina.
 * Os dois modos usam o mesmo canvas WebGL partilhado (ModelViewerGlobal).
 */
export default function DisciplinaCard({ disciplina, basePath = '', termos = null }) {
  const t = termos ?? resolverTermos();
  const { activeModel, setActiveModel } = useModelViewer();
  const toque = useToque();
  const palcoRef = useRef(null);
  const videoRef = useRef(null);
  const [rato, setRato] = useState(false);

  const { id_modulo, nome, codigo, descricao, modulo_media } = disciplina;
  const id = String(id_modulo);

  const media = modulo_media?.flatMap(mm => (mm.media_items ? [mm.media_items] : [])) ?? [];
  const glb = media.find(mi =>
    mi?.url?.toLowerCase().endsWith('.glb') ||
    ['glb', 'modelo3d'].includes(mi?.tipo?.toLowerCase())
  ) ?? null;
  const video = media.find(mi => mi?.tipo?.toLowerCase() === 'video') ?? null;
  const breakout = Boolean(glb && video);

  const ativo = activeModel?.cardId === id; // o modelo deste cartão está no ecrã
  const animado = rato || ativo;

  function mostrarModelo(modo) {
    if (!glb || !palcoRef.current) return;
    setActiveModel({
      url:           glb.url,
      escala:        glb.escala        ?? 10,
      offset_y:      glb.offset_y      ?? 0,
      animacao_tipo: glb.animacao_tipo ?? null,
      rotacao_x:     glb.rotacao_x     ?? 0,
      rotacao_y:     glb.rotacao_y     ?? 0,
      rotacao_z:     glb.rotacao_z     ?? 0,
      posicao_x:     glb.posicao_x     ?? 0,
      cardId:        id,
      modo,
      breakout,
      rect:          ancoraDoPalco(palcoRef.current, breakout, modo === 'toque'),
    });
  }

  const esconderModelo = () => setActiveModel(m => (m?.cardId === id ? null : m));

  /* Só o rato: num ecrã tátil, o toque também gera pointerenter e abriria o 3D antes de navegar */
  function entrar(e) {
    if (e.pointerType !== 'mouse') return;
    setRato(true);
    mostrarModelo('rato');
  }
  function sair(e) {
    if (e.pointerType !== 'mouse') return;
    setRato(false);
    esconderModelo();
  }

  /* O vídeo do módulo toca enquanto o cartão está animado */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (animado) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [animado]);

  /* Ao sair da página, não deixa o modelo deste cartão no ecrã */
  useEffect(() => () => setActiveModel(m => (m?.cardId === id ? null : m)), [id, setActiveModel]);

  return (
    <article
      data-hover-card={id}
      onPointerEnter={entrar}
      onPointerLeave={sair}
      className={`group relative flex flex-col rounded-xl border bg-superficie transition-[border-color,box-shadow] duration-200
                  has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-acao/25
                  ${animado
                    ? 'border-tinta shadow-[0_14px_32px_-18px_rgb(11_9_4/0.45)]'
                    : 'border-linha hover:border-tinta'}`}
    >
      {/* Palco: onde o modelo 3D aparece */}
      <div ref={palcoRef} data-palco className="relative aspect-[16/10] overflow-hidden rounded-t-[11px] bg-mosaico">
        {video && (
          <video
            ref={videoRef}
            src={video.url}
            crossOrigin="anonymous"
            loop
            muted
            playsInline
            preload="none"
            className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${animado ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {/* Em repouso: o código do módulo; some quando o modelo entra */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 grid place-items-center font-mono text-[clamp(26px,2.6vw,36px)] font-medium
                      tracking-tight text-tinta/15 transition-opacity duration-300 ${animado && glb ? 'opacity-0' : ''}`}
        >
          {codigo ?? ''}
        </span>

        {glb && (
          <span className="absolute right-3 top-3 rounded-md border border-linha-2 bg-superficie/90 px-1.5 py-0.5 font-mono text-[11px] font-medium text-tinta-2">
            3D
          </span>
        )}

        {toque && glb && (
          <button
            type="button"
            onClick={() => (ativo ? esconderModelo() : mostrarModelo('toque'))}
            aria-pressed={ativo}
            aria-label={ativo ? `Parar o modelo 3D de ${nome}` : `Ver o modelo 3D de ${nome}`}
            className="absolute bottom-3 right-3 z-20 inline-flex h-10 items-center gap-1.5 rounded-full border border-linha-2
                       bg-superficie px-4 text-sm font-medium text-tinta shadow-sm"
          >
            {ativo ? <><IconeParar tamanho={14} />Parar</> : <><IconeCubo tamanho={16} />Ver 3D</>}
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {codigo && <span className="font-mono text-xs font-medium text-cinza">{codigo}</span>}
        <h3 className="mt-1 font-semibold leading-snug tracking-tight">
          {/* O link cobre o cartão todo (menos o botão "Ver 3D") */}
          <Link
            href={`${basePath}/${id_modulo}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-hover:text-acao"
          >
            {nome}
          </Link>
        </h3>
        {descricao && <p className="mt-1.5 line-clamp-2 text-sm text-tinta-2">{descricao}</p>}
        <span className="mt-auto pt-3 text-sm font-medium text-acao">
          {ver(t.projeto)}{' '}
          <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </span>
      </div>
    </article>
  );
}
