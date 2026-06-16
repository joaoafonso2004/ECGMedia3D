'use client';

import dynamic from 'next/dynamic';

const LogoModelo3D = dynamic(() => import('@/components/LogoModelo3D'), { ssr: false });

export default function LogoHero({ url, escala = 1.0, animacao = 'rotation', width = 300, height = 300, rotacaoX = 0, rotacaoY = 0, rotacaoZ = 0, posicaoX = 0, posicaoY = 0 }) {
  return <LogoModelo3D url={url} escala={escala} animacao={animacao} width={width} height={height} rotacaoX={rotacaoX} rotacaoY={rotacaoY} rotacaoZ={rotacaoZ} posicaoX={posicaoX} posicaoY={posicaoY} />;
}
