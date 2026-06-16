'use client';

import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3, MathUtils } from 'three';

function LogoScene({ url, escala, animacao, rotacaoX = 0, rotacaoY = 0, rotacaoZ = 0, posicaoX = 0, posicaoY = 0 }) {
  const { scene } = useGLTF(url);
  const ref          = useRef(null);
  const t            = useRef(0);
  const autoScaleRef = useRef(1);

  useEffect(() => {
    if (!scene) return;
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    const maiorDimensao = Math.max(size.x, size.y, size.z);
    if (maiorDimensao > 0) autoScaleRef.current = 2.0 / maiorDimensao;
    if (ref.current) ref.current.scale.setScalar(autoScaleRef.current * escala);
  }, [scene, escala]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    t.current += delta;
    switch (animacao) {
      case 'rotation':
        ref.current.position.set(posicaoX, posicaoY, 0);
        ref.current.rotation.y += delta * 1.2;
        break;
      case 'float':
        ref.current.position.set(posicaoX, posicaoY + Math.sin(t.current * 1.5) * 0.3, 0);
        break;
      default:
        ref.current.position.set(posicaoX, posicaoY, 0);
        break;
    }
  });

  return (
    <group ref={ref} position={[posicaoX, posicaoY, 0]}>
      <group
        rotation={[
          MathUtils.degToRad(rotacaoX),
          MathUtils.degToRad(rotacaoY),
          MathUtils.degToRad(rotacaoZ),
        ]}
      >
        <primitive object={scene} />
      </group>
    </group>
  );
}

export default function LogoModelo3D({
  url,
  escala    = 1.0,
  animacao  = 'rotation',
  width     = 300,
  height    = 300,
  rotacaoX  = 0,
  rotacaoY  = 0,
  rotacaoZ  = 0,
  posicaoX  = 0,
  posicaoY  = 0,
}) {
  if (!url) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 200 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width, height, background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[0, 2, 3]} color="#4f9eff" intensity={4} distance={20} />
      <Suspense fallback={null}>
        <LogoScene
          url={url}
          escala={escala}
          animacao={animacao}
          rotacaoX={rotacaoX}
          rotacaoY={rotacaoY}
          rotacaoZ={rotacaoZ}
          posicaoX={posicaoX}
          posicaoY={posicaoY}
        />
      </Suspense>
    </Canvas>
  );
}
