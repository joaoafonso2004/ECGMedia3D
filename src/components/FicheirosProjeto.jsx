'use client';

import { useState } from 'react';
import Lightbox from './Lightbox';
import Miniatura from './Miniatura';
import { tipoMedia, NOME_TIPO } from '@/lib/media';
import { resolverTermos, doTermo } from '@/lib/terminologia';

/**
 * Ficheiros anexados a um projeto (imagens, vídeos e modelos 3D).
 * Computador: grelha. Telemóvel: uma linha com scroll horizontal.
 * Cada ficheiro abre em ecrã inteiro.
 */
export default function FicheirosProjeto({ itens = [], termos = null }) {
  const t = termos ?? resolverTermos();
  const [aberto, setAberto] = useState(null);
  if (itens.length === 0) return null;

  return (
    <section aria-labelledby="ficheiros-titulo" className="mt-14">
      <div className="flex items-center justify-between gap-4 border-b border-linha pb-3">
        <h2 id="ficheiros-titulo" className="text-[clamp(20px,1.8vw,26px)] font-semibold tracking-[-0.02em]">
          Ficheiros {doTermo(t.projeto)}
        </h2>
        <span className="rounded-md border border-linha-2 px-2 py-0.5 text-xs text-cinza">
          {itens.length} {itens.length === 1 ? 'anexo' : 'anexos'}
        </span>
      </div>

      <ul
        className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]
                   sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4"
      >
        {itens.map((item, i) => (
          <li key={item.id ?? i} className="w-[72%] shrink-0 snap-start sm:w-auto">
            <button
              type="button"
              onClick={() => setAberto(i)}
              className="group block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-acao/30"
            >
              <Miniatura item={item} />
              <span className="mt-2 block truncate text-sm text-tinta-2">
                <span className="font-medium text-tinta">{NOME_TIPO[tipoMedia(item)]}</span>
                {item.titulo ? ` · ${item.titulo}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {aberto !== null && (
        <Lightbox itens={itens} indice={aberto} onMudar={setAberto} onFechar={() => setAberto(null)} />
      )}
    </section>
  );
}
