'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GaleriaComunidadePage() {
  const params = useParams();
  const router = useRouter();
  const id_modulo = params?.id;

  const [moduloInfo, setModuloInfo] = useState(null);
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para o Lightbox/Modal de visualização
  const [projetoEmDestaque, setProjetoEmDestaque] = useState(null);

  useEffect(() => {
    if (id_modulo) {
      fetchGaleria();
    }
  }, [id_modulo]);

  async function fetchGaleria() {
    setLoading(true);
    const supabase = createSupabaseBrowser();

    // 1. Buscar a informação da disciplina/módulo para o título da página
    const { data: moduloData } = await supabase
      .from('modulo')
      .select('nome, codigo')
      .eq('id_modulo', id_modulo)
      .single();

    if (moduloData) {
      setModuloInfo(moduloData);
    }

    // 2. Buscar TODOS os projetos desta disciplina que estejam APROVADOS
    const { data: mediaData, error } = await supabase
      .from('media_items')
      .select(`
        id_media_items,
        titulo,
        tipo,
        url,
        autor:id_autor (nome)
      `)
      .eq('id_modulo', id_modulo)
      .eq('status', 'aprovado')
      .order('id_media_items', { ascending: false });

    if (!error && mediaData) {
      setProjetos(mediaData);
    }
    
    setLoading(false);
  }

  // Função para distinguir se o ficheiro é uma imagem ou um vídeo
  const isImage = (tipo) => tipo && (tipo.includes('imagem') || tipo.includes('image'));

  return (
    <div className="min-h-screen bg-[#0c0c0f]">
      
      {/* ── Barra de Navegação Superior ── */}
      <div className="sticky top-0 z-10 bg-[#0c0c0f]/80 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center gap-4">
        <button 
          onClick={() => router.push('/utilizador/biblioteca')}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white leading-tight">
            {moduloInfo ? moduloInfo.nome : 'A carregar galeria...'}
          </h1>
          <p className="text-xs font-medium text-[#4f9eff]">
            {moduloInfo?.codigo ? `Módulo ${moduloInfo.codigo}` : 'Galeria da Comunidade'}
          </p>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/30 text-sm">
            A preparar o feed da comunidade...
          </div>
        ) : projetos.length === 0 ? (
          /* Estado Vazio */
          <div className="rounded-xl border border-white/8 bg-[#13131a] py-24 text-center flex flex-col items-center justify-center shadow-sm mt-10">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#4f9eff]/10 text-[#4f9eff] mb-5">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Ainda não há projetos aprovados</h3>
            <p className="text-sm text-white/40 max-w-md mt-2 leading-relaxed">
              Sê o primeiro a contribuir! Vai ao Criador de Vídeo, cria uma animação e pede a aprovação do teu professor.
            </p>
            <Link href="/utilizador/video-creator" className="mt-6 rounded-lg bg-[#4f9eff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3d8aef] transition shadow-md">
              Ir para o Criador de Vídeo
            </Link>
          </div>
        ) : (
          /* ── Grelha Estilo Biblioteca Pessoal ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projetos.map((proj) => (
              <div key={proj.id_media_items} className="group/card rounded-xl border border-white/8 bg-[#13131a] overflow-hidden flex flex-col shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/15">
                
                {/* Visualizador de Media Clicável */}
                <div 
                  className="aspect-video bg-black relative flex items-center justify-center border-b border-white/5 cursor-pointer overflow-hidden"
                  onClick={() => setProjetoEmDestaque(proj)}
                >
                  {proj.url ? (
                    isImage(proj.tipo) ? (
                      <img 
                        src={proj.url} 
                        alt={proj.titulo || 'Imagem'} 
                        className="w-full h-full object-cover transition-opacity duration-300 opacity-80 group-hover/card:opacity-100"
                      />
                    ) : (
                      <video 
                        src={`${proj.url}#t=0.001`} 
                        preload="metadata"
                        className="w-full h-full object-cover transition-opacity duration-300 opacity-80 group-hover/card:opacity-100" 
                        muted 
                        playsInline
                      />
                    )
                  ) : (
                    <span className="text-white/20">Media indisponível</span>
                  )}

                  {/* Ícone de Play central no hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 bg-black/30">
                    <div className="w-11 h-12 rounded-full bg-black/60 flex items-center justify-center text-white/90 backdrop-blur-sm shadow-md">
                      <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                  
                  {/* Etiqueta de Tipo Visual */}
                  <div className="absolute top-3 right-3 pointer-events-none opacity-100">
                    <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider shadow-sm border border-white/10">
                      {isImage(proj.tipo) ? 'Imagem' : proj.tipo === 'gif_gerado' ? 'GIF' : 'Vídeo'}
                    </span>
                  </div>
                </div>
                
                {/* Informação e Créditos do Autor */}
                <div className="p-4 flex flex-col bg-gradient-to-t from-[#0c0c0f] to-[#13131a]">
                  <h3 className="font-bold text-white/90 truncate mb-3" title={proj.titulo}>
                    {proj.titulo || 'Projeto Sem Título'}
                  </h3>
                  
                  {/* Mini-perfil do Autor */}
                  <div className="flex items-center gap-2.5 mt-auto pt-3 border-t border-white/5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4f9eff] to-[#3d8aef] flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                      {proj.autor?.nome ? proj.autor.nome.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/70 truncate">
                        {proj.autor?.nome || 'Utilizador Desconhecido'}
                      </p>
                    </div>
                  </div>
                </div>
                
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ════ MODAL DE VISUALIZAÇÃO DE MEDIA EM DESTAQUE ════ */}
      {projetoEmDestaque && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          
          <button 
            onClick={() => setProjetoEmDestaque(null)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors duration-200 z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="max-w-6xl w-full max-h-full flex flex-col items-center justify-center">
            {projetoEmDestaque.url ? (
              isImage(projetoEmDestaque.tipo) ? (
                <img 
                  src={projetoEmDestaque.url} 
                  alt={projetoEmDestaque.titulo} 
                  className="max-w-full max-h-[80vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-300"
                />
              ) : (
                <video 
                  src={projetoEmDestaque.url} 
                  controls 
                  autoPlay 
                  playsInline 
                  className="max-w-full max-h-[80vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 outline-none"
                />
              )
            ) : (
              <div className="text-white/50 py-20">Media indisponível.</div>
            )}
            
            <div className="mt-6 text-center">
              <h2 className="text-2xl font-bold text-white">{projetoEmDestaque.titulo || 'Projeto Sem Título'}</h2>
              <p className="text-sm text-white/40 mt-1 uppercase tracking-widest">
                Autor: {projetoEmDestaque.autor?.nome || 'Desconhecido'}
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}