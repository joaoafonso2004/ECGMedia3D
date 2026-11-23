'use client';

import dynamic from 'next/dynamic';
import { useMedia } from '@/lib/useMedia';

const LogoModelo3D = dynamic(() => import('./LogoModelo3D'), { ssr: false });

/**
 * Logótipo 3D do programa, no cabeçalho da página do programa.
 * Só em ecrãs grandes: no telemóvel não se carrega 3D sem o utilizador pedir.
 */
export default function LogoPrograma({ logo }) {
  const ecraGrande = useMedia('(min-width: 1024px)');
  if (!logo?.url || !ecraGrande) return null;

  return (
    <div aria-hidden="true" className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-linha bg-superficie">
      <LogoModelo3D
        url={logo.url}
        escala={logo.escala ?? 1}
        animacao={logo.animacao_tipo ?? 'rotation'}
        width="100%"
        height="100%"
        rotacaoX={logo.rotacao_x ?? 0}
        rotacaoY={logo.rotacao_y ?? 0}
        rotacaoZ={logo.rotacao_z ?? 0}
        posicaoX={logo.posicao_x ?? 0}
        posicaoY={logo.offset_y ?? 0}
      />
    </div>
  );
}
