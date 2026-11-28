'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useGestorFilter } from '../GestorFilterContext';

import { IconeCubo } from '@/components/Icones';
/* ─── Modal genérico ────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-linha bg-superficie shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-linha shrink-0">
          <h2 className="text-base font-semibold text-tinta">{title}</h2>
          <button onClick={onClose} className="text-cinza/80 hover:text-tinta-2 transition text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-cinza mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full rounded-lg border border-linha bg-papel px-3 py-2 text-sm text-tinta placeholder:text-cinza focus:outline-none focus:border-acao/60 focus:ring-1 focus:ring-acao/20 transition`;

/* ─── Formulário de Disciplina ──────────────────────────────────── */
function DisciplinaForm({ initial = {}, onSave, saving }) {
  const [form, setForm] = useState({
    nome:      initial.nome      ?? '',
    codigo:    initial.codigo    ?? '',
    descricao: initial.descricao ?? '',
    ano:       initial.ano       ?? '',
    semestre:  initial.semestre  ?? '',
  });

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  return (
    <div className="space-y-4">
      <Field label="Nome *">
        <input className={inputCls} value={form.nome} onChange={e => set('nome', e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Código">
          <input className={inputCls} value={form.codigo} onChange={e => set('codigo', e.target.value)} />
        </Field>
        <Field label="Ano">
          <input className={inputCls} type="number" min={1} max={4} value={form.ano} onChange={e => set('ano', e.target.value)} />
        </Field>
      </div>
      <Field label="Descrição">
        <textarea className={inputCls + ' resize-none'} rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} />
      </Field>

      <div className="pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.nome.trim()}
          className="w-full rounded-lg bg-acao py-2.5 text-sm font-semibold text-white hover:bg-acao-escuro transition disabled:opacity-50"
        >
          {saving ? 'A guardar…' : 'Guardar Alterações do Módulo'}
        </button>
      </div>
    </div>
  );
}

/* ─── Página Principal ──────────────────────────────────────────── */
export default function GestorDisciplinasPage() {
  const { entidadeId, programaId, programas } = useGestorFilter();
  const [disciplinas, setDisciplinas] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // <-- Estado para a pesquisa
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); 
  const [savingEdit, setSavingEdit]   = useState(false);
  const [toast, setToast]             = useState('');

  // Estados para gerir a listagem de modelos dentro do modal
  const [modelosDisciplina, setModelosDisciplina] = useState([]);
  const [loadingModelos, setLoadingModelos]       = useState(false);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  /* ─── Carregar Disciplinas ────────────────────────────────────── */
  const fetchDisciplinas = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: permissoes } = await supabase
      .from("tipo_utilizador")
      .select("id_modulo")
      .eq("id_utilizador", user.id)
      .eq("role", "gestor_disciplina");

    const moduloIds = Array.from(new Set((permissoes || []).map(p => p.id_modulo).filter(Boolean)));

    const { data } = moduloIds.length > 0 
      ? await supabase
          .from('modulo')
          .select('id_modulo, nome, codigo, descricao, ano, semestre, id_programa')
          .in("id_modulo", moduloIds)
          .order('ano', { ascending: true })
      : { data: [] };

    setDisciplinas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDisciplinas(); }, [fetchDisciplinas]);

  /* ─── Carregar Modelos da Disciplina Específica ───────────────── */
  useEffect(() => {
    async function fetchModelosDaDisciplina(id_modulo) {
      setLoadingModelos(true);
      const supabase = createSupabaseBrowser();
      
      // 1. Procurar as ligações
      const { data: ligacoes } = await supabase
        .from('modulo_media')
        .select('id_media_items')
        .eq('id_modulo', id_modulo);
        
      const ids = (ligacoes || []).map(l => l.id_media_items);
      
      // 2. Procurar os dados reais dos modelos
      if (ids.length > 0) {
        const { data: modelos } = await supabase
          .from('media_items')
          .select('id_media_items, titulo, url')
          .in('id_media_items', ids)
          .order('id_media_items', { ascending: false });
          
        setModelosDisciplina(modelos || []);
      } else {
        setModelosDisciplina([]);
      }
      setLoadingModelos(false);
    }

    // Só corre se o modal estiver aberto com uma disciplina
    if (modal?.disciplina) {
      fetchModelosDaDisciplina(modal.disciplina.id_modulo);
    }
  }, [modal?.disciplina]);

  /* ─── Editar Detalhes da Disciplina ───────────────────────────── */
  async function handleEdit(form) {
    setSavingEdit(true);
    const supabase = createSupabaseBrowser();
    const payload  = {
      nome:      form.nome.trim(),
      codigo:    form.codigo.trim()    || null,
      descricao: form.descricao.trim() || null,
      ano:       form.ano      !== '' ? Number(form.ano)      : null,
      semestre:  form.semestre !== '' ? Number(form.semestre) : null,
    };

    const { error } = await supabase
      .from('modulo')
      .update(payload)
      .eq('id_modulo', modal.disciplina.id_modulo);

    if (error) {
      showToast('Erro ao editar: ' + error.message);
    } else {
      showToast('Módulo atualizado com sucesso!');
      fetchDisciplinas();
      setModal(prev => ({ ...prev, disciplina: { ...prev.disciplina, ...payload } }));
    }
    setSavingEdit(false);
  }

  /* ─── Remover Ligação do Modelo ───────────────────────────────── */
  async function handleRemoverModelo(id_media_items) {
    const supabase = createSupabaseBrowser();
    
    // Apaga apenas a relação (não apaga o ficheiro R2 nem a entrada principal do modelo)
    const { error } = await supabase
      .from('modulo_media')
      .delete()
      .match({ 
        id_modulo: modal.disciplina.id_modulo, 
        id_media_items: id_media_items 
      });

    if (error) {
      showToast('Erro ao remover modelo: ' + error.message);
    } else {
      showToast('Modelo removido deste módulo!');
      // Atualiza a lista removendo o item visualmente
      setModelosDisciplina(prev => prev.filter(m => m.id_media_items !== id_media_items));
    }
  }

  const programaIdsEntidade = programas.map(p => p.id_programa);
  const filteredDisciplinas = disciplinas.filter(d => {
    if (programaId && d.id_programa != programaId) return false;
    if (entidadeId && !programaId && !programaIdsEntidade.includes(d.id_programa)) return false;
    const query = searchQuery.toLowerCase();
    if (query) return (
      (d.nome?.toLowerCase()     || '').includes(query) ||
      (d.codigo?.toLowerCase()   || '').includes(query) ||
      (d.descricao?.toLowerCase()|| '').includes(query)
    );
    return true;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-linha bg-superficie px-4 py-2.5 text-sm text-tinta shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Módulos</h1>
          <p className="text-sm text-cinza mt-1">Apenas pode visualizar e gerir os módulos que lhe foram atribuídos.</p>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cinza/80">
            {/* Ícone de Lupa */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Pesquisar por nome, código ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-linha bg-superficie py-3 pl-10 pr-4 text-sm text-tinta placeholder:text-cinza focus:border-acao/60 focus:outline-none focus:ring-1 focus:ring-acao/20 transition shadow-sm"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-linha bg-superficie overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-cinza/80">A carregar…</div>
        ) : disciplinas.length === 0 ? (
          <div className="py-12 text-center text-sm text-cinza/80">Não tem nenhum módulo atribuída.</div>
        ) : filteredDisciplinas.length === 0 ? (
          <div className="py-12 text-center text-sm text-cinza/80">
            {searchQuery
              ? `Nenhum módulo corresponde à pesquisa "${searchQuery}".`
              : 'Nenhum módulo para o filtro selecionado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cinza/80 border-b border-linha bg-papel">
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-5 py-3 font-medium">Código</th>
                <th className="text-left px-5 py-3 font-medium">Ano / Semestre</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisciplinas.map((d, i) => (
                <tr key={d.id_modulo} className={`transition hover:bg-papel ${i !== filteredDisciplinas.length - 1 ? 'border-b border-linha' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-tinta">{d.nome}</div>
                    {d.descricao && <div className="text-xs text-cinza/80 mt-0.5 truncate max-w-xs">{d.descricao}</div>}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-cinza">{d.codigo ?? '—'}</td>
                  <td className="px-5 py-3.5 text-cinza">
                    {d.ano != null ? `${d.ano}º Ano` : '—'} / {d.semestre != null ? `${d.semestre}º Sem` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setModal({ disciplina: d })}
                      className="rounded-md border border-linha px-3 py-1.5 text-xs font-medium text-cinza hover:bg-papel hover:text-tinta transition"
                    >
                      Editar Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Misto: Editar Informação + Listar Modelos */}
      {modal?.disciplina && (
        <Modal title={`Gerir: ${modal.disciplina.nome}`} onClose={() => setModal(null)}>
          
          {/* Secção 1: Editar Informações da Disciplina */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-tinta mb-3">Informação Base</h3>
            <DisciplinaForm 
              initial={modal.disciplina} 
              onSave={handleEdit} 
              saving={savingEdit} 
            />
          </div>

          <hr className="border-linha mb-6" />

          {/* Secção 2: Listar Modelos Associados */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-acao">Modelos 3D Associados</h3>
                <p className="text-xs text-cinza mt-0.5">Modelos que pertencem a este módulo.</p>
              </div>
            </div>

            {loadingModelos ? (
              <div className="py-6 text-center text-xs text-cinza/80 border border-linha rounded-lg bg-papel">
                A carregar modelos...
              </div>
            ) : modelosDisciplina.length === 0 ? (
              <div className="py-6 text-center text-xs text-cinza/80 border border-dashed border-linha rounded-lg bg-papel">
                Nenhum modelo associado a este módulo.
              </div>
            ) : (
              <div className="space-y-2">
                {modelosDisciplina.map(m => (
                  <div key={m.id_media_items} className="flex items-center justify-between p-3 rounded-lg border border-linha bg-papel transition hover:bg-mosaico">
                    <div className="flex items-center gap-3">
                      <IconeCubo tamanho={18} />
                      <div>
                        <p className="text-sm font-medium text-tinta">{m.titulo}</p>
                        <a 
                          href={m.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-acao hover:text-acao truncate max-w-[180px] block transition"
                        >
                          Ver Ficheiro
                        </a>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoverModelo(m.id_media_items)}
                      className="text-xs font-medium text-ecgm-r hover:text-ecgm-r px-3 py-1.5 rounded-md border border-transparent hover:border-ecgm-r/30 hover:bg-ecgm-r/10 transition"
                      title="Remover deste módulo"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </Modal>
      )}
    </div>
  );
}