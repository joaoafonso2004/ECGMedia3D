'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AnimatedModel, Z_END } from '@/components/ModelScene';

export default function ModelViewer({
  url          = null,
  escala       = 1.5,
  offsetY      = 0,
  animacaoTipo = null,
  rotacaoX     = 0,
  rotacaoY     = 0,
  rotacaoZ     = 0,
  posicaoX     = 0,
}) {
  return (
    <Canvas
      camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
      gl={{ alpha: true, antialias: true }}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
        pointerEvents: 'none',
      }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <pointLight position={[0, 4, Z_END]} color="#4f9eff" intensity={3} distance={60} />

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
          />
        </Suspense>
      )}
    </Canvas>
  );
}
