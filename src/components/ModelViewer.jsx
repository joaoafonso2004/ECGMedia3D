'use client';

import { useRef, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Constantes zoom / rotation / float / pulse ───────────────── */
const Z_START   = -40;
const Z_END     = -8;
const S_START   = 0.3;
const CYCLE_SEC = 4.0;
const T_IN      = 0.33;
const T_ROT     = 0.67;

/* ─── Constantes breakout ──────────────────────────────────────── */
const BZ_START   = -10;  /* modelo começa atrás do card (longe da câmara) */
const BZ_END     =  4;   /* modelo sai para a frente do card               */
const BCYCLE_SEC =  3.5;

function eio(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ─── Cena com animação ────────────────────────────────────────── */
function AnimScene({ url, escala, offsetY, animacaoTipo }) {
  const { scene, animations } = useGLTF(url);
  const groupRef    = useRef(null);
  const timeRef     = useRef(0);
  const autoScaleRef = useRef(1);
  const { camera }  = useThree();
  const { actions } = useAnimations(animations, groupRef);

  /* Normalização automática de escala ao carregar o modelo */
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maiorDimensao = Math.max(size.x, size.y, size.z);
    if (maiorDimensao > 0) autoScaleRef.current = 2.0 / maiorDimensao;
  }, [scene]);

  /* Reposiciona câmara conforme o modo de animação */
  useEffect(() => {
    if (animacaoTipo === 'breakout') {
      camera.position.set(0, 0.5, 12);
      camera.fov = 50;
    } else {
      camera.position.set(0, 1, 0);
      camera.fov = 45;
    }
    camera.updateProjectionMatrix();
  }, [animacaoTipo, camera]);

  /* Animações nativas do GLB */
  useEffect(() => {
    const all = Object.values(actions);
    if (animacaoTipo === 'custom') {
      all.forEach(a => a?.reset().play());
    } else {
      all.forEach(a => a?.stop());
    }
  }, [animacaoTipo, actions]);

  /* Reset do relógio ao mudar de tipo */
  useEffect(() => {
    timeRef.current = 0;
    if (groupRef.current) groupRef.current.rotation.y = 0;
  }, [animacaoTipo]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;

    switch (animacaoTipo) {
      case 'breakout': {
        const c = (t % BCYCLE_SEC) / BCYCLE_SEC;
        const effScale = escala * autoScaleRef.current;
        let posZ, sc;
        if (c < 0.45) {
          /* avança: atrás → frente */
          const p = eio(c / 0.45);
          posZ = THREE.MathUtils.lerp(BZ_START, BZ_END, p);
          sc   = THREE.MathUtils.lerp(S_START, effScale, p);
        } else if (c < 0.55) {
          /* pausa na frente */
          posZ = BZ_END;
          sc   = effScale;
        } else {
          /* recua */
          const p = eio((c - 0.55) / 0.45);
          posZ = THREE.MathUtils.lerp(BZ_END, BZ_START, p);
          sc   = THREE.MathUtils.lerp(effScale, S_START, p);
        }
        groupRef.current.position.set(0, offsetY, posZ);
        groupRef.current.scale.setScalar(sc);
        groupRef.current.rotation.y += delta * 0.8;
        camera.lookAt(0, offsetY, posZ);
        break;
      }
      case 'zoom': {
        const c = (t % CYCLE_SEC) / CYCLE_SEC;
        const effScale = escala * autoScaleRef.current;
        let posZ, sc, rotY;
        if (c < T_IN) {
          const p = eio(c / T_IN);
          posZ = THREE.MathUtils.lerp(Z_START, Z_END, p);
          sc   = THREE.MathUtils.lerp(S_START, effScale, p);
          rotY = 0;
        } else if (c < T_ROT) {
          const p = (c - T_IN) / (T_ROT - T_IN);
          posZ = Z_END; sc = effScale; rotY = p * Math.PI * 2;
        } else {
          const p = eio((c - T_ROT) / (1 - T_ROT));
          posZ = THREE.MathUtils.lerp(Z_END, Z_START, p);
          sc   = THREE.MathUtils.lerp(effScale, S_START, p);
          rotY = Math.PI * 2;
        }
        groupRef.current.position.set(0, offsetY, posZ);
        groupRef.current.scale.setScalar(sc);
        groupRef.current.rotation.y = rotY;
        camera.lookAt(0, offsetY, posZ);
        break;
      }
      case 'rotation':
        groupRef.current.position.set(0, offsetY, Z_END);
        groupRef.current.scale.setScalar(escala * autoScaleRef.current);
        groupRef.current.rotation.y += delta * 1.5;
        camera.lookAt(0, offsetY, Z_END);
        break;
      case 'float':
        groupRef.current.position.set(0, offsetY + Math.sin(t * 1.5) * 0.5, Z_END);
        groupRef.current.scale.setScalar(escala * autoScaleRef.current);
        camera.lookAt(0, offsetY, Z_END);
        break;
      case 'pulse':
        groupRef.current.position.set(0, offsetY, Z_END);
        groupRef.current.scale.setScalar((escala + Math.sin(t * 2) * 0.1) * autoScaleRef.current);
        camera.lookAt(0, offsetY, Z_END);
        break;
      default: /* null, 'none', 'custom' */
        groupRef.current.position.set(0, offsetY, Z_END);
        groupRef.current.scale.setScalar(escala * autoScaleRef.current);
        groupRef.current.rotation.y = 0;
        camera.lookAt(0, offsetY, Z_END);
        break;
    }
  });

  const initZ = animacaoTipo === 'breakout' ? BZ_START
              : animacaoTipo === 'zoom'     ? Z_START
              : Z_END;
  const initS = (animacaoTipo === 'zoom' || animacaoTipo === 'breakout') ? S_START : escala * autoScaleRef.current;

  return (
    <group ref={groupRef} position={[0, offsetY, initZ]} scale={[initS, initS, initS]}>
      <primitive object={scene} />
    </group>
  );
}

/* ─── Canvas exportado ─────────────────────────────────────────── */
export default function ModelViewer({
  url          = null,
  escala       = 1.5,
  offsetY      = 0,
  animacaoTipo = null,
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
      <pointLight
        position={[0, 4, Z_END]}
        color="#4f9eff"
        intensity={3}
        distance={60}
      />

      {url && (
        <Suspense fallback={null}>
          <AnimScene
            key={url}
            url={url}
            escala={escala}
            offsetY={offsetY}
            animacaoTipo={animacaoTipo}
          />
        </Suspense>
      )}
    </Canvas>
  );
}
