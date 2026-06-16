'use client';

/**
 * ModelViewerGlobal — canvas WebGL singleton ancorado ao centro do card em hover.
 *
 * Posicionamento:
 *  • O canvas tem sempre `position: fixed` → não segue o scroll.
 *  • É centrado no ponto central do card (capturado em getBoundingClientRect).
 *  • O seu tamanho é 2× o lado maior do card → o modelo pode transbordar
 *    para fora dos limites do card sem ser cortado.
 *  • Sem overflow:hidden — o modelo cresce para além da área do card.
 *
 * Ciclo de vida:
 *  • Criado UMA VEZ (após o primeiro hover) e nunca desmontado → 1 contexto WebGL.
 *  • displayRectRef mantém a última posição conhecida para o fade-out ficar correcto.
 */

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useModelViewer } from '@/context/ModelViewerContext';

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false });

export default function ModelViewerGlobal() {
  const { activeModel } = useModelViewer();
  const isVisible = activeModel !== null;

  const [everActivated, setEverActivated] = useState(false);

  /* Guarda o último rect para manter a posição durante o fade-out */
  const displayRectRef = useRef(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (activeModel !== null) {
      setEverActivated(true);
      if (activeModel.rect) {
        displayRectRef.current = activeModel.rect;
        forceRender(n => n + 1);
      }
    }
  }, [activeModel]);

  const r    = displayRectRef.current;
  const size = r?.canvasSize ?? 700;
  const cx   = r?.centerX   ?? 0;
  const cy   = r?.centerY   ?? 0;

  return (
    <div
      aria-hidden="true"
      style={{
        /* Centrado no card, dimensão própria — não segue scroll */
        position : 'fixed',
        top      : `${cy - size / 2}px`,
        left     : `${cx - size / 2}px`,
        width    : `${size}px`,
        height   : `${size}px`,

        zIndex        : 9999,
        pointerEvents : 'none',
        /* Sem overflow:hidden → modelo pode transbordar o card */

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
        />
      )}
    </div>
  );
}
