'use client';

import { Environment, Lightformer } from '@react-three/drei';

/**
 * Iluminação de estúdio neutra, igual em todos os canvas 3D do site.
 *
 * Luzes diretas para a forma e um ambiente feito de painéis de luz
 * (Lightformer) para os reflexos: sem ele, metais e vidros (lentes,
 * garrafas, cromados) ficam pretos. O ambiente é gerado no próprio canvas,
 * uma só vez, sem descarregar imagens HDR.
 */
export default function LuzEstudio() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#d8d4cb', 0.6]} />
      <directionalLight position={[4, 6, 5]} intensity={1.3} />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} />

      <Environment resolution={64} frames={1}>
        {/* Teto e painéis laterais, como num estúdio de fotografia de produto */}
        <Lightformer form="rect" intensity={2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 1, -2]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#f6f5f2" position={[0, 0, -6]} scale={[12, 6, 1]} />
      </Environment>
    </>
  );
}
