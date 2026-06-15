'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter } from '../AdminFilterContext';

/* ─── Modal genérico ────────────────────────────────────────────── */
function Modal({ title, onClose, children, large = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative z-10 w-full ${large ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition text-xl leading-none"
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

  if (loading) return <p className="text-xs text-white/25 py-2">A carregar media…</p>;

  return (
    <div className="space-y-6">

      {/* Modelos 3D */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#4f9eff]">Modelos 3D Associados</h3>
            <p className="text-xs text-white/40 mt-0.5">
              Associa modelos na página{' '}
              <a href="/admin/modelos" className="text-[#4f9eff]/70 hover:text-[#4f9eff] transition">Modelos 3D</a>.
            </p>
          </div>
        </div>
        {modelos.length === 0 ? (
          <div className="py-6 text-center text-xs text-white/30 border border-dashed border-white/10 rounded-lg bg-white/2">
            Nenhum modelo associado a esta disciplina.
          </div>
        ) : (
          <div className="space-y-2">
            {modelos.map(m => (
              <div key={m.id_media_items}
                className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 transition hover:bg-white/10">
                <span className="text-lg">🧊</span>
                <p className="text-sm font-medium text-white/85 truncate">
                  {m.titulo || `Modelo #${m.id_media_items}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-white/5" />

      {/* Vídeo / Imagem do card */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#4f9eff]">Vídeo / Imagem do Card</h3>
            <p className="text-xs text-white/40 mt-0.5">Media apresentada no card público da disciplina.</p>
          </div>
        </div>
        {cardMedia.length > 0 ? (
          <div className="space-y-2">
            {cardMedia.map(item => (
              <div key={item.id_media_items}
                className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5 transition hover:bg-white/10">
                <div className="w-20 h-14 rounded overflow-hidden shrink-0 bg-[#0c0c0f]">
                  {isVideo(item.url) ? (
                    <video src={item.url} className="w-full h-full object-cover" muted loop playsInline />
                  ) : (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 truncate">{item.titulo || item.url?.split('/').pop()}</p>
                  <p className="text-[10px] text-white/25 uppercase mt-0.5">{item.tipo}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="text-xs text-white/40 border border-white/10 px-2 py-1 rounded hover:bg-white/5 transition"
                  >
                    Substituir
                  </button>
                  <button
                    onClick={() => handleRemover(item)}
                    disabled={uploading}
                    className="text-xs text-red-400/50 border border-red-500/20 px-2 py-1 rounded
                               hover:bg-red-500/10 hover:text-red-400 transition"
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
              ${uploading ? 'border-white/5 cursor-wait' : 'border-white/10 hover:border-[#4f9eff]/40 hover:bg-[#4f9eff]/5 cursor-pointer'}`}
          >
            <span className="text-2xl">{uploading ? '⏳' : '📥'}</span>
            <div>
              <p className="text-sm font-medium text-white/70">
                {uploading ? 'A enviar…' : 'Adicionar vídeo ou imagem ao card'}
              </p>
              <p className="text-xs text-white/25 mt-0.5">JPG, PNG, MP4, WebM</p>
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
      <label className="block text-xs font-medium text-white/50 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition`;

/* ─── Formulário de disciplina ──────────────────────────────────── */
function DisciplinaForm({ initial = {}, onSave, onCancel, saving }) {
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
          placeholder="Breve descrição da disciplina…"
        />
      </Field>
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
          className={`${onCancel ? 'flex-1' : 'w-full'} rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saving ? 'A guardar…' : 'Guardar Alterações da Disciplina'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                       text-white/50 hover:bg-white/5 hover:text-white/80 transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────── */
export default function DisciplinasPage() {
  const { entidadeId, programaId, programas } = useAdminFilter();

  const [disciplinas, setDisciplinas] = useState([]);
  const [searchQuery, setSearchQuery] = useState(''); // <-- Estado para a pesquisa
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null); // null | 'nova' | { disciplina }
  const [saving, setSaving]           = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // id a eliminar
  const [deleting, setDeleting]       = useState(false);
  const [toast, setToast]             = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

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
      nome:      form.nome.trim(),
      codigo:    form.codigo.trim()    || null,
      descricao: form.descricao.trim() || null,
      ano:       form.ano      !== '' ? Number(form.ano)      : null,
      semestre:  form.semestre !== '' ? Number(form.semestre) : null,
    };

    const { error } = await supabase.from('modulo').insert([payload]);

    if (error) {
      showToast('Erro ao criar disciplina: ' + error.message);
    } else {
      showToast('Disciplina criada com sucesso!');
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
      showToast('Disciplina atualizada!');
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
      showToast('Erro ao eliminar: ' + error.message);
    } else {
      showToast('Disciplina eliminada.');
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

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a]
                        px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Disciplinas</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading ? '…' : `${disciplinasFiltradas.length} disciplina${disciplinasFiltradas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setModal('nova')}
          className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm
                     font-semibold text-white hover:bg-[#3d8aef] transition"
        >
          <span className="text-lg leading-none">+</span>
          Nova Disciplina
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
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
            className="w-full rounded-xl border border-white/10 bg-[#13131a] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-[#4f9eff]/50 focus:outline-none focus:ring-1 focus:ring-[#4f9eff]/30 transition shadow-sm"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
        ) : disciplinasFiltradas.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            {disciplinas.length === 0
              ? 'Nenhuma disciplina encontrada. Cria a primeira!'
              : searchQuery
                ? `Nenhuma disciplina corresponde à pesquisa "${searchQuery}".`
                : 'Nenhuma disciplina para o filtro selecionado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-5 py-3 font-medium">Código</th>
                <th className="text-left px-5 py-3 font-medium">Ano</th>
                <th className="text-left px-5 py-3 font-medium">Semestre</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {disciplinasFiltradas.map((d, i) => (
                <tr
                  key={d.id_modulo}
                  className={`transition hover:bg-white/2 ${i !== disciplinasFiltradas.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-white/85">{d.nome}</div>
                    {d.descricao && (
                      <div className="text-xs text-white/30 mt-0.5 truncate max-w-xs">{d.descricao}</div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-white/35">{d.codigo ?? '—'}</td>
                  <td className="px-5 py-3.5 text-white/45">{d.ano != null ? `${d.ano}º` : '—'}</td>
                  <td className="px-5 py-3.5 text-white/45">{d.semestre != null ? `${d.semestre}º` : '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ disciplina: d })}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium
                                   text-white/50 hover:bg-white/5 hover:text-white/80 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(d.id_modulo)}
                        className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium
                                   text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Nova Disciplina */}
      {modal === 'nova' && (
        <Modal title="Nova Disciplina" onClose={() => setModal(null)}>
          <DisciplinaForm
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
            <h3 className="text-sm font-semibold text-white/80 mb-3">Informação Base</h3>
            <DisciplinaForm
              initial={modal.disciplina}
              onSave={handleEdit}
              saving={saving}
            />
          </div>
          <hr className="border-white/5 mb-6" />
          <DisciplinaMedia idModulo={modal.disciplina.id_modulo} />
        </Modal>
      )}

      {/* Modal — Confirmar eliminação */}
      {confirmDelete !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-white/60 mb-6">
            Tens a certeza que queres eliminar esta disciplina?
            Esta ação não pode ser desfeita e remove todas as associações com modelos 3D.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-sm font-semibold text-white
                         hover:bg-red-500 transition disabled:opacity-50"
            >
              {deleting ? 'A eliminar…' : 'Eliminar'}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              disabled={deleting}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                         text-white/50 hover:bg-white/5 transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}