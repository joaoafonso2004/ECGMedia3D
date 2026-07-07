'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function UtilizadorBiblioteca() {
  const [activeTab, setActiveTab] = useState('comunidade'); // 'comunidade' | 'pessoal'
  const [disciplinas, setDisciplinas] = useState([]);
  const [meusProjetos, setMeusProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Estados para o modal de aprovação
  const [projetoParaAprovar, setProjetoParaAprovar] = useState(null);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState('');

  // Estados para o modal de apagar projeto
  const [projetoParaApagar, setProjetoParaApagar] = useState(null);

  // Estados para visualizar um projeto em tamanho real
  const [projetoEmDestaque, setProjetoEmDestaque] = useState(null);

  // Estados para o Upload Externo
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ titulo: '', file: null, uploading: false });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Buscar disciplinas associadas ao aluno (Comunidade)
    const { data: discData } = await supabase
      .from('tipo_utilizador')
      .select(`id_modulo, modulo:id_modulo (nome, codigo)`)
      .eq('id_utilizador', user.id)
      .eq('role', 'utilizador')
      .not('id_modulo', 'is', null);

    // 2. Buscar projetos criados por este utilizador (Pessoal)
    const { data: mediaData } = await supabase
      .from('media_items')
      .select('*')
      .eq('id_autor', user.id)
      .order('id_media_items', { ascending: false });

    setDisciplinas(discData || []);
    setMeusProjetos(mediaData || []);
    setLoading(false);
  }

  // ─── LÓGICA DE APROVAÇÃO ─────────────────────────────────────────
  function abrirModalAprovacao(projeto) {
    setProjetoParaAprovar(projeto);
    setDisciplinaSelecionada('');
  }

  async function confirmarPedidoAprovacao() {
    if (!projetoParaAprovar) return;
    if (!disciplinaSelecionada) {
      alert("Por favor, seleciona a disciplina para a qual queres submeter este projeto.");
      return;
    }
    
    const id_media = projetoParaAprovar.id_media_items;
    setActionLoading(id_media);
    const supabase = createSupabaseBrowser();
    
    const { error } = await supabase
      .from('media_items')
      .update({ 
        status: 'pendente',
        id_modulo: disciplinaSelecionada 
      })
      .eq('id_media_items', id_media);

    if (!error) {
      setProjetoParaAprovar(null);
      await fetchData(); 
    } else {
      alert("Erro ao pedir aprovação: " + error.message);
    }
    setActionLoading(null);
  }

  // ─── LÓGICA DE APAGAR PROJETO ────────────────────────────────────
  function abrirModalApagar(projeto) {
    setProjetoParaApagar(projeto);
  }

  async function confirmarApagar() {
    if (!projetoParaApagar) return;

    const id_media = projetoParaApagar.id_media_items;
    setActionLoading(id_media);
    const supabase = createSupabaseBrowser();

    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id_media_items', id_media);

    if (!error) {
      // Remove do estado local para ser instantâneo na UI
      setMeusProjetos(prev => prev.filter(p => p.id_media_items !== id_media));
      setProjetoParaApagar(null);
    } else {
      alert("Erro ao apagar o projeto: " + error.message);
    }
    setActionLoading(null);
  }

  // ─── LÓGICA DE UPLOAD EXTERNO ────────────────────────────────────
  async function handleUploadExterno(e) {
    e.preventDefault();
    if (!uploadData.file) {
      alert('Por favor seleciona um ficheiro válido.');
      return;
    }
    if (!uploadData.titulo.trim()) {
      alert('Por favor dá um título ao teu projeto.');
      return;
    }

    setUploadData(prev => ({ ...prev, uploading: true }));
    
    try {
      const supabase = createSupabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Upload para o Cloudflare via API
      const formData = new FormData();
      formData.append('file', uploadData.file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro ao enviar ficheiro para o servidor.');
      }
      
      const { url } = await res.json();

      // Identificar o tipo básico
      const ext = uploadData.file.name.split('.').pop().toLowerCase();
      const isImg = ['png', 'jpg', 'jpeg', 'gif'].includes(ext);

      // 2. Registar na base de dados
      const { error: dbError } = await supabase
        .from('media_items')
        .insert([{
          titulo: uploadData.titulo.trim(),
          url: url,
          tipo: isImg ? 'imagem_externa' : 'video_externo',
          id_autor: user.id,
          status: 'pessoal'
        }]);

      if (dbError) throw new Error('Erro ao registar na base de dados: ' + dbError.message);

      // Limpar e fechar
      setIsUploadModalOpen(false);
      setUploadData({ titulo: '', file: null, uploading: false });
      await fetchData();

    } catch (err) {
      alert(err.message);
      setUploadData(prev => ({ ...prev, uploading: false }));
    }
  }

  const isImage = (tipo) => tipo && tipo.includes('imagem');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* ── Cabeçalho ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Biblioteca</h1>
        <p className="text-sm text-white/35 mt-1">
          Explora os projetos da comunidade ou gere a tua biblioteca pessoal.
        </p>
      </div>

      {/* ── Separadores (Tabs) e Botões Globais ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white/5">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('comunidade')}
            className={`pb-3.5 px-1 text-sm font-medium transition-all relative whitespace-nowrap
              ${activeTab === 'comunidade' ? 'text-[#4f9eff]' : 'text-white/40 hover:text-white/70'}`}
          >
            Biblioteca Comunidade
            {activeTab === 'comunidade' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#4f9eff] rounded-t-full shadow-[0_0_8px_rgba(79,158,255,0.6)]"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pessoal')}
            className={`pb-3.5 px-1 text-sm font-medium transition-all relative whitespace-nowrap
              ${activeTab === 'pessoal' ? 'text-[#4f9eff]' : 'text-white/40 hover:text-white/70'}`}
          >
            Biblioteca Pessoal
            {activeTab === 'pessoal' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#4f9eff] rounded-t-full shadow-[0_0_8px_rgba(79,158,255,0.6)]"></span>
            )}
          </button>
        </div>

        {/* Botões de Ação na Aba Pessoal */}
        {activeTab === 'pessoal' && (
          <div className="flex items-center gap-2.5 pb-3 sm:pb-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="h-9 px-4 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white active:scale-95 transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Externo
            </button>
            <Link 
              href="/utilizador/video-creator"
              className="h-9 px-4 rounded-lg bg-[#4f9eff] text-xs font-semibold text-white hover:bg-[#3d8aef] active:scale-95 shadow-md shadow-[#4f9eff]/10 transition-all flex items-center gap-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Criador Video
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30 text-sm">
          A carregar a biblioteca...
        </div>
      ) : activeTab === 'comunidade' ? (
        /* ════ TAB 1: COMUNIDADE (DISCIPLINAS) ════ */
        disciplinas.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#13131a] py-20 text-center flex flex-col items-center justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 text-white/40 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Nenhuma disciplina associada</h3>
            <p className="text-sm text-white/40 max-w-sm mt-2 leading-relaxed">
              Quando um administrador te associar a um módulo, ele aparecerá aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {disciplinas.map((d, i) => {
              const mod = d.modulo;
              if (!mod) return null;
              return (
                <Link 
                  href={`/utilizador/biblioteca/${d.id_modulo}`}
                  key={i} 
                  className="group relative rounded-xl border border-white/8 bg-[#13131a] p-6 transition-all duration-200 hover:border-white/20 hover:bg-white/5 cursor-pointer flex flex-col justify-between h-44 shadow-sm hover:shadow-xl block"
                >
                  <div>
                    <span className="inline-flex items-center rounded-md bg-[#4f9eff]/10 px-2.5 py-1 text-xs font-semibold text-[#4f9eff] ring-1 ring-inset ring-[#4f9eff]/20">
                      {mod.codigo || 'MÓDULO'}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-4 line-clamp-2 group-hover:text-[#4f9eff] transition-colors">
                      {mod.nome}
                    </h2>
                  </div>
                  <div className="flex items-center justify-end mt-4">
                    <span className="flex items-center text-xs font-medium text-white/30 group-hover:text-white transition-colors">
                      Abrir Galeria
                      <svg className="ml-1.5 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : (
        /* ════ TAB 2: A MINHA BIBLIOTECA PESSOAL ════ */
        meusProjetos.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#13131a] py-20 text-center flex flex-col items-center justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/5 text-3xl mb-4">🎬</div>
            <h3 className="text-lg font-semibold text-white">Ainda não tens projetos</h3>
            <p className="text-sm text-white/40 max-w-sm mt-2 leading-relaxed">
              Usa o Criador de Vídeo para gerares animações ou faz upload de um projeto externo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {meusProjetos.map((proj) => (
              <div key={proj.id_media_items} className="group/card rounded-xl border border-white/8 bg-[#13131a] overflow-hidden flex flex-col transition-all duration-200 hover:border-white/20 hover:shadow-xl">
                
                {/* Visualizador clicável (Icon de Play removido no hover) */}
                <div 
                  className="aspect-video bg-black relative flex items-center justify-center border-b border-white/5 cursor-pointer overflow-hidden"
                  onClick={() => setProjetoEmDestaque(proj)}
                >
                  {proj.url ? (
                    isImage(proj.tipo) ? (
                      <img src={proj.url} alt={proj.titulo} className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity duration-300" />
                    ) : (
                      <video src={`${proj.url}#t=0.001`} preload="metadata" className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity duration-300" muted playsInline />
                    )
                  ) : (
                    <span className="text-white/20 text-xs">Sem preview</span>
                  )}
                  
                  {/* Badge de Estado */}
                  <div className="absolute top-3 right-3">
                    {(!proj.status || proj.status === 'pessoal') && <span className="px-2 py-1 rounded bg-gray-500/80 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">Pessoal</span>}
                    {proj.status === 'pendente' && <span className="px-2 py-1 rounded bg-yellow-500/80 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">Em Avaliação</span>}
                    {proj.status === 'aprovado' && <span className="px-2 py-1 rounded bg-green-500/80 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">Publicado</span>}
                    {proj.status === 'rejeitado' && <span className="px-2 py-1 rounded bg-red-500/80 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">Rejeitado</span>}
                  </div>
                </div>
                
                {/* Info do Projeto */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-white truncate text-base" title={proj.titulo}>{proj.titulo || 'Projeto Sem Título'}</h3>
                  <p className="text-[11px] text-white/40 mt-1 mb-4 uppercase tracking-wider font-medium">
                    {proj.tipo === 'gif_gerado' ? 'Animação GIF (Criador Video)' : 
                     proj.tipo === 'video_gerado' ? 'Vídeo (Criador Video)' : 
                     proj.tipo === 'imagem_externa' ? 'Imagem (Externa)' : 'Video (Externo)'}
                  </p>
                  
                  <div className="mt-auto pt-4 border-t border-white/5">
                    {(!proj.status || proj.status === 'pessoal' || proj.status === 'rejeitado') ? (
                      
                      /* Zona de Acões para Projetos Não Avaliados (Enviar + Apagar) */
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirModalAprovacao(proj)}
                          disabled={actionLoading === proj.id_media_items}
                          className="group/btn flex-1 h-9 rounded-lg bg-[#4f9eff]/10 border border-[#4f9eff]/20 text-xs font-semibold text-[#4f9eff] hover:bg-[#4f9eff]/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5"
                        >
                          Enviar para avaliação
                          <span className="transform transition-transform duration-200 group-hover/btn:translate-x-0.5">➔</span>
                        </button>

                        {/* Botão de Apagar Projeto */}
                        <button
                          onClick={() => abrirModalApagar(proj)}
                          disabled={actionLoading === proj.id_media_items}
                          title="Apagar Projeto"
                          className="w-9 h-9 flex shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                    ) : proj.status === 'pendente' ? (
                      <div className="w-full h-9 flex items-center justify-center text-xs font-medium text-yellow-500/80 bg-yellow-500/5 rounded-lg border border-yellow-500/10 select-none">
                        A aguardar revisão do professor...
                      </div>
                    ) : (
                      <div className="w-full h-9 flex items-center justify-center text-xs font-medium text-green-400 bg-green-500/5 rounded-lg border border-green-500/10 select-none">
                        Visível na Biblioteca da Comunidade
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ════ MODAL DE APROVAÇÃO COM DROPDOWN DA DISCIPLINA ════ */}
      {projetoParaAprovar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#13131a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#4f9eff]/10 flex items-center justify-center text-[#4f9eff]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Submeter Projeto</h3>
            </div>
            
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              Vais submeter <span className="text-white font-semibold">"{projetoParaAprovar.titulo || 'Projeto Sem Título'}"</span> para avaliação. Seleciona a disciplina correspondente:
            </p>

            <div className="mb-6">
              <label className="block text-xs font-medium text-white/50 mb-2">Disciplina / Módulo</label>
              <select 
                value={disciplinaSelecionada}
                onChange={(e) => setDisciplinaSelecionada(e.target.value)}
                className="w-full h-10 rounded-lg bg-[#0c0c0f] border border-white/10 px-4 text-sm text-white focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition cursor-pointer"
              >
                <option value="" disabled>Selecione uma disciplina...</option>
                {disciplinas.map((d, i) => (
                  d.modulo && (
                    <option key={i} value={d.id_modulo}>
                      {d.modulo.codigo ? `${d.modulo.codigo} - ` : ''}{d.modulo.nome}
                    </option>
                  )
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjetoParaAprovar(null)}
                disabled={actionLoading !== null}
                className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarPedidoAprovacao}
                disabled={actionLoading !== null || !disciplinaSelecionada}
                className="flex-1 h-10 rounded-lg bg-[#4f9eff] text-sm font-semibold text-white hover:bg-[#3d8aef] shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {actionLoading !== null ? 'A enviar...' : 'Confirmar Envio'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════ MODAL PARA APAGAR PROJETO ════ */}
      {projetoParaApagar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#13131a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Apagar Projeto</h3>
            </div>
            
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              Tens a certeza que queres eliminar definitivamente o projeto <span className="text-white font-semibold">"{projetoParaApagar.titulo || 'Projeto Sem Título'}"</span>? Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjetoParaApagar(null)}
                disabled={actionLoading !== null}
                className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarApagar}
                disabled={actionLoading !== null}
                className="flex-1 h-10 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-500 shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading !== null ? 'A apagar...' : 'Sim, Apagar'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ════ MODAL DE UPLOAD EXTERNO ════ */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#13131a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/80">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload de Projeto</h3>
                <p className="text-xs text-white/40">Suporta MP4, WEBM, MOV, PNG, JPG, GIF</p>
              </div>
            </div>

            <form onSubmit={handleUploadExterno} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Título do Projeto</label>
                <input 
                  type="text" 
                  required
                  value={uploadData.titulo}
                  onChange={(e) => setUploadData({ ...uploadData, titulo: e.target.value })}
                  className="w-full h-10 rounded-lg bg-[#0c0c0f] border border-white/10 px-4 text-sm text-white focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition placeholder-white/20"
                  placeholder="Ex: Apresentação Final"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Ficheiro</label>
                <input 
                  type="file" 
                  required
                  accept="video/mp4,video/webm,video/quicktime,image/png,image/jpeg,image/gif"
                  onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
                  className="w-full text-sm text-white/60 file:mr-4 file:h-9 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 file:transition-colors file:cursor-pointer cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5 mt-6">
                <button
                  type="button"
                  onClick={() => { setIsUploadModalOpen(false); setUploadData({ titulo: '', file: null, uploading: false }); }}
                  disabled={uploadData.uploading}
                  className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadData.uploading || !uploadData.file || !uploadData.titulo.trim()}
                  className="flex-1 h-10 rounded-lg bg-[#4f9eff] text-sm font-semibold text-white hover:bg-[#3d8aef] shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadData.uploading ? 'A enviar...' : 'Fazer Upload'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ════ MODAL DE VISUALIZAÇÃO DE MEDIA EM DESTAQUE ════ */}
      {projetoEmDestaque && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
          
          <button 
            onClick={() => setProjetoEmDestaque(null)}
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all duration-200 z-10"
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
              <p className="text-sm text-white/40 mt-1 uppercase tracking-widest">{projetoEmDestaque.status}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}