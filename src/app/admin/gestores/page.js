"use client";

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useCallback, useEffect, useState } from "react";

/* ─── Modal genérico ────────────────────────────────────────────── */
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

function GestorForm({ entidades, disciplinas, onSave, onCancel, saving }) {
  const [programas, setProgramas] = useState([]);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    password: "",
    entidade: "",
    programa: "",
    disciplinas: [],
  });

  useEffect(() => {
    const fetchProgramas = async () => {
      if (!form.entidade) {
        setProgramas([]);
        return;
      }

      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from("programa")
        .select("id_programa, nome, id_entidade")
        .eq("id_entidade", Number(form.entidade))
        .order("nome", { ascending: true });

      setProgramas(data || []);
    };

    fetchProgramas();
  }, [form.entidade]);

  const disciplinasFiltradas = form.programa
    ? disciplinas.filter(d => Number(d.id_programa) === Number(form.programa))
    : [];

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  return (
    <form className="space-y-5" onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <Field label="Nome *">
        <input
          className={inputCls}
          value={form.nome}
          onChange={e => set("nome", e.target.value)}
          required
          placeholder="Nome do gestor"
        />
      </Field>
      <Field label="Email *">
        <input
          className={inputCls}
          type="email"
          value={form.email}
          onChange={e => set("email", e.target.value)}
          required
          placeholder="email@exemplo.com"
        />
      </Field>
      <Field label="Password *">
        <input
          className={inputCls}
          type="password"
          value={form.password}
          onChange={e => set("password", e.target.value)}
          required
          placeholder="Password"
        />
      </Field>
      <Field label="Entidade *">
        <select
          className={inputCls}
          value={form.entidade}
          onChange={e => setForm(f => ({ ...f, entidade: e.target.value, programa: "", disciplinas: [] }))}
          required
        >
          <option value="">Seleciona uma entidade…</option>
          {entidades.map(e => (
            <option key={e.id_entidade} value={e.id_entidade}>{e.nome}</option>
          ))}
        </select>
      </Field>
      <Field label="Programa *">
        <select
          className={inputCls}
          value={form.programa}
          onChange={e => setForm(f => ({ ...f, programa: e.target.value, disciplinas: [] }))}
          required
          disabled={!form.entidade}
        >
          <option value="">Seleciona um programa…</option>
          {programas.map(p => (
            <option key={p.id_programa} value={p.id_programa}>{p.nome}</option>
          ))}
        </select>
      </Field>
      <Field label="Modulos (pode escolher vários) *">
        <select
          className={inputCls}
          multiple
          value={form.disciplinas}
          onChange={e => set("disciplinas", Array.from(e.target.selectedOptions, o => o.value))}
          size={Math.min(5, disciplinasFiltradas.length || 1)}
          disabled={!form.programa}
        >
          {disciplinasFiltradas.map(d => (
            <option key={d.id_modulo} value={d.id_modulo}>{d.nome}</option>
          ))}
        </select>
      </Field>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "A guardar…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                     text-white/50 hover:bg-white/5 hover:text-white/80 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export default function GestoresPage() {
  const [gestores, setGestores] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // <-- Estado da pesquisa
  const [entidades, setEntidades] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'novo'
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Buscar entidades e disciplinas
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createSupabaseBrowser();
      const { data: ents } = await supabase.from("entidade").select("id_entidade, nome");
      setEntidades(ents || []);
      const { data: discs } = await supabase.from("modulo").select("id_modulo, nome, id_programa");
      setDisciplinas(discs || []);
    };
    fetchData();
  }, []);

  // Buscar gestores e suas disciplinas
  const fetchGestores = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    
    // Buscar utilizadores 
    const { data: users } = await supabase
      .from("utilizadores")
      .select("id_utilizadores, nome, email, id_entidade, entidade:entidade(nome)")
      .order("nome", { ascending: true });

    if (!users || users.length === 0) { setGestores([]); setLoading(false); return; }

    // Buscar permissões associadas a cada gestor
    const { data: tipos } = await supabase
      .from("tipo_utilizador")
      .select("id_utilizador, id_programa, id_modulo, role")
      .in("id_utilizador", users.map(u => u.id_utilizadores));

    // Buscar nomes dos programas associados
    const programaIds = Array.from(new Set((tipos || [])
      .filter(t => t.role === "gestor_disciplina" && t.id_programa)
      .map(t => t.id_programa)));

    const { data: programas } = programaIds.length > 0
      ? await supabase
          .from("programa")
          .select("id_programa, nome")
          .in("id_programa", programaIds)
      : { data: [] };

    // Buscar todas as disciplinas com o respetivo programa
    const { data: allDisciplinas } = await supabase
      .from("modulo")
      .select("id_modulo, nome, id_programa");

    // Mapear gestor -> disciplinas
    const gestoresComDisc = users
      .filter(u => tipos?.some(t => t.id_utilizador === u.id_utilizadores && t.role === "gestor"))
      .map(u => {
        const associaçõesDoGestor = (tipos || [])
          .filter(t => t.id_utilizador === u.id_utilizadores && t.role === "gestor_disciplina")
          .filter(Boolean);

        const programasDoGestor = Array.from(new Set(associaçõesDoGestor
          .map(t => t.id_programa)
          .filter(Boolean)));

        const modulosDoGestorIds = Array.from(new Set(associaçõesDoGestor
          .map(t => t.id_modulo)
          .filter(Boolean)));

        const programaNome = (programas || [])
          .filter(p => programasDoGestor.includes(p.id_programa))
          .map(p => p.nome)
          .join(", ");

        const disciplinasNomes = (allDisciplinas || [])
          .filter(d => modulosDoGestorIds.length > 0
            ? modulosDoGestorIds.includes(d.id_modulo)
            : programasDoGestor.includes(d.id_programa))
          .map(d => d.nome);
          
        return {
          ...u,
          entidade_nome: u.entidade?.nome || "",
          programa_nome: programaNome || "—",
          disciplinas: disciplinasNomes,
        };
      });

    setGestores(gestoresComDisc);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGestores(); }, [fetchGestores]);

  // Criar gestor
  async function handleCreate(form) {
    setSaving(true);
    setToast("");

    try {
      if (form.disciplinas.length > 0 && !form.programa) {
        throw new Error("Seleciona um programa antes de associar disciplinas.");
      }

      const response = await fetch('/api/create-gestor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim(),
          password: form.password,
          id_entidade: form.entidade ? Number(form.entidade) : null,
          id_programa: form.programa ? Number(form.programa) : null,
          disciplinas: form.disciplinas
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("A API falhou e devolveu HTML. Verifica se o ficheiro route.js está na pasta /api/create-gestor/ e não tem erros.");
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro desconhecido ao criar o gestor.");
      }

      showToast("Gestor criado com sucesso!");
      setModal(null);
      fetchGestores();
    } catch (err) {
      console.error(err);
      setToast(err.message);
    } finally {
      setSaving(false);
    }
  }

  /* ─── Lógica Robusta de Filtragem ───────────────────────────── */
  const filteredGestores = gestores.filter((g) => {
    const q = searchQuery.toLowerCase();
    
    // Fallbacks para evitar crashes se houver campos a null
    const nome = g.nome?.toLowerCase() || "";
    const email = g.email?.toLowerCase() || "";
    const entidade = g.entidade_nome?.toLowerCase() || "";
    const programa = g.programa_nome?.toLowerCase() || "";

    return (
      nome.includes(q) ||
      email.includes(q) ||
      entidade.includes(q) ||
      programa.includes(q)
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
          <h1 className="text-2xl font-bold text-white">Gestores</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading ? "…" : `${gestores.length} gestores`}
          </p>
        </div>
        <button
          onClick={() => setModal("novo")}
          className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm
                     font-semibold text-white hover:bg-[#3d8aef] transition"
        >
          <span className="text-lg leading-none">+</span>
          Novo Gestor
        </button>
      </div>

      {/* Barra de Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
            {/* Ícone de Lupa */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Pesquisar por nome, email, entidade ou programa..."
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
        ) : gestores.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            Nenhum gestor encontrado.
          </div>
        ) : filteredGestores.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            Nenhum gestor corresponde à pesquisa "{searchQuery}".
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Entidade</th>
                <th className="text-left px-5 py-3 font-medium">Programa</th>
                <th className="text-left px-5 py-3 font-medium">Disciplinas</th>
              </tr>
            </thead>
            <tbody>
              {filteredGestores.map((g, i) => (
                <tr
                  key={g.id_utilizadores}
                  className={`transition hover:bg-white/2 ${i !== filteredGestores.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <td className="px-5 py-3.5 font-medium text-white/85">{g.nome}</td>
                  <td className="px-5 py-3.5 text-white/60">{g.email}</td>
                  <td className="px-5 py-3.5 text-white/60">{g.entidade_nome || "—"}</td>
                  <td className="px-5 py-3.5 text-white/60">{g.programa_nome || "—"}</td>
                  <td className="px-5 py-3.5 text-white/60">
                    {g.disciplinas.length > 0 ? g.disciplinas.join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Novo Gestor */}
      {modal === "novo" && (
        <Modal title="Novo Gestor" onClose={() => setModal(null)}>
          <GestorForm
            entidades={entidades}
            disciplinas={disciplinas}
            onSave={handleCreate}
            onCancel={() => setModal(null)}
            saving={saving}
          />
        </Modal>
      )}
    </div>
  );
}