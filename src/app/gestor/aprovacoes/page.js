'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useGestorFilter } from '../GestorFilterContext';
import { EVENTO_NOTIFICACAO_NOVA } from '@/lib/notificacoes';

export default function GestorAprovacoesPage() {
  const { entidadeId, programaId, programas } = useGestorFilter();
  const [activeTab, setActiveTab] = useState('pendentes'); // 'pendentes' | 'aprovados'
  const [pendentes, setPendentes] = useState([]);
  const [aprovados, setAprovados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);

  // Estado para controlar a ação pendente do modal
  // status: 'aprovado' (aceitar), 'rejeitado' (rejeitar pendente), 'pessoal' (remover dos aprovados)
  const [modalAcao, setModalAcao] = useState(null); 

  // Pedidos que chegaram enquanto a página está aberta (etiqueta "Novo")
  const [novosIds, setNovosIds] = useState([]);

  useEffect(() => {
    fetchItems();

    // Quando chega um pedido novo (notificação em tempo real), atualiza a lista sem recarregar
    function onNotificacao(e) {
      const n = e.detail;
      if (n?.tipo !== 'submissao_pendente') return;
      if (n.id_media_items) setNovosIds(prev => [...new Set([...prev, n.id_media_items])]);
      setActiveTab('pendentes');
      fetchItems({ silencioso: true });
    }
    window.addEventListener(EVENTO_NOTIFICACAO_NOVA, onNotificacao);
    return () => window.removeEventListener(EVENTO_NOTIFICACAO_NOVA, onNotificacao);
  }, []);

  async function fetchItems({ silencioso = false } = {}) {
    if (!silencioso) setLoading(true);
    const supabase = createSupabaseBrowser();

    // Restringir aos módulos atribuídos a este gestor
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: permissoes } = await supabase
      .from('tipo_utilizador')
      .select('id_modulo, role')
      .eq('id_utilizador', user.id);

    // O superadmin vê os pedidos de todas as disciplinas (incluindo as que não têm gestor)
    const isSuperAdmin = (permissoes || []).some(p => p.role === 'superadmin');
    const moduloIds = Array.from(new Set(
      (permissoes || []).filter(p => p.id_modulo != null).map(p => p.id_modulo)
    ));

    if (!isSuperAdmin && moduloIds.length === 0) {
      setPendentes([]);
      setAprovados([]);
      setLoading(false);
      return;
    }

    // Buscar projetos pendentes E aprovados, apenas dos módulos permitidos
    let query = supabase
      .from('media_items')
      .select(`
        id_media_items,
        titulo,
        tipo,
        url,
        status,
        id_modulo,
        modulo:id_modulo (id_programa),
        autor:id_autor (nome, email)
      `)
      .in('status', ['pendente', 'aprovado'])
      .order('id_media_items', { ascending: false });

    if (!isSuperAdmin) query = query.in('id_modulo', moduloIds);

    const { data, error } = await query;

    if (!error && data) {
      setPendentes(data.filter(item => item.status === 'pendente'));
      setAprovados(data.filter(item => item.status === 'aprovado'));
    }
    setLoading(false);
  }

  // ─── Filtro global (Entidade/Programa) combinado com as permissões ──
  const programaIdsEntidade = programas.map(p => p.id_programa);
  function aplicarFiltroGlobal(lista) {
    return lista.filter(item => {
      const idPrograma = Array.isArray(item.modulo) ? item.modulo[0]?.id_programa : item.modulo?.id_programa;
      if (programaId && idPrograma != programaId) return false;
      if (entidadeId && !programaIdsEntidade.includes(idPrograma)) return false;
      return true;
    });
  }

  const pendentesFiltrados = aplicarFiltroGlobal(pendentes);
  const aprovadosFiltrados = aplicarFiltroGlobal(aprovados);

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
        <h1 className="text-2xl font-bold text-tinta">Gestão de Projetos</h1>
        <p className="text-sm text-cinza mt-1">
          Avalia os pedidos de aprovação ou dirige os trabalhos já publicados na comunidade.
        </p>
      </div>

      {/* ── Separadores (Tabs) ── */}
      <div className="flex items-center gap-6 mb-8 border-b border-linha">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`pb-3.5 px-1 text-sm font-medium transition-all relative whitespace-nowrap
            ${activeTab === 'pendentes' ? 'text-acao' : 'text-cinza hover:text-tinta-2'}`}
        >
          Para Revisão ({pendentesFiltrados.length})
          {activeTab === 'pendentes' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-acao rounded-t-full "></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('aprovados')}
          className={`pb-3.5 px-1 text-sm font-medium transition-all relative whitespace-nowrap
            ${activeTab === 'aprovados' ? 'text-acao' : 'text-cinza hover:text-tinta-2'}`}
        >
          Publicados ({aprovadosFiltrados.length})
          {activeTab === 'aprovados' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-acao rounded-t-full "></span>
          )}
        </button>
      </div>

      {/* ── CONTEÚDO DAS TABS ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-cinza/80 text-sm">
          A procurar projetos...
        </div>
      ) : activeTab === 'pendentes' ? (
        /* ════ TAB 1: PARA REVISÃO (PENDENTES) ════ */
        pendentesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-linha bg-superficie py-24 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-acao/10 text-acao mb-5">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-tinta">Tudo em dia!</h3>
            <p className="text-sm text-cinza max-w-md mt-2 leading-relaxed">
              Não tens nenhum projeto pendente de avaliação. Quando os alunos submeterem trabalhos, aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {pendentesFiltrados.map((item) => (
              <div key={item.id_media_items} className="rounded-xl border border-linha bg-superficie overflow-hidden flex flex-col shadow-lg transition-all hover:border-linha">
                <div className="aspect-video bg-mosaico relative border-b border-linha">
                  {item.url ? (
                    isImage(item.tipo) ? (
                      <img src={item.url} alt={item.titulo} className="w-full h-full object-contain bg-mosaico" />
                    ) : (
                      <video src={item.url} className="w-full h-full object-contain bg-mosaico" controls playsInline />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cinza/70 text-xs">Sem preview</div>
                  )}
                  <div className="absolute top-3 right-3 pointer-events-none flex gap-1.5">
                    {novosIds.includes(item.id_media_items) && (
                      <span className="px-2.5 py-1 rounded-md bg-acao text-[10px] font-bold text-white uppercase tracking-widest shadow-sm animate-pulse">
                        Novo
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-md bg-amber-500 backdrop-blur-md text-[10px] font-bold text-tinta uppercase tracking-widest shadow-sm">
                      Revisão
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-tinta truncate text-lg" title={item.titulo}>{item.titulo || 'Projeto Sem Título'}</h3>
                  <div className="mt-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-papel flex items-center justify-center text-cinza shrink-0 text-xs font-bold uppercase">
                      {item.autor?.nome?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-tinta truncate">{item.autor?.nome || 'Utilizador Desconhecido'}</p>
                      <p className="text-[11px] text-acao truncate">{isImage(item.tipo) ? 'Imagem' : item.tipo === 'gif_gerado' ? 'Animação GIF' : 'Vídeo MP4'}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-linha flex gap-3">
                    <button
                      onClick={() => setModalAcao({ item, status: 'rejeitado' })}
                      disabled={actionId === item.id_media_items}
                      className="flex-1 h-10 rounded-lg border border-ecgm-r/30 bg-red-500/5 text-sm font-semibold text-ecgm-r hover:bg-ecgm-r/10 hover:border-ecgm-r/30 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                    <button
                      onClick={() => setModalAcao({ item, status: 'aprovado' })}
                      disabled={actionId === item.id_media_items}
                      className="flex-1 h-10 rounded-lg border border-ecgm-g/30 bg-ecgm-g/10 text-sm font-semibold text-ecgm-g hover:bg-ecgm-g/15 hover:border-ecgm-g/40 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
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
        aprovadosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-linha bg-superficie py-24 text-center flex flex-col items-center justify-center shadow-sm">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-papel text-cinza mb-5">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-tinta">Galeria Vazia</h3>
            <p className="text-sm text-cinza max-w-md mt-2 leading-relaxed">
              Ainda não tens projetos aprovados. Quando aprovares um projeto na tab "Para Revisão", ele aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {aprovadosFiltrados.map((item) => (
              <div key={item.id_media_items} className="rounded-xl border border-linha bg-superficie overflow-hidden flex flex-col shadow-lg transition-all hover:border-linha">
                <div className="aspect-video bg-mosaico relative border-b border-linha">
                  {item.url ? (
                    isImage(item.tipo) ? (
                      <img src={item.url} alt={item.titulo} className="w-full h-full object-contain bg-mosaico" />
                    ) : (
                      <video src={item.url} className="w-full h-full object-contain bg-mosaico" controls playsInline />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cinza/70 text-xs">Sem preview</div>
                  )}
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-md bg-ecgm-g backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest shadow-sm">
                      Publicado
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-tinta truncate text-lg" title={item.titulo}>{item.titulo || 'Projeto Sem Título'}</h3>
                  <div className="mt-3 flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-papel flex items-center justify-center text-cinza shrink-0 text-xs font-bold uppercase">
                      {item.autor?.nome?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-tinta truncate">{item.autor?.nome || 'Utilizador Desconhecido'}</p>
                      <p className="text-[11px] text-cinza truncate">{isImage(item.tipo) ? 'Imagem' : item.tipo === 'gif_gerado' ? 'Animação GIF' : 'Vídeo MP4'}</p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-linha flex gap-3">
                    <button
                      onClick={() => setModalAcao({ item, status: 'pessoal' })}
                      disabled={actionId === item.id_media_items}
                      className="w-full h-10 rounded-lg border border-ecgm-r/30 bg-red-500/5 text-sm font-semibold text-ecgm-r hover:bg-ecgm-r/10 hover:border-ecgm-r/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-tinta/30 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-linha bg-superficie p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Dinâmico */}
            <div className="flex items-center gap-3 mb-4">
              {modalAcao.status === 'aprovado' ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-ecgm-g/10 flex items-center justify-center text-ecgm-g">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-tinta">Aprovar Trabalho</h3>
                </>
              ) : modalAcao.status === 'rejeitado' ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-ecgm-r/10 flex items-center justify-center text-ecgm-r">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-tinta">Rejeitar Trabalho</h3>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-ecgm-r/10 flex items-center justify-center text-ecgm-r">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-tinta">Remover da Galeria</h3>
                </>
              )}
            </div>
            
            {/* Mensagem Adaptável */}
            <p className="text-sm text-tinta-2 mb-6 leading-relaxed">
              {modalAcao.status === 'aprovado' ? (
                <>Tens a certeza que desejas aprovar o projeto <span className="text-tinta font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-tinta font-medium">{modalAcao.item.autor?.nome}</span>? Ficará imediatamente visível na comunidade.</>
              ) : modalAcao.status === 'rejeitado' ? (
                <>Tens a certeza que desejas rejeitar o projeto <span className="text-tinta font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-tinta font-medium">{modalAcao.item.autor?.nome}</span>? Ele voltará para os rascunhos do utilizador.</>
              ) : (
                <>Tens a certeza que queres remover o projeto <span className="text-tinta font-semibold">"{modalAcao.item.titulo || 'Projeto Sem Título'}"</span> de <span className="text-tinta font-medium">{modalAcao.item.autor?.nome}</span>? Ele voltará ao estado Pessoal e desaparecerá da comunidade.</>
              )}
            </p>
            
            {/* Botões do Modal */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModalAcao(null)}
                disabled={actionId !== null}
                className="flex-1 h-10 rounded-lg border border-linha text-sm font-medium text-cinza hover:bg-papel hover:text-tinta transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAcao}
                disabled={actionId !== null}
                className={`flex-1 h-10 rounded-lg text-sm font-semibold text-tinta transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                  ${modalAcao.status === 'aprovado' ? 'bg-ecgm-g hover:bg-green-500 shadow-green-600/5' : 'bg-ecgm-r hover:bg-ecgm-r shadow-red-600/5'}`}
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