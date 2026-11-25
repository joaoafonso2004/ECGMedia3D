'use client';

/**
 * ModelViewerGlobal — canvas WebGL singleton ancorado ao palco do cartão ativo.
 *
 * Posicionamento:
 *  • O canvas tem sempre `position: fixed`.
 *  • É centrado no palco do cartão (capturado em getBoundingClientRect).
 *  • Cartões com vídeo: o canvas é maior do que o palco e o modelo sai do cartão.
 *  • Os outros: o canvas é recortado ao palco e o modelo é ajustado para caber.
 *
 * Modos:
 *  • 'rato'  — passar o rato: ao fazer scroll, se o cursor já não estiver
 *              sobre o mesmo cartão, o modelo desaparece.
 *  • 'toque' — botão "Ver 3D" no telemóvel: o canvas acompanha o cartão
 *              durante o scroll e pára quando o cartão sai do ecrã.
 *
 * Ciclo de vida:
 *  • Criado UMA VEZ (no primeiro modelo pedido) e nunca desmontado → 1 contexto WebGL.
 *    Até lá não se carrega nada de 3D.
 *  • `ancora` mantém a última posição conhecida para o fade-out ficar correcto.
 */

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useModelViewer, ancoraDoPalco } from '@/context/ModelViewerContext';

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false });

/** Palco do cartão com este id (o elemento marcado com data-palco) */
function palcoDoCartao(cardId) {
  const cartao = document.querySelector(`[data-hover-card="${CSS.escape(String(cardId))}"]`);
  return cartao?.querySelector('[data-palco]') ?? cartao;
}

export default function ModelViewerGlobal() {
  const { activeModel, setActiveModel } = useModelViewer();
  const isVisible = activeModel !== null;

  /* Referência estável para o modelo ativo — acessível em handlers sem stale closure */
  const activeModelRef = useRef(activeModel);
  useEffect(() => { activeModelRef.current = activeModel; }, [activeModel]);

  /* Última posição do canvas: mantém-se durante o fade-out.
     O canvas só é criado no primeiro modelo pedido (everActivated). */
  const [ancora, setAncora] = useState(null);
  const [everActivated, setEverActivated] = useState(false);
  const [modeloAnterior, setModeloAnterior] = useState(null);
  if (activeModel !== modeloAnterior) {
    setModeloAnterior(activeModel);
    if (activeModel !== null) {
      setEverActivated(true);
      if (activeModel.rect) setAncora(activeModel.rect);
    }
  }

  /* Última posição conhecida do cursor — atualizada por um listener leve */
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function trackMouse(e) { lastMousePos.current = { x: e.clientX, y: e.clientY }; }
    window.addEventListener('mousemove', trackMouse, { passive: true });
    return () => window.removeEventListener('mousemove', trackMouse);
  }, []);

  /* Modo rato: ao fazer scroll, o modelo só fica se o cursor continuar no mesmo cartão */
  useEffect(() => {
    function handleScroll() {
      const model = activeModelRef.current;
      if (model === null || model.modo === 'toque') return;

      /* O canvas global tem z-index 9999 e cobre o card. elementFromPoint devolveria
         o canvas, não o card. elementsFromPoint devolve a pilha completa de elementos
         naquelas coordenadas, permitindo encontrar o card por baixo do canvas. */
      const { x, y } = lastMousePos.current;
      const stack = document.elementsFromPoint(x, y);
      let cardUnderCursor = null;
      for (const el of stack) {
        const c = el.closest?.('[data-hover-card]');
        if (c) { cardUnderCursor = c; break; }
      }

      const stillOnSameCard = cardUnderCursor?.dataset?.hoverCard === model.cardId;
      if (!stillOnSameCard) setActiveModel(null);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setActiveModel]);

  /* Modo toque: o canvas segue o cartão; fora do ecrã, a animação pára */
  useEffect(() => {
    let frame = 0;

    function seguir() {
      frame = 0;
      const model = activeModelRef.current;
      if (model === null || model.modo !== 'toque') return;

      const palco = palcoDoCartao(model.cardId);
      if (!palco) { setActiveModel(null); return; }

      const r = palco.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) { setActiveModel(null); return; }

      setAncora(ancoraDoPalco(palco, model.breakout, true));
    }
    function agendar() { if (!frame) frame = requestAnimationFrame(seguir); }

    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', agendar);
    return () => {
      window.removeEventListener('scroll', agendar);
      window.removeEventListener('resize', agendar);
      cancelAnimationFrame(frame);
    };
  }, [setActiveModel]);

  const size = ancora?.canvasSize ?? 700;
  const cx   = ancora?.centerX   ?? 0;
  const cy   = ancora?.centerY   ?? 0;

  /* Sem vídeo: só se vê a zona do palco (cantos de cima arredondados, como o cartão)
     e o modelo é ajustado para caber nela */
  const recortar = Boolean(ancora?.recorte && ancora.w && ancora.h);
  const recorte = recortar
    ? `inset(${(size - ancora.h) / 2}px ${(size - ancora.w) / 2}px round 11px 11px 0 0)`
    : undefined;
  const enquadrar = recortar ? { fw: ancora.w / size, fh: ancora.h / size } : null;

  return (
    <div
      aria-hidden="true"
      style={{
        /* Centrado no palco do cartão, dimensão própria */
        position : 'fixed',
        top      : `${cy - size / 2}px`,
        left     : `${cx - size / 2}px`,
        width    : `${size}px`,
        height   : `${size}px`,

        zIndex        : 40,
        pointerEvents : 'none',
        /* Com vídeo (breakout) não há recorte: o modelo pode sair do cartão */
        clipPath      : recorte,

        opacity    : isVisible ? 1 : 0,
        transition : 'opacity 0.35s ease',
      }}
    >
      {everActivated && (
        <ModelViewer
          url={activeModel?.url             ?? null}
          escala={activeModel?.escala        ?? 1.5}
          offsetY={activeModel?.offset_y     ?? 0}
          animacaoTipo={activeModel?.animacao_tipo ?? null}
          rotacaoX={activeModel?.rotacao_x   ?? 0}
          rotacaoY={activeModel?.rotacao_y   ?? 0}
          rotacaoZ={activeModel?.rotacao_z   ?? 0}
          posicaoX={activeModel?.posicao_x   ?? 0}
          enquadrar={enquadrar}
        />
      )}
    </div>
  );
}
