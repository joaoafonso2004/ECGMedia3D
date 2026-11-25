'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatedModel } from '@/components/ModelScene';
import LuzEstudio from '@/components/LuzEstudio';

/* Telemóveis: menos píxeis por frame (o ecrã já tem densidade alta) */
const DPR_MAXIMO = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches ? 1.5 : 2;

export default function ModelViewer({
  url          = null,
  escala       = 1.5,
  offsetY      = 0,
  animacaoTipo = null,
  rotacaoX     = 0,
  rotacaoY     = 0,
  rotacaoZ     = 0,
  posicaoX     = 0,
  enquadrar    = null,
}) {
  return (
    <Canvas
      dpr={[1, DPR_MAXIMO]}
      camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
      gl={{ alpha: true, antialias: true }}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      {/* Luz de estúdio neutra: as texturas dos modelos mantêm as cores originais */}
      <LuzEstudio />

      {url && (
        <Suspense fallback={null}>
          <AnimatedModel
            key={url}
            url={url}
            escala={escala}
            offsetY={offsetY}
            animacaoTipo={animacaoTipo}
            rotacaoX={rotacaoX}
            rotacaoY={rotacaoY}
            rotacaoZ={rotacaoZ}
            posicaoX={posicaoX}
            enquadrar={enquadrar}
          />
        </Suspense>
      )}
    </Canvas>
  );
}
