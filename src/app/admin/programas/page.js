'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter, FilterContextLine } from '../AdminFilterContext';

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

export default function ProgramasPage() {
  const { entidades, refreshProgramas } = useAdminFilter();

  const [programas,    setProgramas]    = useState([]);
  const [modCounts,    setModCounts]    = useState({});
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterEnt,    setFilterEnt]    = useState('');
  const [page,         setPage]         = useState(1);
  const [sortAsc,      setSortAsc]      = useState(true);
  const [modal,        setModal]        = useState(null); // null | 'novo' | { prog }
  const [deleteTarget, setDeleteTarget] = useState(null); // { prog, modCount } | null
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [toast,        setToast]        = useState(null);

  const [form,      setForm]      = useState({ nome: '', codigo: '', tipo: '', descricao: '', id_entidade: '' });
  const [formError, setFormError] = useState('');

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    if (!isError) setTimeout(() => setToast(null), 3000);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const [{ data: progs }, { data: mods }] = await Promise.all([
      supabase.from('programa')
        .select('id_programa, nome, codigo, tipo, descricao, id_entidade, entidade:id_entidade(nome)')
        .order('nome'),
      supabase.from('modulo').select('id_programa'),
    ]);
    setProgramas(progs ?? []);
    const cm = {};
    mods?.forEach(m => { cm[m.id_programa] = (cm[m.id_programa] || 0) + 1; });
    setModCounts(cm);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, filterEnt]);

  const filtered = programas
    .filter(p => {
      if (filterEnt && String(p.id_entidade) !== String(filterEnt)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return p.nome?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q);
    })
    .sort((a, b) => sortAsc
      ? a.nome.localeCompare(b.nome, 'pt')
      : b.nome.localeCompare(a.nome, 'pt'));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  function openCreate() {
    setForm({ nome: '', codigo: '', tipo: '', descricao: '', id_entidade: filterEnt || '' });
    setFormError('');
    setModal('novo');
  }

  function openEdit(prog) {
    setForm({
      nome:        prog.nome        || '',
      codigo:      prog.codigo      || '',
      tipo:        prog.tipo        || '',
      descricao:   prog.descricao   || '',
      id_entidade: String(prog.id_entidade || ''),
    });
    setFormError('');
    setModal({ prog });
  }

  async function openDelete(prog) {
    setDeleteTarget({ prog, modCount: null });
    const supabase = createSupabaseBrowser();
    const { count } = await supabase
      .from('modulo')
      .select('*', { count: 'exact', head: true })
      .eq('id_programa', prog.id_programa);
    setDeleteTarget(prev => prev ? { ...prev, modCount: count ?? 0 } : null);
  }

  async function handleSave() {
    if (!form.id_entidade) { setFormError('Seleciona uma entidade.'); return; }
    if (!form.nome.trim())   { setFormError('O nome é obrigatório.'); return; }
    if (!form.codigo.trim()) { setFormError('O código é obrigatório.'); return; }
    setSaving(true);
    setFormError('');
    const supabase = createSupabaseBrowser();
    const payload  = {
      nome:        form.nome.trim(),
      codigo:      form.codigo.trim().toUpperCase(),
      tipo:        form.tipo.trim() || null,
      descricao:   form.descricao.trim() || null,
      id_entidade: Number(form.id_entidade),
    };
    let error;
    if (modal === 'novo') {
      ({ error } = await supabase.from('programa').insert([payload]));
    } else {
      ({ error } = await supabase.from('programa').update(payload).eq('id_programa', modal.prog.id_programa));
    }
    if (error) {
      setFormError(error.code === '23505' ? 'Já existe um programa com este código nesta entidade.' : error.message);
    } else {
      showToast(modal === 'novo' ? 'Programa criado!' : 'Programa atualizado!');
      setModal(null);
      fetchData();
      refreshProgramas();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const supabase  = createSupabaseBrowser();
    const progId    = deleteTarget.prog.id_programa;

    const { data: mods } = await supabase.from('modulo').select('id_modulo').eq('id_programa', progId);
    const modIds = mods?.map(m => m.id_modulo) ?? [];
    if (modIds.length > 0) {
      await supabase.from('modulo_media').delete().in('id_modulo', modIds);
      await supabase.from('modulo').delete().eq('id_programa', progId);
    }

    const { error } = await supabase.from('programa').delete().eq('id_programa', progId);
    if (error) {
      showToast('Erro ao eliminar: ' + error.message, true);
    } else {
      showToast('Programa eliminado.');
      setDeleteTarget(null);
      fetchData();
      refreshProgramas();
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
          <h1 className="text-2xl font-bold text-white">Gestão de Programas</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading ? '…' : `${filtered.length} programa${filtered.length !== 1 ? 's' : ''}`}
          </p>
          <FilterContextLine />
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3d8aef] transition"
        >
          <span className="text-lg leading-none">+</span>
          Novo Programa
        </button>
      </div>

      {/* Pesquisa + filtro */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Pesquisar por nome ou código…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#13131a] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-[#4f9eff]/50 focus:outline-none focus:ring-1 focus:ring-[#4f9eff]/30 transition"
          />
        </div>
        <select
          value={filterEnt}
          onChange={e => setFilterEnt(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#13131a] px-3 py-3 text-sm text-white/65 focus:outline-none focus:border-[#4f9eff]/50 transition cursor-pointer"
        >
          <option value="">Todas as entidades</option>
          {entidades.map(e => (
            <option key={e.id_entidade} value={e.id_entidade}>{e.nome}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
        ) : pageData.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            {search || filterEnt ? 'Nenhum programa encontrado para os filtros aplicados.' : 'Nenhum programa criado ainda.'}
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
                <th className="text-left px-5 py-3 font-medium">Código</th>
                <th className="text-left px-5 py-3 font-medium">Entidade</th>
                <th className="text-left px-5 py-3 font-medium">Disciplinas</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((prog, i) => (
                <tr
                  key={prog.id_programa}
                  className={`transition hover:bg-white/2 ${i !== pageData.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-white/85">{prog.nome}</div>
                    {prog.tipo && <div className="text-xs text-white/30 mt-0.5">{prog.tipo}</div>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block rounded-full border border-[#4f9eff]/25 bg-[#4f9eff]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-widest text-[#4f9eff]">
                      {prog.codigo}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-white/45 text-xs">{prog.entidade?.nome ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 rounded-full bg-[#4f9eff]/10 border border-[#4f9eff]/20 text-[10px] font-semibold text-[#4f9eff] px-1.5">
                      {modCounts[prog.id_programa] ?? 0}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(prog)}
                        className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => openDelete(prog)}
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
          de <span className="font-semibold text-white/80">{filtered.length}</span> programas
        </p>
      )}
      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />

      {/* Modal — Novo / Editar */}
      {modal !== null && (
        <Modal
          title={modal === 'novo' ? 'Novo Programa' : `Editar: ${modal.prog.nome}`}
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            <Field label="Entidade *">
              <select
                className={inputCls + ' appearance-none'}
                value={form.id_entidade}
                onChange={e => { setForm(f => ({ ...f, id_entidade: e.target.value })); if (formError) setFormError(''); }}
              >
                <option value="">Selecionar entidade…</option>
                {entidades.map(e => (
                  <option key={e.id_entidade} value={e.id_entidade}>{e.nome}</option>
                ))}
              </select>
            </Field>
            <Field label="Nome *">
              <input
                className={inputCls}
                value={form.nome}
                onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); if (formError) setFormError(''); }}
                placeholder="ex: Engenharia da Computação Gráfica e Multimédia"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Código *">
                <input
                  className={inputCls}
                  value={form.codigo}
                  onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                  placeholder="ex: ECGM"
                />
              </Field>
              <Field label="Tipo">
                <input
                  className={inputCls}
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  placeholder="ex: licenciatura"
                />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea
                className={inputCls + ' resize-none'}
                rows={2}
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Breve descrição do programa…"
              />
            </Field>
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || !form.nome.trim() || !form.codigo.trim() || !form.id_entidade}
                className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'A guardar…' : (modal === 'novo' ? 'Criar Programa' : 'Guardar Alterações')}
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
        <Modal title="Eliminar Programa" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white/80">
              Tens a certeza que queres eliminar <span className="text-white">{deleteTarget.prog.nome}</span>?
            </p>
            {deleteTarget.modCount === null ? (
              <p className="text-xs text-white/35">A calcular impacto…</p>
            ) : (
              <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3 text-xs text-red-300/80 leading-relaxed">
                Este programa tem{' '}
                <span className="font-semibold text-red-300">{deleteTarget.modCount} disciplina{deleteTarget.modCount !== 1 ? 's' : ''}</span>
                {' '}associadas. Todas serão eliminadas permanentemente. Esta ação é irreversível.
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleDelete}
                disabled={deleting || deleteTarget.modCount === null}
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
