/* eslint-disable @next/next/no-img-element -- endereços externos (R2, Supabase, outros sites) */
import { tipoMedia, NOME_TIPO } from '@/lib/media';
import { IconeCubo, IconePlay } from './Icones';

/**
 * Pré-visualização de um ficheiro da galeria (imagem, vídeo ou modelo 3D).
 * Os modelos 3D não têm imagem: mostram um ícone, e abrem no visualizador.
 */
export default function Miniatura({ item, className = '' }) {
  const tipo = tipoMedia(item);

  return (
    <div className={`relative aspect-video overflow-hidden rounded-lg border border-linha bg-mosaico ${className}`}>
      {tipo === 'imagem' && (
        <img src={item.url} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      )}

      {tipo === 'video' && (
        <>
          <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-12 place-items-center rounded-full bg-superficie/90 text-tinta shadow-sm">
              <IconePlay tamanho={20} />
            </span>
          </span>
        </>
      )}

      {(tipo === 'modelo' || tipo === 'outro') && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-tinta-2">
          <IconeCubo tamanho={34} espessura={1.4} />
          <span className="text-xs font-medium">{NOME_TIPO[tipo]}</span>
        </span>
      )}

      <span className="absolute inset-0 grid place-items-center bg-tinta/0 opacity-0 transition group-hover:bg-tinta/25 group-hover:opacity-100 group-focus-visible:bg-tinta/25 group-focus-visible:opacity-100">
        <span className="rounded-full bg-tinta px-3.5 py-1.5 text-xs font-medium text-papel">Ampliar</span>
      </span>
    </div>
  );
}
