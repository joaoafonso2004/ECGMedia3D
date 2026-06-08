'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

/* ─── Modal genérico ────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Conteúdo */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
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

      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.nome.trim()}
          className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                     text-white/50 hover:bg-white/5 hover:text-white/80 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─── Página principal ──────────────────────────────────────────── */
export default function DisciplinasPage() {
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
      .select('id_modulo, nome, codigo, descricao, ano, semestre')
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

  /* ─── Lógica de Filtragem ──────────────────────────────────── */
  const filteredDisciplinas = disciplinas.filter((d) => {
    const query = searchQuery.toLowerCase();
    return (
      (d.nome && d.nome.toLowerCase().includes(query)) ||
      (d.codigo && d.codigo.toLowerCase().includes(query)) ||
      (d.descricao && d.descricao.toLowerCase().includes(query))
    );
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
            {loading ? '…' : `${disciplinas.length} disciplinas`}
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
        ) : disciplinas.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            Nenhuma disciplina encontrada. Cria a primeira!
          </div>
        ) : filteredDisciplinas.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            Nenhuma disciplina corresponde à pesquisa "{searchQuery}".
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
              {filteredDisciplinas.map((d, i) => (
                <tr
                  key={d.id_modulo}
                  className={`transition hover:bg-white/2 ${i !== filteredDisciplinas.length - 1 ? 'border-b border-white/5' : ''}`}
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
        <Modal title="Editar Disciplina" onClose={() => setModal(null)}>
          <DisciplinaForm
            initial={modal.disciplina}
            onSave={handleEdit}
            onCancel={() => setModal(null)}
            saving={saving}
          />
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