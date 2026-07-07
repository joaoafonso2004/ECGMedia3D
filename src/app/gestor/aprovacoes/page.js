'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function GestorAprovacoesPage() {
  const [activeTab, setActiveTab] = useState('pendentes'); // 'pendentes' | 'aprovados'
  const [pendentes, setPendentes] = useState([]);
  const [aprovados, setAprovados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  // Estado para controlar a ação pendente do modal
  // status: 'aprovado' (aceitar), 'rejeitado' (rejeitar pendente), 'pessoal' (remover dos aprovados)
  const [modalAcao, setModalAcao] = useState(null); 

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    const supabase = createSupabaseBrowser();

    // Buscar projetos pendentes E aprovados numa só query
    const { data, error } = await supabase
      .from('media_items')
      .select(`
        id_media_items,
        titulo,
        tipo,
        url,
        status,
        autor:id_autor (nome, email)
      `)
      .in('status', ['pendente', 'aprovado'])
      .order('id_media_items', { ascending: false });

    if (!error && data) {
      setPendentes(data.filter(item => item.status === 'pendente'));
      setAprovados(data.filter(item => item.status === 'aprovado'));
    }
    setLoading(false);
  }

  // Executa a ação na base de dados após confirmação no modal
  async function confirmarAcao() {
    if (!modalAcao) return;
    
    const { item, status } = modalAcao;
    setActionId(item.id_media_items);
    
    const supabase = createSupabaseBrowser();

    const { error } = await supabase
      .from('media_items')
      .update({ status: status })
      .eq('id_media_items', item.id_media_items);

    if (!error) {
      // Atualiza a lista visualmente logo após o sucesso para não ter de recarregar a página
      if (status === 'pessoal') {
        // Remover dos aprovados
        setAprovados(prev => prev.filter(p => p.id_media_items !== item.id_media_items));
      } else {
        // Remover dos pendentes
        setPendentes(prev => prev.filter(p => p.id_media_items !== item.id_media_items));
        
        // Se a ação foi aprovar, movemos para a lista de aprovados dinamicamente
        if (status === 'aprovado') {
          setAprovados(prev => [{ ...item, status: 'aprovado' }, ...prev]);
        }
      }
      setModalAcao(null); // Fecha o modal
    } else {
      alert("Erro ao atualizar o projeto: " + error.message);
    }
    setActionId(null);
  }

  // Helper para distinguir imagens de vídeos
  const isImage = (tipo) => tipo && (tipo.includes('imagem') || tipo.includes('image'));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* ── Cabeçalho ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Gestão de Projetos</h1>
        <p className="text-sm text-white/35 mt-1">
          Avalia os pedidos de aprovação ou dirige os trabalhos já publicados na comunidade.
        </p>
      </div>

      {/* ── Separadores (Tabs) ── */}
      <div className="flex items-center gap-6 mb-8 border-b border-white/5">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`pb-3.5 px-1 text-sm font-medium transition-all relative whitespace-nowrap
            ${activeTab === 'pendentes' ? 'text-[#a78bfa]' : 'text-white/40 hover:text-white/70'}`}
        >
          Para Revisão ({pendentes.length})
          {activeTab === 'pendentes' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a78bfa] rounded-t-full shadow-[0_0_8px_rgba(167,139,250,0.6)]"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('aprovados')}
          className={`pb-3.5 px-1 text-sm font-medium transition-all relative whitespace-nowrap
            ${activeTab === 'aprovados' ? 'text-[#a78bfa]' : 'text-white/40 hover:text-white/70'}`}
        >
          Publicados ({aprovados.length})
          {activeTab === 'aprovados' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#a78bfa] rounded-t-full shadow-[0_0_8px_rgba(167,139,250,0.6)]"></span>
          )}
        </button>
      </div>

      {/* ── CONTEÚDO DAS TABS ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30 text-sm">
          A procurar projetos...
        </div>
      ) : activeTab === 'pendentes' ? (
        /* ════ TAB 1: PARA REVISÃO (PENDENTES) ════ */
        pendentes.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#13131a] py-24 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#a78bfa]/10 text-[#a78bfa] mb-5">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Tudo em dia!</h3>
            <p className="text-sm text-white/40 max-w-md mt-2 leading-relaxed">
              Não tens nenhum projeto pendente de avaliação. Quando os alunos submeterem trabalhos, aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendentes.map((item) => (
              <div key={item.id_media_items} className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden flex flex-col shadow-lg transition-all hover:border-white/10">
                <div className="aspect-video bg-black relative border-b border-white/5">
                  {item.url ? (
                    isImage(item.tipo) ? (
                      <img src={item.url} alt={item.titulo} className="w-full h-full object-contain bg-[#080808]" />
                    ) : (
                      <video src={item.url} className="w-full h-full object-contain bg-[#080808]" controls playsInline />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">Sem preview</div>
                  )}
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md bg-yellow-500/90 backdrop-blur-md text-[10px] font-bold text-black uppercase tracking-widest shadow-sm">
                      Revisão
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-white truncate text-lg" title={item.titulo}>{item.titulo || 'Projeto Sem Título'}</h3>
                  <div className="mt-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 shrink-0 text-xs font-bold uppercase">
                      {item.autor?.nome?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{item.autor?.nome || 'Utilizador Desconhecido'}</p>
                      <p className="text-[11px] text-[#a78bfa] truncate">{isImage(item.tipo) ? 'Imagem' : item.tipo === 'gif_gerado' ? 'Animação GIF' : 'Vídeo MP4'}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                    <button
                      onClick={() => setModalAcao({ item, status: 'rejeitado' })}
                      disabled={actionId === item.id_media_items}
                      className="flex-1 h-10 rounded-lg border border-red-500/20 bg-red-500/5 text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => setModalAcao({ item, status: 'aprovado' })}
                      disabled={actionId === item.id_media_items}
                      className="flex-1 h-10 rounded-lg border border-green-500/20 bg-green-500/10 text-sm font-semibold text-green-400 hover:bg-green-500/20 hover:border-green-500/40 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ════ TAB 2: APROVADOS NA COMUNIDADE ════ */
        aprovados.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-[#13131a] py-24 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white/5 text-white/40 mb-5">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Galeria Vazia</h3>
            <p className="text-sm text-white/40 max-w-md mt-2 leading-relaxed">
              Ainda não tens projetos aprovados. Quando aprovares um projeto na tab "Para Revisão", ele aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {aprovados.map((item) => (
              <div key={item.id_media_items} className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden flex flex-col shadow-lg transition-all hover:border-white/10">
                <div className="aspect-video bg-black relative border-b border-white/5">
                  {item.url ? (
                    isImage(item.tipo) ? (
                      <img src={item.url} alt={item.titulo} className="w-full h-full object-contain bg-[#080808]" />
                    ) : (
                      <video src={item.url} className="w-full h-full object-contain bg-[#080808]" controls playsInline />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">Sem preview</div>
                  )}
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md bg-green-500/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest shadow-sm">
                      Publicado
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-white truncate text-lg" title={item.titulo}>{item.titulo || 'Projeto Sem Título'}</h3>
                  <div className="mt-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 shrink-0 text-xs font-bold uppercase">
                      {item.autor?.nome?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/80 truncate">{item.autor?.nome || 'Utilizador Desconhecido'}</p>
                      <p className="text-[11px] text-white/40 truncate">{isImage(item.tipo) ? 'Imagem' : item.tipo === 'gif_gerado' ? 'Animação GIF' : 'Vídeo MP4'}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                    <button
                      onClick={() => setModalAcao({ item, status: 'pessoal' })}
                      disabled={actionId === item.id_media_items}
                      className="w-full h-10 rounded-lg border border-red-500/20 bg-red-500/5 text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remover da Galeria
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ════ MODAL DE CONFIRMAÇÃO DINÂMICO ════ */}
      {modalAcao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#13131a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Dinâmico */}
            <div className="flex items-center gap-3 mb-4">
              {modalAcao.status === 'aprovado' ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Aprovar Trabalho</h3>
                </>
              ) : modalAcao.status === 'rejeitado' ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Rejeitar Trabalho</h3>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Remover da Galeria</h3>
                </>
              )}
            </div>
            
            {/* Mensagem Adaptável */}
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              {modalAcao.status === 'aprovado' ? (
                <>Tens a certeza que desejas aprovar o projeto <span className="text-white font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-white font-medium">{modalAcao.item.autor?.nome}</span>? Ficará imediatamente visível na comunidade.</>
              ) : modalAcao.status === 'rejeitado' ? (
                <>Tens a certeza que desejas rejeitar o projeto <span className="text-white font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-white font-medium">{modalAcao.item.autor?.nome}</span>? Ele voltará para os rascunhos do utilizador.</>
              ) : (
                <>Tens a certeza que queres remover o projeto <span className="text-white font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-white font-medium">{modalAcao.item.autor?.nome}</span>? Ele voltará ao estado Pessoal e desaparecerá da comunidade.</>
              )}
            </p>
            
            {/* Botões do Modal */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModalAcao(null)}
                disabled={actionId !== null}
                className="flex-1 h-10 rounded-lg border border-white/10 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAcao}
                disabled={actionId !== null}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold text-white transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                  ${modalAcao.status === 'aprovado' ? 'bg-green-600 hover:bg-green-500 shadow-green-600/5' : 'bg-red-600 hover:bg-red-500 shadow-red-600/5'}`}
              >
                {actionId !== null ? 'A processar...' : modalAcao.status === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Remoção'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}