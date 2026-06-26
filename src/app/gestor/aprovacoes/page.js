'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export default function GestorAprovacoesPage() {
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  // Estado para controlar a ação pendente do modal
  const [modalAcao, setModalAcao] = useState(null); // { item: ..., status: 'aprovado' | 'rejeitado' }

  useEffect(() => {
    fetchPendentes();
  }, []);

  async function fetchPendentes() {
    setLoading(true);
    const supabase = createSupabaseBrowser();

    // Buscar projetos pendentes e fazer 'join' para saber o nome do autor
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
      .eq('status', 'pendente')
      .order('id_media_items', { ascending: false });

    if (!error && data) {
      setPendentes(data);
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
      // Remove o item da lista visualmente logo após sucesso
      setPendentes(prev => prev.filter(p => p.id_media_items !== item.id_media_items));
      setModalAcao(null); // Fecha o modal
    } else {
      alert("Erro ao atualizar o projeto: " + error.message);
    }
    setActionId(null);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      
      {/* ── Cabeçalho ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Aprovações Pendentes</h1>
        <p className="text-sm text-white/35 mt-1">
          Avalia os projetos submetidos pelos alunos antes de os publicares na galeria da comunidade.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30 text-sm">
          A procurar pedidos de aprovação...
        </div>
      ) : pendentes.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#13131a] py-24 text-center flex flex-col items-center justify-center shadow-sm">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-[#a78bfa]/10 text-[#a78bfa] mb-5">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">Tudo em dia!</h3>
          <p className="text-sm text-white/40 max-w-md mt-2 leading-relaxed">
            Não tens nenhum projeto pendente de avaliação. Quando os alunos submeterem os seus trabalhos, eles vão aparecer aqui.
          </p>
        </div>
      ) : (
        /* ── Grelha de Pendentes ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pendentes.map((item) => (
            <div key={item.id_media_items} className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden flex flex-col shadow-lg transition-all hover:border-white/10">
              
              {/* Preview do Vídeo */}
              <div className="aspect-video bg-black relative border-b border-white/5">
                {item.url ? (
                  <video 
                    src={item.url} 
                    className="w-full h-full object-contain bg-[#080808]" 
                    controls 
                    playsInline 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                    Sem preview disponível
                  </div>
                )}
                <div className="absolute top-3 right-3 pointer-events-none">
                  <span className="px-2.5 py-1 rounded-md bg-yellow-500/90 backdrop-blur-md text-[10px] font-bold text-black uppercase tracking-widest shadow-sm">
                    Revisão
                  </span>
                </div>
              </div>

              {/* Informação */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-semibold text-white truncate text-lg" title={item.titulo}>
                  {item.titulo || 'Projeto Sem Título'}
                </h3>
                
                <div className="mt-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 shrink-0 text-xs font-bold uppercase">
                    {item.autor?.nome?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{item.autor?.nome || 'Utilizador Desconhecido'}</p>
                    <p className="text-[11px] text-[#a78bfa] truncate">{item.tipo === 'gif_gerado' ? 'Animação GIF' : 'Vídeo MP4'}</p>
                  </div>
                </div>

                {/* Botões de Ação */}
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
      )}

      {/* ════ MODAL DE CONFIRMAÇÃO DINÂMICO (APROVAR / REJEITAR) ════ */}
      {modalAcao && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#13131a] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header com Ícones Dinâmicos consoante a Ação */}
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
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Rejeitar Trabalho</h3>
                </>
              )}
            </div>
            
            {/* Mensagem Adaptável ao Estado */}
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              {modalAcao.status === 'aprovado' ? (
                <>
                  Tens a certeza que desejas aprovar o projeto <span className="text-white font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-white font-medium">{modalAcao.item.autor?.nome}</span>? Ele ficará imediatamente visível na galeria pública.
                </>
              ) : (
                <>
                  Tens a certeza que desejas rejeitar o projeto <span className="text-white font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-white font-medium">{modalAcao.item.autor?.nome}</span>? O item voltará ao estado privado na biblioteca do aluno.
                </>
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
                  ${modalAcao.status === 'aprovado' 
                    ? 'bg-green-600 hover:bg-green-500 shadow-green-600/5' 
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/5'
                  }`}
              >
                {actionId !== null ? 'A processar...' : modalAcao.status === 'aprovado' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}