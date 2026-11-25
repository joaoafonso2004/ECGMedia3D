'use client';

/**
 * ModelViewerContext — estado partilhado entre os DisciplinaCards e o ModelViewerGlobal.
 *
 * activeModel:
 *   {
 *     url:      string,   — URL do ficheiro GLB
 *     escala:   number,   — escala máxima da animação (vinda da BD, default 1.5)
 *     offset_y: number,   — deslocamento vertical do modelo (vinda da BD, default 0)
 *     cardId:   string,   — id do cartão (atributo data-hover-card)
 *     modo:     'rato' | 'toque', — passar o rato (computador) ou botão "Ver 3D" (telemóvel)
 *     breakout: boolean,  — cartão com vídeo: o canvas é maior para o modelo sair do cartão
 *     rect: {             — âncora do canvas (calculada em getBoundingClientRect)
 *       centerX: number,    — centro horizontal do palco do cartão no viewport
 *       centerY: number,    — centro vertical do palco do cartão no viewport
 *       canvasSize: number, — lado do canvas quadrado (2× maior lado do palco)
 *       w, h: number,       — largura e altura do palco
 *       recorte: boolean,   — sem vídeo: o modelo fica dentro do palco (o canvas é recortado)
 *     }
 *   }
 *   | null  →  nenhum modelo no ecrã
 */

import { createContext, useContext, useState } from 'react';

/**
 * Âncora do canvas a partir do palco do cartão (a zona onde o modelo aparece).
 * No telemóvel o canvas é menor: o cartão ocupa a largura do ecrã.
 * Só os cartões com vídeo deixam o modelo sair do cartão (breakout); nos outros
 * o canvas é recortado ao palco e o modelo é ajustado para caber nele.
 */
export function ancoraDoPalco(palco, breakout = false, toque = false) {
  const r = palco.getBoundingClientRect();
  const fator = toque ? (breakout ? 1.8 : 1.4) : (breakout ? 2.5 : 2);
  return {
    centerX: r.left + r.width / 2,
    centerY: r.top + r.height / 2,
    canvasSize: Math.max(r.width, r.height) * fator,
    w: r.width,
    h: r.height,
    recorte: !breakout,
  };
}

const ModelViewerCtx = createContext(null);

export function ModelViewerProvider({ children }) {
  const [activeModel, setActiveModel] = useState(null);

  return (
    <ModelViewerCtx.Provider value={{ activeModel, setActiveModel }}>
      {children}
    </ModelViewerCtx.Provider>
  );
}

/** Hook para ler/escrever o modelo activo. Lança erro se usado fora do Provider. */
export function useModelViewer() {
  const ctx = useContext(ModelViewerCtx);
  if (!ctx) throw new Error('useModelViewer deve ser usado dentro de <ModelViewerProvider>');
  return ctx;
}
