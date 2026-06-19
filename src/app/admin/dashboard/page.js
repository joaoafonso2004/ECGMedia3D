'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter, FilterContextLine } from '../AdminFilterContext';

/* ─── Utilidade ─────────────────────────────────────────────────── */
function toSlug(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* ─── Estilos partilhados ───────────────────────────────────────── */
const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition`;

/* ─── StatCard ───────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color = '#4f9eff' }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#13131a] p-5 flex items-center gap-4">
      <div className="flex items-center justify-center w-11 h-11 rounded-lg text-xl"
           style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value === null ? '…' : value}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* ─── Página ─────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const {
    entidades, entidadeId, selectEntidade,
    programas, programaId, setProgramaId,
    refreshEntidades, refreshProgramas,
  } = useAdminFilter();

  /* ── Stats & recentes ── */
  const [stats,    setStats]    = useState({ disciplinas: null, modelos: null, relacoes: null });
  const [recentes, setRecentes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState('');

  /* ── Contadores de gestão ── */
  const [totalEntidades, setTotalEntidades] = useState(null);
  const [totalProgramas, setTotalProgramas] = useState(null);

  /* ── Formulário entidade ── */
  const [entForm,    setEntForm]    = useState({ nome: '', tipo: '', slug: '' });
  const [slugManual, setSlugManual] = useState(false);
  const [creatingEnt, setCreatingEnt] = useState(false);
  const [entError,   setEntError]   = useState('');

  /* ── Formulário programa ── */
  const [progForm,     setProgForm]     = useState({ id_entidade: '', nome: '', codigo: '', tipo: '', descricao: '' });
  const [creatingProg, setCreatingProg] = useState(false);
  const [progError,    setProgError]    = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  /* Sincronizar entidade no formulário de programa com filtro global */
  useEffect(() => {
    setProgForm(f => ({ ...f, id_entidade: entidadeId || '' }));
  }, [entidadeId]);

  /* ─── Auto-slug ─────────────────────────────────────────────── */
  function handleEntNomeChange(nome) {
    setEntForm(f => ({ ...f, nome, ...(!slugManual ? { slug: toSlug(nome) } : {}) }));
    if (entError) setEntError('');
  }
  function handleSlugChange(slug) {
    setSlugManual(slug !== toSlug(entForm.nome));
    setEntForm(f => ({ ...f, slug }));
  }

  /* ─── Fetch contadores de gestão ───────────────────────────── */
  const fetchCounts = useCallback(async () => {
    const supabase = createSupabaseBrowser();
    const [{ count: ce }, { count: cp }] = await Promise.all([
      supabase.from('entidade').select('*', { count: 'exact', head: true }),
      supabase.from('programa').select('*', { count: 'exact', head: true }),
    ]);
    setTotalEntidades(ce ?? 0);
    setTotalProgramas(cp ?? 0);
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  /* ─── Fetch stats filtradas ─────────────────────────────────── */
  const fetchStats = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    const pid  = programaId  ? Number(programaId)  : null;
    const pids = programas.map(p => Number(p.id_programa));

    let qDisc = supabase.from('modulo').select('*', { count: 'exact', head: true });
    let qMod  = supabase.from('media_items').select('*', { count: 'exact', head: true }).eq('tipo', 'modelo3d');
    let qRel  = supabase.from('modulo_media').select('*', { count: 'exact', head: true });
    let qUlt  = supabase.from('modulo')
                  .select('id_modulo, nome, codigo, ano, semestre')
                  .order('id_modulo', { ascending: false })
                  .limit(5);

    if (pid) {
      qDisc = qDisc.eq('id_programa', pid);
      qMod  = supabase.from('modulo_media')
                .select('modulo!inner(id_programa)', { count: 'exact', head: true })
                .eq('modulo.id_programa', pid);
      qRel  = supabase.from('modulo_media')
                .select('modulo!inner(id_programa)', { count: 'exact', head: true })
                .eq('modulo.id_programa', pid);
      qUlt  = qUlt.eq('id_programa', pid);
    } else if (entidadeId && pids.length > 0) {
      qDisc = qDisc.in('id_programa', pids);
      qMod  = supabase.from('modulo_media')
                .select('modulo!inner(id_programa)', { count: 'exact', head: true })
                .in('modulo.id_programa', pids);
      qRel  = supabase.from('modulo_media')
                .select('modulo!inner(id_programa)', { count: 'exact', head: true })
                .in('modulo.id_programa', pids);
      qUlt  = qUlt.in('id_programa', pids);
    }

    const [
      { count: cDisc },
      { count: cMod },
      { count: cRel },
      { data: ult },
    ] = await Promise.all([qDisc, qMod, qRel, qUlt]);

    setStats({ disciplinas: cDisc ?? 0, modelos: cMod ?? 0, relacoes: cRel ?? 0 });
    setRecentes(ult ?? []);
    setLoading(false);
  }, [entidadeId, programaId, programas]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  /* ─── Criar entidade ─────────────────────────────────────────── */
  async function handleCriarEntidade(e) {
    e.preventDefault();
    if (!entForm.nome.trim()) { setEntError('O nome é obrigatório.'); return; }
    if (!entForm.slug.trim()) { setEntError('O slug é obrigatório.'); return; }
    setCreatingEnt(true);
    setEntError('');
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.from('entidade').insert([{
      nome: entForm.nome.trim(),
      tipo: entForm.tipo.trim() || null,
      slug: entForm.slug.trim().toLowerCase(),
    }]);
    if (error) {
      setEntError(error.code === '23505'
        ? 'Já existe uma entidade com este slug.'
        : error.message);
    } else {
      showToast('Entidade criada com sucesso!');
      setEntForm({ nome: '', tipo: '', slug: '' });
      setSlugManual(false);
      fetchCounts();
      refreshEntidades();
    }
    setCreatingEnt(false);
  }

  /* ─── Criar programa ─────────────────────────────────────────── */
  async function handleCriarPrograma(e) {
    e.preventDefault();
    if (!progForm.id_entidade)    { setProgError('Seleciona uma entidade.'); return; }
    if (!progForm.nome.trim())    { setProgError('O nome é obrigatório.'); return; }
    if (!progForm.codigo.trim())  { setProgError('O código é obrigatório.'); return; }
    setCreatingProg(true);
    setProgError('');
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.from('programa').insert([{
      nome:        progForm.nome.trim(),
      codigo:      progForm.codigo.trim().toUpperCase(),
      tipo:        progForm.tipo.trim() || null,
      descricao:   progForm.descricao.trim() || null,
      id_entidade: Number(progForm.id_entidade),
    }]);
    if (error) {
      setProgError(error.code === '23505'
        ? 'Já existe um programa com este código nesta entidade.'
        : error.message);
    } else {
      showToast('Programa criado com sucesso!');
      setProgForm(f => ({ ...f, nome: '', codigo: '', tipo: '', descricao: '' }));
      fetchCounts();
      refreshProgramas();
    }
    setCreatingProg(false);
  }


  /* ─── JSX ────────────────────────────────────────────────────── */
  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a]
                        px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/35 mt-1">Visão geral da plataforma media3d</p>
        <FilterContextLine />
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Disciplinas" value={loading ? null : stats.disciplinas} icon="🎓" color="#4f9eff" />
        <StatCard label="Modelos 3D"  value={loading ? null : stats.modelos}     icon="🧊" color="#a78bfa" />
        <StatCard label="Associações" value={loading ? null : stats.relacoes}    icon="🔗" color="#34d399" />
      </div>

      {/* Gestão de Entidades & Programas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        {/* ── Entidades ── */}
        <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Entidades</h2>
            <p className="text-xs text-white/30 mt-0.5">Institutos, universidades e escolas</p>
          </div>
          <div className="p-5">

            {/* Formulário de criação */}
            <form onSubmit={handleCriarEntidade} className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-white/40 mb-1">Nome *</label>
                <input
                  className={inputCls}
                  value={entForm.nome}
                  onChange={e => handleEntNomeChange(e.target.value)}
                  placeholder="ex: Instituto Politécnico de Viana do Castelo"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Tipo</label>
                  <input
                    className={inputCls}
                    value={entForm.tipo}
                    onChange={e => setEntForm(f => ({ ...f, tipo: e.target.value }))}
                    placeholder="ex: instituto"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Slug (URL) *</label>
                  <input
                    className={inputCls}
                    value={entForm.slug}
                    onChange={e => handleSlugChange(e.target.value)}
                    placeholder="ex: ipvc"
                  />
                </div>
              </div>
              {entError && <p className="text-xs text-red-400">{entError}</p>}
              <button
                type="submit"
                disabled={creatingEnt || !entForm.nome.trim() || !entForm.slug.trim()}
                className="w-full rounded-lg bg-[#4f9eff] py-2 text-sm font-semibold text-white
                           hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingEnt ? 'A criar…' : '+ Criar Entidade'}
              </button>
            </form>

            {/* Contador + link */}
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/2 px-4 py-3">
              <span className="text-sm text-white/50">
                {totalEntidades === null ? '…' : `${totalEntidades} entidade${totalEntidades !== 1 ? 's' : ''} registada${totalEntidades !== 1 ? 's' : ''}`}
              </span>
              <Link
                href="/admin/entidades"
                className="text-xs font-medium text-[#4f9eff]/70 hover:text-[#4f9eff] transition"
              >
                Gerir entidades →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Programas ── */}
        <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-white">Programas</h2>
            <p className="text-xs text-white/30 mt-0.5">Licenciaturas, mestrados e outros</p>
          </div>
          <div className="p-5">

            {/* Formulário de criação */}
            <form onSubmit={handleCriarPrograma} className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-white/40 mb-1">Entidade *</label>
                <select
                  className={inputCls}
                  value={progForm.id_entidade}
                  onChange={e => { setProgForm(f => ({ ...f, id_entidade: e.target.value })); setProgError(''); }}
                >
                  <option value="">Selecionar entidade…</option>
                  {entidades.map(e => (
                    <option key={e.id_entidade} value={e.id_entidade}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Nome *</label>
                <input
                  className={inputCls}
                  value={progForm.nome}
                  onChange={e => { setProgForm(f => ({ ...f, nome: e.target.value })); setProgError(''); }}
                  placeholder="ex: Engenharia da Computação Gráfica e Multimédia"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 mb-1">Código *</label>
                  <input
                    className={inputCls}
                    value={progForm.codigo}
                    onChange={e => setProgForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                    placeholder="ex: ECGM"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1">Tipo</label>
                  <input
                    className={inputCls}
                    value={progForm.tipo}
                    onChange={e => setProgForm(f => ({ ...f, tipo: e.target.value }))}
                    placeholder="ex: licenciatura"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Descrição</label>
                <textarea
                  className={inputCls + ' resize-none'}
                  rows={2}
                  value={progForm.descricao}
                  onChange={e => setProgForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Breve descrição do programa…"
                />
              </div>
              {progError && <p className="text-xs text-red-400">{progError}</p>}
              <button
                type="submit"
                disabled={creatingProg || !progForm.nome.trim() || !progForm.codigo.trim() || !progForm.id_entidade}
                className="w-full rounded-lg bg-[#4f9eff] py-2 text-sm font-semibold text-white
                           hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingProg ? 'A criar…' : '+ Criar Programa'}
              </button>
            </form>

            {/* Contador + link */}
            <div className="flex items-center justify-between rounded-lg border border-white/8 bg-white/2 px-4 py-3">
              <span className="text-sm text-white/50">
                {totalProgramas === null ? '…' : `${totalProgramas} programa${totalProgramas !== 1 ? 's' : ''} registado${totalProgramas !== 1 ? 's' : ''}`}
              </span>
              <Link
                href="/admin/programas"
                className="text-xs font-medium text-[#4f9eff]/70 hover:text-[#4f9eff] transition"
              >
                Gerir programas →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Últimas disciplinas adicionadas */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Últimas disciplinas adicionadas</h2>
          <Link href="/admin/disciplinas"
             className="text-xs text-[#4f9eff]/70 hover:text-[#4f9eff] transition">
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-white/25">A carregar…</div>
        ) : recentes.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-white/25">
            Nenhuma disciplina encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5">
                <th className="text-left px-5 py-2.5 font-medium">Nome</th>
                <th className="text-left px-5 py-2.5 font-medium">Código</th>
                <th className="text-left px-5 py-2.5 font-medium">Ano</th>
                <th className="text-left px-5 py-2.5 font-medium">Semestre</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map((d, i) => (
                <tr
                  key={d.id_modulo}
                  className={`transition hover:bg-white/3 ${i !== recentes.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <td className="px-5 py-3 text-white/80 font-medium">{d.nome}</td>
                  <td className="px-5 py-3 font-mono text-xs text-white/35">{d.codigo ?? '—'}</td>
                  <td className="px-5 py-3 text-white/45">{d.ano     != null ? `${d.ano}º Ano`  : '—'}</td>
                  <td className="px-5 py-3 text-white/45">{d.semestre != null ? `${d.semestre}º Sem` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
