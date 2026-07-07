'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GaleriaProjeto({ 
  galeria = [], 
  comunidade = [], 
  projetos = [], 
  isPaginaDisciplina = false,
  entitySlug = '',
  progSlug = '',
  moduloSlug = ''
}) {
  // Predefinição para o estado das Tabs
  const [activeTab, setActiveTab] = useState(isPaginaDisciplina ? 'projetos' : null); 
  const [itemAtivo, setItemAtivo] = useState(null);

  useEffect(() => {
    if (itemAtivo) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    
    return () => { document.body.style.overflow = 'auto'; };
  }, [itemAtivo]);

  const isImage = (tipo) => ['imagem', 'imagem_externa', 'gif_gerado'].includes(tipo);
  const isVideo = (tipo) => ['video', 'video_externo', 'video_generated', 'video_gerado'].includes(tipo);

  // Se NÃO for a página da disciplina e a galeria do projeto estiver vazia, não desenhamos nada
  if (!isPaginaDisciplina && galeria.length === 0) return null;

  return (
    <>
      <section className="mx-auto max-w-6xl w-full px-6 pb-24 pt-6">
        
        {/* ── Tabs de Navegação Dinâmica ── */}
        {isPaginaDisciplina ? (
          <>
            <div className="flex items-center gap-8 mb-6 border-b border-white/5">
              <button
                onClick={() => setActiveTab('projetos')}
                className={`pb-3.5 text-[15px] font-semibold tracking-wide transition-all relative
                  ${activeTab === 'projetos' ? 'text-[#4f9eff]' : 'text-white/40 hover:text-white/70'}`}
              >
                Projetos Publicados
                {activeTab === 'projetos' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#4f9eff] rounded-t-full shadow-[0_0_8px_rgba(79,158,255,0.6)]"></span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('comunidade')}
                className={`pb-3.5 text-[15px] font-semibold tracking-wide transition-all relative
                  ${activeTab === 'comunidade' ? 'text-[#4f9eff]' : 'text-white/40 hover:text-white/70'}`}
              >
                Biblioteca da Comunidade
                {activeTab === 'comunidade' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#4f9eff] rounded-t-full shadow-[0_0_8px_rgba(79,158,255,0.6)]"></span>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mb-8">
              <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">
                {activeTab === 'projetos' ? 'Projetos práticos desenvolvidos' : 'Recursos individuais aprovados'}
              </p>
              <span className="text-[11px] font-mono text-white/40 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 select-none">
                {activeTab === 'projetos' && `${projetos.length} ${projetos.length === 1 ? 'projeto' : 'projetos'}`}
                {activeTab === 'comunidade' && `${comunidade.length} ${comunidade.length === 1 ? 'item' : 'itens'}`}
              </span>
            </div>
          </>
        ) : (
          /* Cabeçalho Simples para a página do Projeto (Sem Abas) */
          <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
            <h2 className="text-xl font-semibold text-white/90">Ficheiros do Projeto</h2>
            <span className="text-[11px] font-mono text-white/40 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 select-none">
              {galeria.length} {galeria.length === 1 ? 'anexo' : 'anexos'}
            </span>
          </div>
        )}

        {/* ── RENDERIZAÇÃO DOS CONTEÚDOS CONFORME A TAB ATIVA ── */}

        {/* ABA 1: PROJETOS DA DISCIPLINA */}
        {activeTab === 'projetos' && isPaginaDisciplina && (
          projetos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#13131a]/50 py-20 text-center">
              <span className="text-4xl block mb-4 opacity-30">📁</span>
              <p className="text-white/40 text-sm">Ainda não foram publicados projetos nesta disciplina.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projetos.map((projeto) => (
                <Link 
                  href={`/${entitySlug}/${progSlug}/${moduloSlug}/${projeto.id_projetos}`}
                  key={projeto.id_projetos}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[#13131a] transition-all hover:border-[#4f9eff]/40 hover:bg-[#181820] cursor-pointer"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-white/2 border-b border-white/5">
                    {projeto.projeto_url ? (
                      projeto.projeto_url.endsWith('.mp4') || projeto.projeto_url.endsWith('.webm') ? (
                        <video src={projeto.projeto_url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" muted loop playsInline autoPlay />
                      ) : (
                        <img src={projeto.projeto_url} alt={projeto.titulo} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      )
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/15 text-3xl bg-gradient-to-br from-white/3 to-transparent">📁</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors line-clamp-1">{projeto.titulo}</h3>
                      {projeto.descricao && <p className="mt-2 text-sm text-white/40 line-clamp-3 leading-relaxed">{projeto.descricao}</p>}
                    </div>
                    <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-4">
                      {projeto.autores && (
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-white/20 pt-0.5">Autores</span>
                          <p className="text-xs font-medium text-white/60 leading-tight line-clamp-2">{projeto.autores}</p>
                        </div>
                      )}
                      <span className="mt-1 text-xs font-semibold text-[#4f9eff]/80 group-hover:text-[#4f9eff] transition-colors self-start">Ver Projeto →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* CENA 2: GALERIA INDIVIDUAL DE UM PROJETO (Quando na rota de projeto individual) */}
        {!isPaginaDisciplina && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galeria.map((item) => (
              <div key={item.id_media_items} onClick={() => setItemAtivo(item)} className="group relative rounded-xl border border-white/10 bg-[#13131a] overflow-hidden aspect-video cursor-pointer shadow-md hover:border-white/15 transition-all duration-300">
                <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                  {isImage(item.tipo) && <img src={item.url} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300" />}
                  {isVideo(item.tipo) && <video src={`${item.url}#t=0.1`} preload="metadata" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300" muted playsInline />}
                  {item.tipo === 'modelo3d' && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4f9eff]/10 to-transparent">
                      <span className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">🧊</span>
                      <span className="text-[11px] font-bold text-[#4f9eff] uppercase tracking-wider bg-[#4f9eff]/10 px-2.5 py-1 rounded-md border border-[#4f9eff]/20">Elemento 3D</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <span className="text-white bg-black/60 border border-white/10 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide">Ampliar</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ABA 3: BIBLIOTECA DA COMUNIDADE (APROVADOS) */}
        {activeTab === 'comunidade' && isPaginaDisciplina && (
          comunidade.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-[#13131a]/30 py-16 text-center text-sm text-white/25 italic">Ainda não existem recursos partilhados na biblioteca comunitária deste módulo.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {comunidade.map((item) => (
                <div key={item.id_media_items} onClick={() => setItemAtivo(item)} className="group relative rounded-xl border border-white/10 bg-[#13131a] overflow-hidden aspect-video cursor-pointer shadow-md hover:border-white/15 transition-all duration-300">
                  <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                    {isImage(item.tipo) && <img src={item.url} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300" />}
                    {isVideo(item.tipo) && <video src={`${item.url}#t=0.1`} preload="metadata" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-300" muted playsInline />}
                    {item.tipo === 'modelo3d' && (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#4f9eff]/10 to-transparent">
                        <span className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">🧊</span>
                        <span className="text-[11px] font-bold text-[#4f9eff] uppercase tracking-wider bg-[#4f9eff]/10 px-2.5 py-1 rounded-md border border-[#4f9eff]/20">Elemento 3D</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                      <span className="text-white bg-black/60 border border-white/10 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide">Ampliar Conteúdo</span>
                    </div>

                    {item.autor?.nome && (
                      <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-md border border-white/5 rounded-lg px-2.5 py-1.5 flex items-center gap-2 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="w-4 h-4 rounded-full bg-[#4f9eff] text-white font-bold text-[9px] flex items-center justify-center uppercase">{item.autor.nome.charAt(0)}</div>
                        <p className="text-[10px] text-white/80 font-medium truncate">Por: {item.autor.nome}</p>
                      </div>
                    )}

                    {item.titulo && (
                      <div className="absolute top-3 left-3 bg-black/60 text-white/90 px-2.5 py-1 rounded-md text-[10px] font-semibold backdrop-blur-md border border-white/5 max-w-[180px] truncate pointer-events-none">{item.titulo}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Lightbox / Modal de Ficheiro Aberto ── */}
      {itemAtivo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200" onClick={() => setItemAtivo(null)}>
          <button onClick={() => setItemAtivo(null)} className="absolute top-6 right-6 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all text-2xl font-light z-10">&times;</button>
          <div className="relative max-w-5xl w-full max-h-[80vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            {isImage(itemAtivo.tipo) && <img src={itemAtivo.url} alt="" className="max-w-full max-h-[75vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-300" />}
            
            {/* 'muted' e 'loop' para contornar o bloqueio do Autoplay */}
            {isVideo(itemAtivo.tipo) && (
              <video 
                src={itemAtivo.url} 
                className="max-w-full max-h-[75vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 outline-none" 
                controls 
                autoPlay 
                loop 
                playsInline 
              />
            )}
            
            {itemAtivo.tipo === 'modelo3d' && (
              <div className="bg-[#13131a] border border-white/10 p-10 rounded-2xl flex flex-col items-center shadow-2xl text-center max-w-sm animate-in zoom-in-95 duration-300">
                <span className="text-5xl mb-4">🧊</span>
                <h3 className="text-xl font-bold text-white mb-2">{itemAtivo.titulo || 'Modelo 3D'}</h3>
                <p className="text-white/40 mb-6 text-xs leading-relaxed">Este elemento é um modelo 3D encapsulado em formato compilado GLB. Podes transferi-lo para inspecionar localmente.</p>
                <a href={itemAtivo.url} target="_blank" rel="noopener noreferrer" className="bg-[#4f9eff] px-6 py-2.5 rounded-xl text-white text-sm font-semibold hover:bg-[#3d8aef] transition shadow-lg shadow-[#4f9eff]/10">Descarregar Ficheiro GLB</a>
              </div>
            )}
            {itemAtivo.titulo && (
              <div className="mt-4 text-center">
                <h4 className="text-lg font-bold text-white/90">{itemAtivo.titulo}</h4>
                {itemAtivo.autor?.nome && <p className="text-xs text-white/40 mt-0.5">Submetido por {itemAtivo.autor.nome}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}