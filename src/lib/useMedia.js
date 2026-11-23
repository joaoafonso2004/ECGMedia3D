'use client';

import { useSyncExternalStore } from 'react';

/**
 * true enquanto a media query corresponder (atualiza quando muda).
 * No servidor e na primeira renderização devolve `inicial`.
 */
export function useMedia(consulta, inicial = false) {
  return useSyncExternalStore(
    aviso => {
      const m = window.matchMedia(consulta);
      m.addEventListener('change', aviso);
      return () => m.removeEventListener('change', aviso);
    },
    () => window.matchMedia(consulta).matches,
    () => inicial,
  );
}

/** Ecrã tátil sem rato: não há "passar o rato", por isso o 3D abre com um botão */
export function useToque() {
  return useMedia('(hover: none)');
}
