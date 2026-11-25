'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

/* ─── Constantes de animação ────────────────────────────────────── */
export const Z_START   = -40;
export const Z_END     = -8;
export const S_START   = 0.3;
export const CYCLE_SEC = 4.0;
export const T_IN      = 0.33;
export const T_ROT     = 0.67;

export const BZ_START   = -10;
export const BZ_END     =  4;
export const BCYCLE_SEC =  3.5;

function eio(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* Altura visível (unidades 3D) à distância do modelo: câmara em (0,1,0), fov 45, modelo em z = Z_END */
const ALTURA_VISIVEL = 2 * Math.hypot(1, Z_END) * Math.tan(THREE.MathUtils.degToRad(45 / 2));
const RODAM = ['rotation', 'zoom', 'breakout'];

/**
 * Escala que faz o modelo caber no palco do cartão (com margem), tendo em conta
 * a rotação: a rodar sobre Y, a largura que conta é o raio no plano XZ.
 * enquadrar = { fw, fh }: largura e altura do palco em fração do canvas (quadrado).
 */
function escalaQueCabe(caixa, autoScale, enquadrar, { animacaoTipo, offsetY, posicaoX }) {
  const larguraPalco = ALTURA_VISIVEL * enquadrar.fw;
  const alturaPalco  = ALTURA_VISIVEL * enquadrar.fh;

  const xs = [caixa.min.x, caixa.max.x];
  const zs = [caixa.min.z, caixa.max.z];
  const meiaLargura = RODAM.includes(animacaoTipo)
    ? Math.max(...xs.flatMap(x => zs.map(z => Math.hypot(x, z))))
    : Math.max(...xs.map(Math.abs));
  const meiaAltura = Math.max(Math.abs(caixa.min.y), Math.abs(caixa.max.y));

  const livreX = larguraPalco * 0.84 / 2 - Math.abs(posicaoX);
  const livreY = alturaPalco * 0.78 / 2 - Math.abs(offsetY) - (animacaoTipo === 'float' ? 0.5 : 0);
  const porX = livreX / Math.max(meiaLargura * autoScale, 1e-6);
  const porY = livreY / Math.max(meiaAltura * autoScale, 1e-6);
  return Math.max(0.05, Math.min(porX, porY) - (animacaoTipo === 'pulse' ? 0.1 : 0));
}

/* ─── Componente partilhado de modelo animado ───────────────────── */
export function AnimatedModel({
  url,
  escala       = 1.5,
  offsetY      = 0,
  animacaoTipo = null,
  rotacaoX     = 0,
  rotacaoY     = 0,
  rotacaoZ     = 0,
  posicaoX     = 0,
  enquadrar    = null, // { fw, fh }: o modelo tem de caber no palco do cartão
}) {
  const { scene, animations } = useGLTF(url);
  const groupRef   = useRef(null);
  const timeRef    = useRef(0);
  const { camera } = useThree();

  // SkeletonUtils.clone remapeia bone bindings em modelos com rig/skinning.
  // useMemo garante que o mesmo clone é reutilizado entre re-renders — sem isto
  // o AnimationMixer perde as referências aos bones em cada render.
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const { actions } = useAnimations(animations, groupRef);

  // Computado sincronamente: Suspense garante que clonedScene está pronto antes do 1.º render.
  // Evita o salto visual que useEffect causava (frame 1 com autoScale=1, frame 2 com valor real).
  // Também extrai o centro do bbox para ancorar o pivot de escala ao centro visual do modelo.
  const scaleInfo = useMemo(() => {
    const box    = new THREE.Box3().setFromObject(clonedScene);
    const size   = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maiorDimensao = Math.max(size.x, size.y, size.z);
    return { autoScale: maiorDimensao > 0 ? 2.0 / maiorDimensao : 1, center, box };
  }, [clonedScene]);

  // Caixa do modelo já centrada e rodada como aparece no ecrã
  const caixaRodada = useMemo(() => {
    const rotacao = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(rotacaoX),
      THREE.MathUtils.degToRad(rotacaoY),
      THREE.MathUtils.degToRad(rotacaoZ),
    ));
    return scaleInfo.box.clone().translate(scaleInfo.center.clone().negate()).applyMatrix4(rotacao);
  }, [scaleInfo, rotacaoX, rotacaoY, rotacaoZ]);

  // No palco do cartão, a escala da BD é um máximo: o modelo nunca passa dos limites
  const fw = enquadrar?.fw;
  const fh = enquadrar?.fh;
  const escalaFinal = useMemo(() => (
    fw && fh
      ? Math.min(escala, escalaQueCabe(caixaRodada, scaleInfo.autoScale, { fw, fh }, { animacaoTipo, offsetY, posicaoX }))
      : escala
  ), [escala, fw, fh, caixaRodada, scaleInfo.autoScale, animacaoTipo, offsetY, posicaoX]);

  // Valor acessível em useFrame sem stale closure
  const autoScaleRef = useRef(scaleInfo.autoScale);
  autoScaleRef.current = scaleInfo.autoScale;

  // Repositiciona câmara conforme o modo de animação
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

  // Animações nativas do GLB
  useEffect(() => {
    const all = Object.values(actions);
    if (animacaoTipo === 'custom') {
      all.forEach(a => a?.reset().play());
    } else {
      all.forEach(a => a?.stop());
    }
  }, [animacaoTipo, actions]);

  // Reset do relógio ao mudar de tipo
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
        const effScale = escalaFinal * autoScaleRef.current;
        let posZ, sc;
        if (c < 0.45) {
          const p = eio(c / 0.45);
          posZ = THREE.MathUtils.lerp(BZ_START, BZ_END, p);
          sc   = THREE.MathUtils.lerp(S_START, effScale, p);
        } else if (c < 0.55) {
          posZ = BZ_END;
          sc   = effScale;
        } else {
          const p = eio((c - 0.55) / 0.45);
          posZ = THREE.MathUtils.lerp(BZ_END, BZ_START, p);
          sc   = THREE.MathUtils.lerp(effScale, S_START, p);
        }
        groupRef.current.position.set(posicaoX, offsetY, posZ);
        groupRef.current.scale.setScalar(sc);
        groupRef.current.rotation.y += delta * 0.8;
        camera.lookAt(0, 0, posZ);
        break;
      }
      case 'zoom': {
        const c = (t % CYCLE_SEC) / CYCLE_SEC;
        const effScale = escalaFinal * autoScaleRef.current;
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
        groupRef.current.position.set(posicaoX, offsetY, posZ);
        groupRef.current.scale.setScalar(sc);
        groupRef.current.rotation.y = rotY;
        camera.lookAt(0, 0, posZ);
        break;
      }
      case 'rotation':
        groupRef.current.position.set(posicaoX, offsetY, Z_END);
        groupRef.current.scale.setScalar(escalaFinal * autoScaleRef.current);
        groupRef.current.rotation.y += delta * 1.5;
        camera.lookAt(0, 0, Z_END);
        break;
      case 'float':
        groupRef.current.position.set(posicaoX, offsetY + Math.sin(t * 1.5) * 0.5, Z_END);
        groupRef.current.scale.setScalar(escalaFinal * autoScaleRef.current);
        camera.lookAt(0, 0, Z_END);
        break;
      case 'pulse':
        groupRef.current.position.set(posicaoX, offsetY, Z_END);
        groupRef.current.scale.setScalar((escalaFinal + Math.sin(t * 2) * 0.1) * autoScaleRef.current);
        camera.lookAt(0, 0, Z_END);
        break;
      default: /* null, 'none', 'custom' */
        groupRef.current.position.set(posicaoX, offsetY, Z_END);
        groupRef.current.scale.setScalar(escalaFinal * autoScaleRef.current);
        groupRef.current.rotation.y = 0;
        camera.lookAt(0, 0, Z_END);
        break;
    }
  });

  const initZ = animacaoTipo === 'breakout' ? BZ_START
              : animacaoTipo === 'zoom'     ? Z_START
              : Z_END;
  const initS = (animacaoTipo === 'zoom' || animacaoTipo === 'breakout')
              ? S_START
              : escalaFinal * autoScaleRef.current;

  return (
    <group ref={groupRef} position={[posicaoX, offsetY, initZ]} scale={[initS, initS, initS]}>
      <group
        rotation={[
          THREE.MathUtils.degToRad(rotacaoX),
          THREE.MathUtils.degToRad(rotacaoY),
          THREE.MathUtils.degToRad(rotacaoZ),
        ]}
      >
        {/* Subtrai o centro do bbox para que o pivot de escala coincida com o centro visual */}
        <group position={[-scaleInfo.center.x, -scaleInfo.center.y, -scaleInfo.center.z]}>
          <primitive object={clonedScene} />
        </group>
      </group>
    </group>
  );
}
