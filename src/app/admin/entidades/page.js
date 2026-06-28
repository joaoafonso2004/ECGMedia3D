'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter, FilterContextLine } from '../AdminFilterContext';

function toSlug(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

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

const PER_PAGE = 10;

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  const btnCls = (active, disabled) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition border
     ${disabled ? 'border-white/5 text-white/15 cursor-not-allowed' :
       active ? 'border-[#4f9eff]/30 bg-[#4f9eff]/12 text-[#4f9eff]' :
       'border-white/8 text-white/40 hover:bg-white/5 hover:text-white/70'}`;
  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      <button className={btnCls(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      {pages.map(p => (
        <button key={p} className={btnCls(p === page, false)} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className={btnCls(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Seguinte →
      </button>
    </div>
  );
}

export default function EntidadesPage() {
  const { refreshEntidades } = useAdminFilter();

  const [entidades,    setEntidades]    = useState([]);
  const [progCounts,   setProgCounts]   = useState({});
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [page,         setPage]         = useState(1);
  const [sortAsc,      setSortAsc]      = useState(true);
  const [modal,        setModal]        = useState(null); // null | 'nova' | { ent }
  const [deleteTarget, setDeleteTarget] = useState(null); // { ent, progCount, modCount } | null
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState(null);

  const [form,       setForm]       = useState({ nome: '', tipo: '', slug: '' });
  const [slugManual, setSlugManual] = useState(false);
  const [formError,  setFormError]  = useState('');

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    if (!isError) setTimeout(() => setToast(null), 3000);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const [{ data: ents }, { data: progs }] = await Promise.all([
      supabase.from('entidade').select('id_entidade, nome, tipo, slug').order('nome'),
      supabase.from('programa').select('id_entidade'),
    ]);
    setEntidades(ents ?? []);
    const cm = {};
    progs?.forEach(p => { cm[p.id_entidade] = (cm[p.id_entidade] || 0) + 1; });
    setProgCounts(cm);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = entidades
    .filter(e => {
      if (!search) return true;
      const q = search.toLowerCase();
      return e.nome?.toLowerCase().includes(q) || e.slug?.toLowerCase().includes(q);
    })
    .sort((a, b) => sortAsc
      ? a.nome.localeCompare(b.nome, 'pt')
      : b.nome.localeCompare(a.nome, 'pt'));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  function openCreate() {
    setForm({ nome: '', tipo: '', slug: '' });
    setSlugManual(false);
    setFormError('');
    setModal('nova');
  }

  function openEdit(ent) {
    setForm({ nome: ent.nome, tipo: ent.tipo || '', slug: ent.slug || '' });
    setSlugManual(true);
    setFormError('');
    setModal({ ent });
  }

  async function openDelete(ent) {
    setDeleteTarget({ ent, progCount: null, modCount: null });
    const supabase = createSupabaseBrowser();
    const { data: progs } = await supabase.from('programa').select('id_programa').eq('id_entidade', ent.id_entidade);
    const progIds = progs?.map(p => p.id_programa) ?? [];
    let modCount = 0;
    if (progIds.length > 0) {
      const { count } = await supabase.from('modulo').select('*', { count: 'exact', head: true }).in('id_programa', progIds);
      modCount = count ?? 0;
    }
    setDeleteTarget(prev => prev ? { ...prev, progCount: progIds.length, modCount } : null);
  }

  function handleNomeChange(nome) {
    setForm(f => ({ ...f, nome, ...(!slugManual ? { slug: toSlug(nome) } : {}) }));
    if (formError) setFormError('');
  }
  function handleSlugChange(slug) {
    setSlugManual(true);
    setForm(f => ({ ...f, slug }));
    if (formError) setFormError('');
  }

  async function handleSave() {
    if (!form.nome.trim()) { setFormError('O nome é obrigatório.'); return; }
    if (!form.slug.trim()) { setFormError('O slug é obrigatório.'); return; }
    setSaving(true);
    setFormError('');
    const supabase = createSupabaseBrowser();
    const payload  = { nome: form.nome.trim(), tipo: form.tipo.trim() || null, slug: form.slug.trim().toLowerCase() };
    let error;
    if (modal === 'nova') {
      ({ error } = await supabase.from('entidade').insert([payload]));
    } else {
      ({ error } = await supabase.from('entidade').update(payload).eq('id_entidade', modal.ent.id_entidade));
    }
    if (error) {
      setFormError(error.code === '23505' ? 'Já existe uma entidade com este slug.' : error.message);
    } else {
      showToast(modal === 'nova' ? 'Entidade criada!' : 'Entidade atualizada!');
      setModal(null);
      fetchData();
      refreshEntidades();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase = createSupabaseBrowser();
    const entId = deleteTarget.ent.id_entidade;

    const { data: progs } = await supabase.from('programa').select('id_programa').eq('id_entidade', entId);
    const progIds = progs?.map(p => p.id_programa) ?? [];
    if (progIds.length > 0) {
      const { data: mods } = await supabase.from('modulo').select('id_modulo').in('id_programa', progIds);
      const modIds = mods?.map(m => m.id_modulo) ?? [];
      if (modIds.length > 0) {
        await supabase.from('modulo_media').delete().in('id_modulo', modIds);
        await supabase.from('modulo').delete().in('id_programa', progIds);
      }
      await supabase.from('programa').delete().eq('id_entidade', entId);
    }

    const { error } = await supabase.from('entidade').delete().eq('id_entidade', entId);
    if (error) {
      showToast('Erro ao eliminar: ' + error.message, true);
    } else {
      showToast('Entidade eliminada.');
      setDeleteTarget(null);
      fetchData();
      refreshEntidades();
    }
    setDeleting(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm text-white shadow-xl
          ${toast.isError ? 'border-red-500/30 bg-red-950/80' : 'border-white/10 bg-[#13131a]'}`}>
          <span>{toast.msg}</span>
          {toast.isError && (
            <button onClick={() => setToast(null)} className="text-white/40 hover:text-white transition text-lg leading-none">×</button>
          )}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Entidades</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading ? '…' : `${filtered.length} entidade${filtered.length !== 1 ? 's' : ''}`}
          </p>
          <FilterContextLine />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d8aef] transition"
        >
          <span className="text-lg leading-none">+</span>
          Nova Entidade
        </button>
      </div>

      {/* Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Pesquisar por nome ou slug…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#13131a] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-[#4f9eff]/50 focus:outline-none focus:ring-1 focus:ring-[#4f9eff]/30 transition"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
        ) : pageData.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            {search ? `Nenhuma entidade encontrada para "${search}".` : 'Nenhuma entidade criada ainda.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                <th
                  className="text-left px-5 py-3 font-medium cursor-pointer hover:text-white/60 transition select-none"
                  onClick={() => { setSortAsc(s => !s); setPage(1); }}
                >
                  Nome {sortAsc ? '↑' : '↓'}
                </th>
                <th className="text-left px-5 py-3 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 font-medium">Slug</th>
                <th className="text-left px-5 py-3 font-medium">Programas</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((ent, i) => (
                <tr
                  key={ent.id_entidade}
                  className={`transition hover:bg-white/2 ${i !== pageData.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <td className="px-5 py-3.5 font-medium text-white/85">{ent.nome}</td>
                  <td className="px-5 py-3.5 text-white/40 text-xs">{ent.tipo ?? '—'}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-white/35">{ent.slug}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 rounded-full bg-[#4f9eff]/10 border border-[#4f9eff]/20 text-[10px] font-semibold text-[#4f9eff] px-1.5">
                      {progCounts[ent.id_entidade] ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(ent)}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => openDelete(ent)}
                        className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition"
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

      {totalPages > 1 && (
        <p className="text-xs text-white/40 text-center mt-4">
          A mostrar <span className="font-semibold text-white/80">{(safePage - 1) * PER_PAGE + 1}</span> a{' '}
          <span className="font-semibold text-white/80">{Math.min(safePage * PER_PAGE, filtered.length)}</span>{' '}
          de <span className="font-semibold text-white/80">{filtered.length}</span> entidades
        </p>
      )}
      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />

      {/* Modal — Nova / Editar */}
      {modal !== null && (
        <Modal
          title={modal === 'nova' ? 'Nova Entidade' : `Editar: ${modal.ent.nome}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <Field label="Nome *">
              <input
                className={inputCls}
                value={form.nome}
                onChange={e => handleNomeChange(e.target.value)}
                placeholder="ex: Instituto Politécnico de Viana do Castelo"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <input
                  className={inputCls}
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  placeholder="ex: instituto"
                />
              </Field>
              <Field label="Slug (URL) *">
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  placeholder="ex: ipvc"
                />
              </Field>
            </div>
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.nome.trim() || !form.slug.trim()}
                className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'A guardar…' : (modal === 'nova' ? 'Criar Entidade' : 'Guardar Alterações')}
              </button>
              <button
                onClick={() => setModal(null)}
                disabled={saving}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal — Eliminar */}
      {deleteTarget && (
        <Modal title="Eliminar Entidade" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white/80">
              Tens a certeza que queres eliminar <span className="text-white">{deleteTarget.ent.nome}</span>?
            </p>
            {deleteTarget.progCount === null ? (
              <p className="text-xs text-white/35">A calcular impacto…</p>
            ) : (
              <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3 text-xs text-red-300/80 leading-relaxed">
                Esta entidade tem{' '}
                <span className="font-semibold text-red-300">{deleteTarget.progCount} programa{deleteTarget.progCount !== 1 ? 's' : ''}</span>
                {' '}e{' '}
                <span className="font-semibold text-red-300">{deleteTarget.modCount} disciplina{deleteTarget.modCount !== 1 ? 's' : ''}</span>
                {' '}associadas. Todos serão eliminados permanentemente. Esta ação é irreversível.
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDelete}
                disabled={deleting || deleteTarget.progCount === null}
                className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                {deleting ? 'A eliminar…' : 'Eliminar definitivamente'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
