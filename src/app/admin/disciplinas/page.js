'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter, FilterContextLine } from '../AdminFilterContext';

import { IconeCubo, IconeCarregar, IconeEspera } from '@/components/Icones';
/* ─── Modal genérico ────────────────────────────────────────────── */
function Modal({ title, onClose, children, large = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-tinta/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className={`relative z-10 w-full ${large ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-linha bg-superficie shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-linha">
          <h2 className="text-base font-semibold text-tinta">{title}</h2>
          <button
            onClick={onClose}
            className="text-cinza/80 hover:text-tinta-2 transition text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ─── Media do card associado à disciplina ──────────────────────── */
function isVideo(url) {
  return /\.(mp4|webm|ogg)$/i.test(url || '');
}

function DisciplinaMedia({ idModulo }) {
  const [modelos,    setModelos]    = useState([]);
  const [cardMedia,  setCardMedia]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const fileRef = useRef();

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { data: links } = await supabase
      .from('modulo_media')
      .select('media_item:id_media_items(id_media_items, titulo, url, tipo)')
      .eq('id_modulo', idModulo);

    const items = links?.map(l => l.media_item).filter(Boolean) || [];
    setModelos(items.filter(m => m.tipo === 'modelo3d'));
    setCardMedia(items.filter(m => m.tipo === 'video' || m.tipo === 'imagem'));
    setLoading(false);
  }, [idModulo]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  async function handleUpload(e) {
    const f = e.target.files[0];
    if (!f) return;
    setUploading(true);

    // Apagar card media anterior se existir
    for (const item of cardMedia) {
      await fetch('/api/delete-model', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url }),
      });
      const supabase = createSupabaseBrowser();
      await supabase.from('media_items').delete().eq('id_media_items', item.id_media_items);
    }

    const formData = new FormData();
    formData.append('file', f);
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (res.ok) {
      const tipo = f.type.startsWith('video/') ? 'video' : 'imagem';
      const supabase = createSupabaseBrowser();
      const { data: novo } = await supabase
        .from('media_items')
        .insert([{ url: json.url, tipo, titulo: f.name }])
        .select()
        .single();
      if (novo) {
        await supabase.from('modulo_media').insert([{
          id_modulo: idModulo,
          id_media_items: novo.id_media_items,
        }]);
      }
      fetchMedia();
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleRemover(item) {
    await fetch('/api/delete-model', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.url }),
    });
    const supabase = createSupabaseBrowser();
    await supabase.from('media_items').delete().eq('id_media_items', item.id_media_items);
    fetchMedia();
  }

  if (loading) return <p className="text-xs text-cinza/80 py-2">A carregar media…</p>;

  return (
    <div className="space-y-6">

      {/* Modelos 3D */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-acao">Modelos 3D Associados</h3>
            <p className="text-xs text-cinza mt-0.5">
              Associa modelos na página{' '}
              <a href="/admin/modelos" className="text-acao hover:text-acao transition">Modelos 3D</a>.
            </p>
          </div>
        </div>
        {modelos.length === 0 ? (
          <div className="py-6 text-center text-xs text-cinza/80 border border-dashed border-linha rounded-lg bg-papel">
            Nenhum modelo associado a este módulo.
          </div>
        ) : (
          <div className="space-y-2">
            {modelos.map(m => (
              <div key={m.id_media_items}
                className="flex items-center gap-3 p-3 rounded-lg border border-linha bg-papel transition hover:bg-mosaico">
                <IconeCubo tamanho={18} />
                <p className="text-sm font-medium text-tinta truncate">
                  {m.titulo || `Modelo #${m.id_media_items}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-linha" />

      {/* Vídeo / Imagem do card */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-acao">Vídeo / Imagem do Card</h3>
            <p className="text-xs text-cinza mt-0.5">Media apresentada no card público do módulo.</p>
          </div>
        </div>
        {cardMedia.length > 0 ? (
          <div className="space-y-2">
            {cardMedia.map(item => (
              <div key={item.id_media_items}
                className="flex items-center gap-3 p-3 rounded-lg border border-linha bg-papel transition hover:bg-mosaico">
                <div className="w-20 h-14 rounded overflow-hidden shrink-0 bg-papel">
                  {isVideo(item.url) ? (
                    <video src={item.url} className="w-full h-full object-cover" muted loop playsInline />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-tinta-2 truncate">{item.titulo || item.url?.split('/').pop()}</p>
                  <p className="text-[10px] text-cinza/80 uppercase mt-0.5">{item.tipo}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-xs text-cinza border border-linha px-2 py-1 rounded hover:bg-papel transition"
                  >
                    Substituir
                  </button>
                  <button
                    onClick={() => handleRemover(item)}
                    disabled={uploading}
                    className="text-xs text-red-400/50 border border-ecgm-r/30 px-2 py-1 rounded
                               hover:bg-ecgm-r/10 hover:text-ecgm-r transition"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 transition
              ${uploading ? 'border-linha cursor-wait' : 'border-linha hover:border-acao/60 hover:bg-acao/5 cursor-pointer'}`}
          >
            <span className="text-cinza">{uploading ? <IconeEspera tamanho={24} /> : <IconeCarregar tamanho={24} />}</span>
            <div>
              <p className="text-sm font-medium text-tinta-2">
                {uploading ? 'A enviar…' : 'Adicionar vídeo ou imagem ao card'}
              </p>
              <p className="text-xs text-cinza/80 mt-0.5">JPG, PNG, MP4, WebM</p>
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

    </div>
  );
}

/* ─── Campo de formulário ───────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-cinza mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full rounded-lg border border-linha bg-papel px-3 py-2 text-sm text-tinta
  placeholder:text-cinza focus:outline-none focus:border-acao/60 focus:ring-1
  focus:ring-acao/20 transition`;

/* ─── Formulário de disciplina ──────────────────────────────────── */
function DisciplinaForm({ initial = {}, programas = [], onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    nome:        initial.nome        ?? '',
    codigo:      initial.codigo      ?? '',
    descricao:   initial.descricao   ?? '',
    ano:         initial.ano         ?? '',
    semestre:    initial.semestre    ?? '',
    id_programa: initial.id_programa ?? '',
  });

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  return (
    <div className="space-y-4">
      <Field label="Nome *">
        <input
          className={inputCls}
          value={form.nome}
          onChange={e => set('nome', e.target.value)}
          placeholder="ex: Programação Web"
        />
      </Field>
      <Field label="Código">
        <input
          className={inputCls}
          value={form.codigo}
          onChange={e => set('codigo', e.target.value)}
          placeholder="ex: PW"
        />
      </Field>
      <Field label="Descrição">
        <textarea
          className={inputCls + ' resize-none'}
          rows={3}
          value={form.descricao}
          onChange={e => set('descricao', e.target.value)}
          placeholder="Breve descrição do módulo"
        />
      </Field>
      {(() => {
        const prog = form.id_programa
          ? programas.find(p => String(p.id_programa) === String(form.id_programa))
          : null;
        return (
          <Field label="Programa">
            <div className="flex items-center gap-2 rounded-lg border border-linha bg-papel px-3 py-2 text-sm">
              {prog ? (
                <>
                  {prog.codigo && (
                    <span className="rounded-full border border-acao/30 bg-acao/10
                                     px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-acao">
                      {prog.codigo}
                    </span>
                  )}
                  <span className="text-tinta-2">{prog.nome}</span>
                </>
              ) : (
                <span className="text-cinza/80 italic">Sem programa — seleciona um no filtro do topo</span>
              )}
            </div>
          </Field>
        );
      })()}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ano">
          <input
            className={inputCls}
            type="number"
            min={1}
            max={4}
            value={form.ano}
            onChange={e => set('ano', e.target.value)}
            placeholder="1"
          />
        </Field>
        <Field label="Semestre">
          <input
            className={inputCls}
            type="number"
            min={1}
            max={2}
            value={form.semestre}
            onChange={e => set('semestre', e.target.value)}
            placeholder="1"
          />
        </Field>
      </div>

      <div className={`pt-2 ${onCancel ? 'flex gap-3' : ''}`}>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.nome.trim()}
          className={`${onCancel ? 'flex-1' : 'w-full'} rounded-lg bg-acao py-2.5 text-sm font-semibold text-white
                     hover:bg-acao-escuro transition disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saving ? 'A guardar…' : 'Guardar Alterações do Módulo'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-lg border border-linha py-2.5 text-sm font-medium
                       text-cinza hover:bg-papel hover:text-tinta transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────── */
const ITEMS_PER_PAGE_DISC = 5;

export default function DisciplinasPage() {
  const { entidadeId, programaId, programas } = useAdminFilter();

  const [disciplinas,    setDisciplinas]    = useState([]);
  const [todosProgramas, setTodosProgramas] = useState([]);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [loading,        setLoading]        = useState(true);
  const [modal,          setModal]          = useState(null); // null | 'nova' | { disciplina }
  const [saving,         setSaving]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(null);
  const [deleting,       setDeleting]       = useState(false);
  const [toast,          setToast]          = useState(null); // { msg, isError } | null
  const [currentPage,    setCurrentPage]    = useState(1);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    if (!isError) setTimeout(() => setToast(null), 3000);
  }

  // Fetch de todos os programas (para o selector no formulário)
  useEffect(() => {
    async function fetchTodosProgramas() {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from('programa')
        .select('id_programa, nome, codigo, id_entidade, entidade:id_entidade(nome)')
        .order('codigo');
      setTodosProgramas(data ?? []);
    }
    fetchTodosProgramas();
  }, []);

  const fetchDisciplinas = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const { data, error } = await supabase
      .from('modulo')
      .select('id_modulo, nome, codigo, descricao, ano, semestre, id_programa')
      .order('ano',      { ascending: true })
      .order('semestre', { ascending: true })
      .order('nome',     { ascending: true });

    if (!error) setDisciplinas(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDisciplinas(); }, [fetchDisciplinas]);

  /* ─── Criar disciplina ─────────────────────────────────────── */
  async function handleCreate(form) {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const payload  = {
      nome:        form.nome.trim(),
      codigo:      form.codigo.trim()    || null,
      descricao:   form.descricao.trim() || null,
      ano:         form.ano      !== '' ? Number(form.ano)      : null,
      semestre:    form.semestre !== '' ? Number(form.semestre) : null,
      id_programa: form.id_programa ? Number(form.id_programa) : null,
    };

    const { error } = await supabase.from('modulo').insert([payload]);

    if (error) {
      showToast('Erro ao criar módulo: ' + error.message, true);
    } else {
      showToast('Módulo criado com sucesso!');
      setModal(null);
      fetchDisciplinas();
    }
    setSaving(false);
  }

  /* ─── Editar disciplina ────────────────────────────────────── */
  async function handleEdit(form) {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const payload  = {
      nome:        form.nome.trim(),
      codigo:      form.codigo.trim()    || null,
      descricao:   form.descricao.trim() || null,
      ano:         form.ano      !== '' ? Number(form.ano)      : null,
      semestre:    form.semestre !== '' ? Number(form.semestre) : null,
      id_programa: form.id_programa ? Number(form.id_programa) : null,
    };

    const { error } = await supabase
      .from('modulo')
      .update(payload)
      .eq('id_modulo', modal.disciplina.id_modulo);

    if (error) {
      showToast('Erro ao editar: ' + error.message, true);
    } else {
      showToast('Módulo atualizado!');
      setModal(null);
      fetchDisciplinas();
    }
    setSaving(false);
  }

  /* ─── Eliminar disciplina ──────────────────────────────────── */
  async function handleDelete() {
    setDeleting(true);
    const supabase = createSupabaseBrowser();

    // Remove primeiro as associações na tabela junction
    await supabase.from('modulo_media').delete().eq('id_modulo', confirmDelete);
    const { error } = await supabase
      .from('modulo')
      .delete()
      .eq('id_modulo', confirmDelete);

    if (error) {
      showToast('Erro ao eliminar: ' + error.message, true);
    } else {
      showToast('Módulo eliminado.');
      fetchDisciplinas();
    }
    setConfirmDelete(null);
    setDeleting(false);
  }

  const programaIdsEntidade = programas.map(p => p.id_programa);
  const disciplinasFiltradas = disciplinas.filter(d => {
    if (programaId && d.id_programa != programaId) return false;
    if (entidadeId && !programaId && !programaIdsEntidade.includes(d.id_programa)) return false;
    const query = searchQuery.toLowerCase();
    if (query) return (
      (d.nome     && d.nome.toLowerCase().includes(query)) ||
      (d.codigo   && d.codigo.toLowerCase().includes(query)) ||
      (d.descricao && d.descricao.toLowerCase().includes(query))
    );
    return true;
  });

  useEffect(() => { setCurrentPage(1); }, [searchQuery, entidadeId, programaId]);

  const totalPagesDis  = Math.ceil(disciplinasFiltradas.length / ITEMS_PER_PAGE_DISC);
  const startIndexDis  = (currentPage - 1) * ITEMS_PER_PAGE_DISC;
  const paginatedDiscs = disciplinasFiltradas.slice(startIndexDis, startIndexDis + ITEMS_PER_PAGE_DISC);

  const btnPageCls = (disabled) =>
    `rounded-md border border-linha bg-papel px-3 py-1.5 text-xs font-medium text-tinta-2
     transition hover:bg-mosaico hover:text-tinta disabled:opacity-30 disabled:cursor-not-allowed`;

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-lg border
                         px-4 py-2.5 text-sm text-tinta shadow-xl
                         ${toast.isError
                           ? 'border-ecgm-r/30 bg-ecgm-r/10'
                           : 'border-linha bg-superficie'}`}>
          <span>{toast.msg}</span>
          {toast.isError && (
            <button
              onClick={() => setToast(null)}
              className="text-cinza hover:text-tinta transition text-lg leading-none"
            >×</button>
          )}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Módulos</h1>
          <p className="text-sm text-cinza mt-1">
            {loading ? '…' : `${disciplinasFiltradas.length} disciplina${disciplinasFiltradas.length !== 1 ? 's' : ''}`}
          </p>
          <FilterContextLine />
        </div>
        <button
          onClick={() => setModal('nova')}
          className="flex items-center gap-2 rounded-lg bg-acao px-4 py-2.5 text-sm
                     font-semibold text-white hover:bg-acao-escuro transition"
        >
          <span className="text-lg leading-none">+</span>
          Novo Módulo
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-cinza/80">
            {/* Ícone de Lupa */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
        ) : disciplinasFiltradas.length === 0 ? (
          <div className="py-12 text-center text-sm text-cinza/80">
            {disciplinas.length === 0
              ? 'Nenhum módulo encontrado. Cria o primeiro!'
              : searchQuery
                ? `Nenhum módulo corresponde à pesquisa "${searchQuery}".`
                : 'Nenhum módulo para o filtro selecionado.'}
          </div>
        ) : (
          <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cinza/80 border-b border-linha bg-papel">
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-5 py-3 font-medium">Código</th>
                <th className="text-left px-5 py-3 font-medium">Ano</th>
                <th className="text-left px-5 py-3 font-medium">Semestre</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDiscs.map((d, i) => (
                <tr
                  key={d.id_modulo}
                  className={`transition hover:bg-papel ${i !== paginatedDiscs.length - 1 ? 'border-b border-linha' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-tinta">{d.nome}</div>
                    {d.descricao && (
                      <div className="text-xs text-cinza/80 mt-0.5 truncate max-w-xs">{d.descricao}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-cinza">{d.codigo ?? '—'}</td>
                  <td className="px-5 py-3.5 text-cinza">{d.ano != null ? `${d.ano}º` : '—'}</td>
                  <td className="px-5 py-3.5 text-cinza">{d.semestre != null ? `${d.semestre}º` : '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ disciplina: d })}
                        className="rounded-md border border-linha px-3 py-1.5 text-xs font-medium
                                   text-cinza hover:bg-papel hover:text-tinta transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(d.id_modulo)}
                        className="rounded-md border border-ecgm-r/30 px-3 py-1.5 text-xs font-medium
                                   text-ecgm-r hover:bg-ecgm-r/10 hover:text-ecgm-r transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPagesDis > 1 && (
            <div className="flex items-center justify-between border-t border-linha bg-papel px-6 py-4">
              <p className="text-xs text-cinza">
                A mostrar <span className="font-semibold text-tinta">{startIndexDis + 1}</span> a{' '}
                <span className="font-semibold text-tinta">{Math.min(startIndexDis + ITEMS_PER_PAGE_DISC, disciplinasFiltradas.length)}</span>{' '}
                de <span className="font-semibold text-tinta">{disciplinasFiltradas.length}</span> módulos
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className={btnPageCls(currentPage === 1)}>Anterior</button>
                <span className="text-xs text-cinza font-mono px-2">{currentPage} / {totalPagesDis}</span>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPagesDis))} disabled={currentPage === totalPagesDis} className={btnPageCls(currentPage === totalPagesDis)}>Próxima</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Modal — Nova Disciplina */}
      {modal === 'nova' && (
        <Modal title="Novo Módulo" onClose={() => setModal(null)}>
          <DisciplinaForm
            initial={{ id_programa: programaId || '' }}
            programas={todosProgramas}
            onSave={handleCreate}
            onCancel={() => setModal(null)}
            saving={saving}
          />
        </Modal>
      )}

      {/* Modal — Editar Disciplina */}
      {modal?.disciplina && (
        <Modal title={`Gerir: ${modal.disciplina.nome}`} onClose={() => setModal(null)}>
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-tinta mb-3">Informação Base</h3>
            <DisciplinaForm
              initial={modal.disciplina}
              programas={todosProgramas}
              onSave={handleEdit}
              saving={saving}
            />
          </div>
          <hr className="border-linha mb-6" />
          <DisciplinaMedia idModulo={modal.disciplina.id_modulo} />
        </Modal>
      )}

      {/* Modal — Confirmar eliminação */}
      {confirmDelete !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-tinta-2 mb-6">
            Tens a certeza que queres eliminar este módulo?
            Esta ação não pode ser desfeita e remove todas as associações com modelos 3D.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-lg bg-ecgm-r py-2.5 text-sm font-semibold text-white
                         hover:bg-ecgm-r transition disabled:opacity-50"
            >
              {deleting ? 'A eliminar…' : 'Eliminar'}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
              className="flex-1 rounded-lg border border-linha py-2.5 text-sm font-medium
                         text-cinza hover:bg-papel transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}