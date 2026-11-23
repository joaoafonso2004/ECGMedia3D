'use client';

/* eslint-disable @next/next/no-img-element -- endereços externos (R2, Supabase, outros sites) */
import dynamic from 'next/dynamic';
import { tipoDoUrl } from '@/lib/media';
import { IconeCubo } from './Icones';

const VisualizadorModelo = dynamic(() => import('./VisualizadorModelo'), {
  ssr: false,
  loading: () => <div className="size-full bg-mosaico" />,
});

/**
 * Recurso principal da página do projeto.
 * Com modelo 3D: visualizador (a imagem do projeto fica como alternativa).
 * Sem modelo: a imagem ou o vídeo do projeto.
 */
export default function PalcoProjeto({ modelo = null, capa = null, titulo }) {
  const caixa = 'aspect-[4/3] w-full overflow-hidden sm:rounded-xl sm:border sm:border-linha';
  const tipoCapa = tipoDoUrl(capa);

  if (modelo) {
    return (
      <VisualizadorModelo
        key={modelo}
        url={modelo}
        imagem={tipoCapa === 'imagem' ? capa : null}
        titulo={`Modelo 3D: ${titulo}`}
        className={caixa}
      />
    );
  }

  return (
    <div className={`relative bg-mosaico ${caixa}`}>
      {tipoCapa === 'imagem' && <img src={capa} alt={titulo} className="size-full object-cover" />}
      {tipoCapa === 'video' && (
        <video src={capa} className="size-full object-cover" controls autoPlay muted loop playsInline />
      )}
      {(!tipoCapa || tipoCapa === 'modelo') && (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-tinta/25">
          <IconeCubo tamanho={56} espessura={1.1} />
        </span>
      )}
    </div>
  );
}
