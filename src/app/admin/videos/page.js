'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter, FilterContextLine } from '../AdminFilterContext';

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition`;

/* ─── Modal genérico ─────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Formulário novo vídeo ──────────────────────────────────────── */
function NovoVideoForm({ onSave, onCancel, saving, disciplinas }) {
  const [titulo,    setTitulo]    = useState('');
  const [moduloId,  setModuloId]  = useState('');
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  async function handleSave() {
    if (!file)     { setError('Seleciona um ficheiro de vídeo.'); return; }
    if (!moduloId) { setError('Seleciona uma disciplina.'); return; }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) { setError(json.error ?? 'Erro no upload.'); setUploading(false); return; }

    const disciplina = disciplinas.find(d => d.id_modulo == moduloId);
    await onSave({
      titulo:      titulo.trim() || disciplina?.nome || 'Vídeo',
      url:         json.url,
      id_modulo:   Number(moduloId),
      id_programa: disciplina?.id_programa ?? null,
      id_entidade: Array.isArray(disciplina?.programa)
        ? disciplina.programa[0]?.id_entidade
        : disciplina?.programa?.id_entidade ?? null,
    });
    setUploading(false);
  }

  const isBusy = saving || uploading;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Disciplina *</label>
        {disciplinas.length === 0 ? (
          <p className="text-xs text-white/30 py-2">
            Todas as disciplinas já têm um vídeo associado, ou nenhum programa está selecionado.
          </p>
        ) : (
          <select className={inputCls} value={moduloId} onChange={e => setModuloId(e.target.value)}>
            <option value="" disabled>Seleciona a disciplina...</option>
            {disciplinas.map(d => (
              <option key={d.id_modulo} value={d.id_modulo}>{d.nome}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Título (opcional)</label>
        <input
          className={inputCls}
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="ex: Demonstração do produto"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Ficheiro de Vídeo *</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 cursor-pointer transition
            ${file ? 'border-[#4f9eff]/40 bg-[#4f9eff]/5' : 'border-white/10 hover:border-white/20'}`}
        >
          <span className="text-2xl">{file ? '🎬' : '📁'}</span>
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
                <p className="text-xs text-white/30">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            ) : (
              <p className="text-sm text-white/30">Clica para selecionar .mp4 ou .webm</p>
            )}
          </div>
          {file && (
            <button
              onClick={e => { e.stopPropagation(); setFile(null); fileRef.current.value = ''; }}
              className="text-white/25 hover:text-red-400 transition text-lg leading-none"
            >×</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".mp4,.webm" className="hidden"
          onChange={e => { setFile(e.target.files[0] ?? null); setError(''); }} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={isBusy || disciplinas.length === 0}
          className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'A fazer upload…' : saving ? 'A guardar…' : 'Adicionar Vídeo'}
        </button>
        <button
          onClick={onCancel}
          disabled={isBusy}
          className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                     text-white/50 hover:bg-white/5 hover:text-white/80 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─── Modal editar vídeo ─────────────────────────────────────────── */
function EditVideoModal({ video, onClose, onSave, saving, todasDisciplinas }) {
  const [titulo,          setTitulo]          = useState(video.titulo ?? '');
  const [disciplinaId,    setDisciplinaId]    = useState(String(video.id_modulo_atual ?? ''));
  const [currentModuloId] = useState(video.id_modulo_atual ?? null);
  const [file,            setFile]            = useState(null);
  const [uploading,       setUploading]       = useState(false);
  const [replaceError,    setReplaceError]    = useState('');
  const fileRef = useRef();

  async function handleSubstituir() {
    if (!file) { setReplaceError('Seleciona um ficheiro.'); return; }
    setUploading(true);
    setReplaceError('');

    const formData = new FormData();
    formData.append('file', file);
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) { setReplaceError(json.error ?? 'Erro no upload.'); setUploading(false); return; }

    await fetch('/api/delete-model', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: video.url }),
    });

    await onSave({ titulo, disciplinaId, originalModuloId: currentModuloId, newUrl: json.url });
    setUploading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="text-base font-semibold text-white">Editar Vídeo</h2>
            <p className="text-xs text-white/35 mt-0.5">{titulo || '—'}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Título</label>
            <input
              className={inputCls}
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Título do vídeo"
            />
          </div>

          {/* Disciplina */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Disciplina Associada</label>
            <select
              value={disciplinaId}
              onChange={e => setDisciplinaId(e.target.value)}
              className={inputCls}
            >
              <option value="">Nenhuma</option>
              {todasDisciplinas.map(d => (
                <option key={d.id_modulo} value={String(d.id_modulo)}>{d.nome}</option>
              ))}
            </select>
            {disciplinaId !== String(currentModuloId ?? '') && (
              <p className="text-xs text-[#4f9eff]/60 mt-1.5">Alteração guardada ao clicar "Guardar"</p>
            )}
          </div>

          {/* Ficheiro atual */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Ficheiro Atual</label>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#4f9eff]/60 hover:text-[#4f9eff] transition truncate block"
              title={video.url}
            >
              {video.url?.split('/').pop() ?? video.url}
            </a>
          </div>

          {/* Substituir ficheiro */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Substituir Vídeo</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition
                ${file ? 'border-[#4f9eff]/40 bg-[#4f9eff]/5' : 'border-white/10 hover:border-white/20'}`}
            >
              <span className="text-xl">{file ? '🎬' : '📁'}</span>
              <div className="flex-1 min-w-0">
                {file ? (
                  <>
                    <p className="text-sm text-white/80 truncate">{file.name}</p>
                    <p className="text-xs text-white/30">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <p className="text-sm text-white/30">Clica para escolher novo ficheiro</p>
                )}
              </div>
              {file && (
                <button
                  onClick={e => { e.stopPropagation(); setFile(null); fileRef.current.value = ''; }}
                  className="text-white/25 hover:text-red-400 transition text-lg leading-none"
                >×</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".mp4,.webm" className="hidden"
              onChange={e => { setFile(e.target.files[0] ?? null); setReplaceError(''); }} />
            {file && (
              <button
                onClick={handleSubstituir}
                disabled={uploading}
                className="mt-2 w-full rounded-lg border border-[#4f9eff]/30 bg-[#4f9eff]/10 py-2
                           text-xs font-medium text-[#4f9eff] hover:bg-[#4f9eff]/20 transition disabled:opacity-50"
              >
                {uploading ? 'A substituir…' : 'Confirmar substituição'}
              </button>
            )}
            {replaceError && <p className="text-xs text-red-400 mt-1.5">{replaceError}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => onSave({ titulo, disciplinaId, originalModuloId: currentModuloId })}
              disabled={saving || !titulo.trim()}
              className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                         hover:bg-[#3d8aef] transition disabled:opacity-50"
            >
              {saving ? 'A guardar…' : 'Guardar'}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                         text-white/50 hover:bg-white/5 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────── */
export default function AdminVideosPage() {
  const { entidadeId, programaId, programas } = useAdminFilter();

  const [videos,           setVideos]           = useState([]);
  const [todasDisciplinas, setTodasDisciplinas] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showModal,        setShowModal]        = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState(null);
  const [deleting,         setDeleting]         = useState(false);
  const [editVideo,        setEditVideo]        = useState(null);
  const [savingEdit,       setSavingEdit]       = useState(false);
  const [toast,            setToast]            = useState('');
  const [currentPage,      setCurrentPage]      = useState(1);
  const ITEMS_PER_PAGE = 10;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  /* ─── Carregar dados ─────────────────────────────────────────────── */
  const fetchDados = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();

    const { data: disciplinas } = await supabase
      .from('modulo')
      .select('id_modulo, nome, id_programa, programa:id_programa(id_entidade)')
      .order('nome');
    setTodasDisciplinas(disciplinas || []);

    const { data: ligacoes } = await supabase
      .from('modulo_media')
      .select('id_media_items, id_modulo, modulo:id_modulo(nome)');

    /* Apenas vídeos associados a um módulo via modulo_media são "Vídeos de Fundo".
       Excluímos assim vídeos de projetos (id_projetos) ou outros contextos. */
    const mediaItemIds = Array.from(new Set((ligacoes || []).map(l => l.id_media_items)));

    if (mediaItemIds.length > 0) {
      const { data: videosData } = await supabase
        .from('media_items')
        .select('*')
        .eq('tipo', 'video')
        .in('id_media_items', mediaItemIds)
        .order('id_media_items', { ascending: false });

      setVideos((videosData || []).map(v => {
        const lig = ligacoes?.find(l => l.id_media_items === v.id_media_items);
        return { ...v, nome_disciplina: lig?.modulo?.nome ?? null, id_modulo_atual: lig?.id_modulo ?? null };
      }));
    } else {
      setVideos([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchDados(); }, [fetchDados]);
  useEffect(() => { setCurrentPage(1); }, [entidadeId, programaId]);

  /* ─── Filtragem ──────────────────────────────────────────────────── */
  const programaIdsEntidade = programas.map(p => p.id_programa);
  const videosFiltrados = videos.filter(v => {
    if (programaId && v.id_programa != programaId) return false;
    if (entidadeId && !programaIdsEntidade.includes(v.id_programa)) return false;
    return true;
  });

  /* Disciplinas sem vídeo (para o modal de novo vídeo) */
  const moduloIdsComVideo = new Set(videos.map(v => v.id_modulo_atual).filter(Boolean));
  const disciplinasSemVideo = todasDisciplinas.filter(d => {
    if (moduloIdsComVideo.has(d.id_modulo)) return false;
    if (programaId && d.id_programa != programaId) return false;
    if (entidadeId && !programaIdsEntidade.includes(d.id_programa)) return false;
    return true;
  });

  /* Paginação */
  const totalPages  = Math.ceil(videosFiltrados.length / ITEMS_PER_PAGE);
  const startIndex  = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVideos = videosFiltrados.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  /* ─── Criar vídeo ────────────────────────────────────────────────── */
  async function handleCreate({ titulo, url, id_modulo, id_programa, id_entidade }) {
    setSaving(true);
    const supabase = createSupabaseBrowser();

    const { data: novoVideo, error: mediaError } = await supabase
      .from('media_items')
      .insert([{
        titulo,
        url,
        tipo:        'video',
        loop:        true,
        id_programa: id_programa || null,
        id_entidade: id_entidade || null,
      }])
      .select()
      .single();

    if (mediaError) { showToast('Erro: ' + mediaError.message); setSaving(false); return; }

    const { error: relError } = await supabase
      .from('modulo_media')
      .insert([{ id_modulo, id_media_items: novoVideo.id_media_items }]);

    if (relError) {
      showToast('Vídeo criado, mas falhou a associar à disciplina: ' + relError.message);
    } else {
      showToast('Vídeo adicionado com sucesso!');
      setShowModal(false);
      fetchDados();
    }
    setSaving(false);
  }

  /* ─── Editar vídeo ───────────────────────────────────────────────── */
  async function handleEdit({ titulo, disciplinaId, originalModuloId, newUrl }) {
    setSavingEdit(true);
    const supabase = createSupabaseBrowser();

    const updateData = { titulo: titulo.trim() };
    if (newUrl) updateData.url = newUrl;

    const { error } = await supabase
      .from('media_items')
      .update(updateData)
      .eq('id_media_items', editVideo.id_media_items);

    if (error) { showToast('Erro ao guardar: ' + error.message); setSavingEdit(false); return; }

    const novoModuloId = disciplinaId ? Number(disciplinaId) : null;
    if (originalModuloId !== novoModuloId) {
      if (originalModuloId) {
        await supabase.from('modulo_media')
          .delete()
          .eq('id_media_items', editVideo.id_media_items)
          .eq('id_modulo', originalModuloId);
      }
      if (novoModuloId) {
        await supabase.from('modulo_media')
          .insert([{ id_media_items: editVideo.id_media_items, id_modulo: novoModuloId }]);
      }
    }

    showToast('Vídeo atualizado com sucesso!');
    setEditVideo(null);
    fetchDados();
    setSavingEdit(false);
  }

  /* ─── Eliminar vídeo ─────────────────────────────────────────────── */
  async function handleDelete() {
    setDeleting(true);
    const video = videos.find(v => v.id_media_items === confirmDelete);

    if (video?.url) {
      const res = await fetch('/api/delete-model', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: video.url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast('Erro ao apagar ficheiro R2: ' + (json.error ?? res.statusText));
        setDeleting(false);
        return;
      }
    }

    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id_media_items', confirmDelete);

    if (error) { showToast('Erro: ' + error.message); }
    else {
      showToast('Vídeo eliminado.');
      fetchDados();
      if (paginatedVideos.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
    }
    setConfirmDelete(null);
    setDeleting(false);
  }

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="p-8 max-w-5xl mx-auto">

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a]
                        px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Vídeos de Fundo</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading
              ? '…'
              : `${videosFiltrados.length} vídeo${videosFiltrados.length !== 1 ? 's' : ''} encontrados`}
          </p>
          <FilterContextLine />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm
                     font-semibold text-white hover:bg-[#3d8aef] transition"
        >
          <span className="text-lg leading-none">+</span>
          Novo Vídeo
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
        ) : videosFiltrados.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-white/25 mb-4">Nenhum vídeo adicionado ainda.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2
                         text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition"
            >
              <span>+</span> Adicionar primeiro vídeo
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                    <th className="text-left px-5 py-3 font-medium">Título</th>
                    <th className="text-left px-5 py-3 font-medium">Disciplina</th>
                    <th className="text-left px-5 py-3 font-medium">Ficheiro</th>
                    <th className="px-5 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedVideos.map((v, i) => (
                    <tr
                      key={v.id_media_items}
                      className={`transition hover:bg-white/2 ${i !== paginatedVideos.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="text-base shrink-0">🎬</span>
                          <p className="font-medium text-white/85 truncate max-w-[180px]">{v.titulo ?? '—'}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-white/45 text-xs">{v.nome_disciplina ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#4f9eff]/60 hover:text-[#4f9eff] transition truncate block max-w-[160px]"
                          title={v.url}
                        >
                          {v.url?.split('/').pop() ?? v.url}
                        </a>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditVideo(v)}
                            className="rounded-md border border-[#4f9eff]/20 px-3 py-1.5 text-xs font-medium
                                       text-[#4f9eff]/60 hover:bg-[#4f9eff]/10 hover:text-[#4f9eff] transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setConfirmDelete(v.id_media_items)}
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
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 bg-[#0c0c0f] px-6 py-4">
                <p className="text-xs text-white/40">
                  A mostrar{' '}
                  <span className="font-semibold text-white/80">{startIndex + 1}</span> a{' '}
                  <span className="font-semibold text-white/80">
                    {Math.min(startIndex + ITEMS_PER_PAGE, videosFiltrados.length)}
                  </span>{' '}
                  de <span className="font-semibold text-white/80">{videosFiltrados.length}</span> vídeos
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium
                               text-white/60 hover:bg-white/10 hover:text-white transition
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-white/40 font-mono px-2">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium
                               text-white/60 hover:bg-white/10 hover:text-white transition
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal — Novo Vídeo */}
      {showModal && (
        <Modal title="Novo Vídeo de Fundo" onClose={() => setShowModal(false)}>
          <NovoVideoForm
            onSave={handleCreate}
            onCancel={() => setShowModal(false)}
            saving={saving}
            disciplinas={disciplinasSemVideo}
          />
        </Modal>
      )}

      {/* Modal — Editar Vídeo */}
      {editVideo && (
        <EditVideoModal
          video={editVideo}
          onClose={() => setEditVideo(null)}
          onSave={handleEdit}
          saving={savingEdit}
          todasDisciplinas={todasDisciplinas}
        />
      )}

      {/* Modal — Confirmar eliminação */}
      {confirmDelete !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-white/60 mb-6">
            Tens a certeza que queres eliminar este vídeo? O ficheiro no R2 será apagado permanentemente.
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
