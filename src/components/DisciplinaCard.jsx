'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useModelViewer } from '@/context/ModelViewerContext';

export default function DisciplinaCard({ disciplina, basePath = '' }) {
  const { setActiveModel } = useModelViewer();
  const isHoveredRef = useRef(false);
  const divRef       = useRef(null);
  const videoRef     = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const { id_modulo, nome, codigo, descricao, ano, semestre, modulo_media } = disciplina;

  const mediaItems = modulo_media?.flatMap(mm => mm.media_items ? [mm.media_items] : []) ?? [];

  const glbItem = mediaItems.find(mi =>
    mi?.url?.toLowerCase().endsWith('.glb') ||
    mi?.tipo?.toLowerCase() === 'glb' ||
    mi?.tipo?.toLowerCase() === 'modelo3d'
  ) ?? null;

  const videoItem = mediaItems.find(mi => mi?.tipo?.toLowerCase() === 'video') ?? null;

  const glbUrl    = glbItem?.url          ?? null;
  const videoUrl  = videoItem?.url        ?? null;
  const ESCALA    = glbItem?.escala       ?? 10;
  const OFFSET_Y  = glbItem?.offset_y     ?? 0;
  const ANIM_TIPO = glbItem?.animacao_tipo ?? null;
  const ROT_X     = glbItem?.rotacao_x    ?? 0;
  const ROT_Y     = glbItem?.rotacao_y    ?? 0;
  const ROT_Z     = glbItem?.rotacao_z    ?? 0;
  const POS_X     = glbItem?.posicao_x    ?? 0;

  const hasBreakout = Boolean(glbUrl && videoUrl);

  function onEnter() {
    isHoveredRef.current = true;
    setIsHovered(true);

    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    if (!glbUrl || !divRef.current) return;

    const r = divRef.current.getBoundingClientRect();

    if (hasBreakout) {
      setActiveModel({
        url:           glbUrl,
        escala:        ESCALA,
        offset_y:      OFFSET_Y,
        animacao_tipo: ANIM_TIPO,
        rotacao_x:     ROT_X,
        rotacao_y:     ROT_Y,
        rotacao_z:     ROT_Z,
        posicao_x:     POS_X,
        rect: {
          centerX:    r.left + r.width  / 2,
          centerY:    r.top  + r.height / 2 - r.height * 0.2,
          canvasSize: Math.max(r.width, r.height) * 2.5,
        },
      });
    } else {
      setActiveModel({
        url:           glbUrl,
        escala:        ESCALA,
        offset_y:      OFFSET_Y,
        animacao_tipo: ANIM_TIPO,
        rotacao_x:     ROT_X,
        rotacao_y:     ROT_Y,
        rotacao_z:     ROT_Z,
        posicao_x:     POS_X,
        rect: {
          centerX:    r.left + r.width  / 2,
          centerY:    r.top  + r.height / 2,
          canvasSize: Math.max(r.width, r.height) * 2,
        },
      });
    }
  }

  function onLeave() {
    isHoveredRef.current = false;
    setIsHovered(false);

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setActiveModel(null);
  }

  useEffect(() => {
    return () => {
      if (isHoveredRef.current) setActiveModel(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Link href={`${basePath}/${id_modulo}`} className="block group">
      <div
        ref={divRef}
        className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#13131a]
                   cursor-pointer transition-all duration-300
                   hover:border-[#4f9eff]/40 hover:shadow-xl hover:shadow-[#4f9eff]/10
                   hover:-translate-y-1"
        style={{ height: '280px' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {videoUrl ? (
          <>
            {/* ── Zona superior: vídeo ──────────────────────────── */}
            <div className="absolute inset-x-0 top-0" style={{ height: '50%' }}>
              <video
                ref={videoRef}
                src={videoUrl}
                crossOrigin="anonymous"
                loop
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
                style={{
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }}
              />
              <div className="absolute inset-x-0 bottom-0 h-20
                              bg-gradient-to-t from-[#13131a] to-transparent pointer-events-none" />
            </div>

            {/* ── Zona inferior: conteúdo ───────────────────────── */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end p-5"
                 style={{ height: '58%' }}>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {ano != null && (
                  <span className="rounded-full border border-[#4f9eff]/25 bg-[#4f9eff]/10
                                   px-2.5 py-0.5 text-xs font-semibold text-[#4f9eff] tracking-wide">
                    {ano}º Ano
                  </span>
                )}
                {semestre != null && (
                  <span className="rounded-full border border-white/8 bg-white/5
                                   px-2.5 py-0.5 text-xs font-medium text-white/40 tracking-wide">
                    {isNaN(Number(semestre)) ? semestre : `${semestre}º Sem`}
                  </span>
                )}
                <span className="ml-auto rounded-full border border-white/8 bg-white/5
                                 px-2.5 py-0.5 text-xs text-white/25 tracking-wide">
                  3D
                </span>
              </div>
              {codigo && (
                <span className="text-xs font-mono text-white/25 tracking-widest uppercase mb-0.5 block">
                  {codigo}
                </span>
              )}
              <h2 className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-1
                             group-hover:text-[#4f9eff] transition-colors duration-200">
                {nome}
              </h2>
              <p className="text-xs text-white/45 leading-relaxed line-clamp-2">
                {descricao}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium
                              text-[#4f9eff]/50 group-hover:text-[#4f9eff] transition-colors duration-200">
                <span>Ver projetos</span>
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </>
        ) : (
          /* ── Layout sem vídeo (comportamento atual) ──────────── */
          <div className="relative z-10 flex flex-col justify-between h-full p-6">
            <div className="flex items-center gap-2 flex-wrap">
              {ano != null && (
                <span className="rounded-full border border-[#4f9eff]/25 bg-[#4f9eff]/10
                                 px-3 py-0.5 text-xs font-semibold text-[#4f9eff] tracking-wide">
                  {ano}º Ano
                </span>
              )}
              {semestre != null && (
                <span className="rounded-full border border-white/8 bg-white/5
                                 px-3 py-0.5 text-xs font-medium text-white/40 tracking-wide">
                  {isNaN(Number(semestre)) ? semestre : `${semestre}º Sem`}
                </span>
              )}
              {glbUrl && (
                <span className="ml-auto rounded-full border border-white/8 bg-white/5
                                 px-2.5 py-0.5 text-xs text-white/25 tracking-wide">
                  3D
                </span>
              )}
            </div>
            <div className="mt-auto pt-6">
              {codigo && (
                <span className="text-xs font-mono text-white/25 tracking-widest uppercase mb-1 block">
                  {codigo}
                </span>
              )}
              <h2 className="text-base font-semibold text-white leading-snug mb-2 line-clamp-2
                             group-hover:text-[#4f9eff] transition-colors duration-200">
                {nome}
              </h2>
              <p className="text-sm text-white/45 leading-relaxed line-clamp-2">
                {descricao}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium
                              text-[#4f9eff]/50 group-hover:text-[#4f9eff] transition-colors duration-200">
                <span>Ver projetos</span>
                <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1"
                     fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
