'use client';

import { useState, useEffect } from 'react';

export default function GaleriaProjeto({ galeria }) {
  const [itemAtivo, setItemAtivo] = useState(null);

  // Bloqueia o scroll da página principal quando o modal está aberto
  useEffect(() => {
    if (itemAtivo) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    
    return () => { document.body.style.overflow = 'auto'; };
  }, [itemAtivo]);

  if (!galeria || galeria.length === 0) return null;

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pb-24 border-t border-white/5 pt-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-white/90">Galeria do Projeto</h2>
          <span className="text-sm font-mono text-white/30 bg-white/5 px-3 py-1 rounded-md">
            {galeria.length} itens
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galeria.map((item) => (
            <div 
              key={item.id_media_items} 
              onClick={() => setItemAtivo(item)}
              className="group relative rounded-xl border border-white/10 bg-[#13131a] overflow-hidden aspect-video cursor-pointer"
            >
              {/* Imagem / Video (Miniatura) */}
              {item.tipo === 'imagem' && (
                <img src={item.url} alt={item.titulo || 'Imagem do projeto'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              )}
              {item.tipo === 'video' && (
                <video src={item.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted loop playsInline />
              )}
              
              {/* Modelo 3D (Placeholder) */}
              {item.tipo === 'modelo3d' && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4f9eff]/10 to-transparent">
                  <span className="text-4xl mb-3 group-hover:scale-110 transition-transform">🧊</span>
                  <span className="px-4 py-2 bg-[#4f9eff] text-white text-xs font-semibold rounded-lg transition">
                    Ver Detalhes
                  </span>
                </div>
              )}

              {/* Overlay de Interação (Aparece no Hover) */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <span className="text-white bg-white/10 px-4 py-2 rounded-full backdrop-blur-md font-medium text-sm">
                  Ampliar
                </span>
              </div>

              {/* Etiqueta de Tipo */}
              <div className="absolute top-3 left-3 bg-black/60 text-white px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider backdrop-blur-md border border-white/10">
                {item.tipo}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modal / Lightbox ── */}
      {itemAtivo && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8"
          onClick={() => setItemAtivo(null)} // Clicar no fundo fecha o modal
        >
          {/* Botão de Fechar */}
          <button 
            onClick={() => setItemAtivo(null)}
            className="absolute top-4 right-6 text-white/50 hover:text-white transition-colors text-4xl font-light"
          >
            &times;
          </button>

          {/* Contentor do Elemento */}
          <div 
            className="relative max-w-5xl w-full max-h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()} // Impede que clicar na imagem feche o modal acidentalmente
          >
            {itemAtivo.tipo === 'imagem' && (
              <img src={itemAtivo.url} alt={itemAtivo.titulo} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" />
            )}
            
            {itemAtivo.tipo === 'video' && (
              <video src={itemAtivo.url} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" controls autoPlay playsInline />
            )}
            
            {itemAtivo.tipo === 'modelo3d' && (
              <div className="bg-[#13131a] border border-white/10 p-12 rounded-3xl flex flex-col items-center shadow-2xl text-center">
                <span className="text-6xl mb-6">🧊</span>
                <h3 className="text-2xl font-bold text-white mb-2">{itemAtivo.titulo || 'Modelo 3D'}</h3>
                <p className="text-white/40 mb-8 text-sm max-w-xs">Este elemento é um modelo 3D em formato GLB. Podes visualizá-lo em detalhe no visualizador nativo.</p>
                <a 
                  href={itemAtivo.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#4f9eff] px-8 py-3 rounded-xl text-white font-semibold hover:bg-[#3d8aef] transition shadow-lg shadow-[#4f9eff]/20"
                >
                  Abrir Modelo Original
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}