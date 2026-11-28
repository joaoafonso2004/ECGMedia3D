"use client";

import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useCallback, useEffect, useState } from "react";
import { FilterContextLine } from "../AdminFilterContext";

/* ─── Modal genérico ────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-tinta/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-linha bg-superficie shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-linha">
          <h2 className="text-base font-semibold text-tinta">{title}</h2>
          <button onClick={onClose} className="text-cinza/80 hover:text-tinta-2 transition text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
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

const inputCls = `w-full rounded-lg border border-linha bg-papel px-3 py-2 text-sm text-tinta
  placeholder:text-cinza focus:outline-none focus:border-acao/60 focus:ring-1
  focus:ring-acao/20 transition`;

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
          className="flex-1 rounded-lg bg-acao py-2.5 text-sm font-semibold text-white
                     hover:bg-acao-escuro transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "A guardar…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg border border-linha py-2.5 text-sm font-medium
                     text-cinza hover:bg-papel hover:text-tinta transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ─── Modal editar módulos do gestor ─────────────────────────────── */
function EditGestorModal({ gestor, entidadeNome, onClose, onRemover, onAdicionar, removendoId, adicionando }) {
  const [programas, setProgramas] = useState([]);
  const [programaId, setProgramaId] = useState("");
  const [todosModulos, setTodosModulos] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const fetchProgramas = async () => {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from("programa")
        .select("id_programa, nome")
        .eq("id_entidade", gestor.id_entidade)
        .order("nome", { ascending: true });
      setProgramas(data || []);
    };
    fetchProgramas();
  }, [gestor.id_entidade]);

  useEffect(() => {
    if (!programaId) { setTodosModulos([]); return; }
    const fetchModulos = async () => {
      const supabase = createSupabaseBrowser();
      const { data } = await supabase
        .from("modulo")
        .select("id_modulo, nome")
        .eq("id_programa", Number(programaId))
        .order("nome", { ascending: true });
      setTodosModulos(data || []);
    };
    fetchModulos();
    setSelecionados([]);
  }, [programaId]);

  const idsJaAssociados = new Set(gestor.moduloAssociacoes.map(a => a.id_modulo));
  const modulosDisponiveis = todosModulos.filter(m => !idsJaAssociados.has(m.id_modulo));

  async function handleAdicionar() {
    setErro("");
    if (!programaId || selecionados.length === 0) {
      setErro("Seleciona um programa e pelo menos um módulo.");
      return;
    }
    await onAdicionar(gestor, Number(programaId), selecionados);
    setSelecionados([]);
  }

  return (
    <Modal title={`Editar Módulos — ${gestor.nome}`} onClose={onClose}>
      <div className="space-y-6">
        <p className="text-xs text-cinza">
          Entidade: <span className="text-tinta-2">{entidadeNome || "—"}</span>
        </p>

        {/* Módulos atualmente atribuídos */}
        <div>
          <h3 className="text-sm font-semibold text-tinta mb-3">Módulos Atribuídos</h3>
          {gestor.moduloAssociacoes.length === 0 ? (
            <p className="text-xs text-cinza/80 py-2">Ainda não tem nenhum módulo atribuído.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {gestor.moduloAssociacoes.map(a => (
                <div
                  key={a.id_tipo_utilizador}
                  className="flex items-center justify-between rounded-lg border border-linha bg-papel px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-tinta truncate">{a.nome_modulo}</p>
                    <p className="text-xs text-cinza truncate">{a.nome_programa}</p>
                  </div>
                  <button
                    onClick={() => onRemover(a.id_tipo_utilizador)}
                    disabled={removendoId === a.id_tipo_utilizador}
                    className="shrink-0 text-xs font-medium text-ecgm-r hover:text-ecgm-r px-3 py-1.5
                               rounded-md border border-transparent hover:border-ecgm-r/30 hover:bg-ecgm-r/10 transition disabled:opacity-50"
                  >
                    {removendoId === a.id_tipo_utilizador ? "A remover…" : "Remover"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-linha" />

        {/* Adicionar novos módulos */}
        <div>
          <h3 className="text-sm font-semibold text-acao mb-3">Adicionar Módulos</h3>
          <div className="space-y-3">
            <Field label="Programa">
              <select
                className={inputCls}
                value={programaId}
                onChange={e => setProgramaId(e.target.value)}
              >
                <option value="">Seleciona um programa…</option>
                {programas.map(p => (
                  <option key={p.id_programa} value={p.id_programa}>{p.nome}</option>
                ))}
              </select>
            </Field>
            <Field label="Módulos disponíveis">
              {!programaId ? (
                <p className="text-xs text-cinza/80 py-1">Seleciona primeiro um programa.</p>
              ) : modulosDisponiveis.length === 0 ? (
                <p className="text-xs text-cinza/80 py-1">Todos os módulos deste programa já estão atribuídos.</p>
              ) : (
                <select
                  className={inputCls}
                  multiple
                  value={selecionados}
                  onChange={e => setSelecionados(Array.from(e.target.selectedOptions, o => o.value))}
                  size={Math.min(5, modulosDisponiveis.length || 1)}
                >
                  {modulosDisponiveis.map(m => (
                    <option key={m.id_modulo} value={m.id_modulo}>{m.nome}</option>
                  ))}
                </select>
              )}
            </Field>

            {erro && (
              <div className="rounded-lg border border-ecgm-r/30 bg-ecgm-r/10 px-4 py-2.5">
                <p className="text-xs text-ecgm-r">{erro}</p>
              </div>
            )}

            <button
              onClick={handleAdicionar}
              disabled={adicionando || !programaId || selecionados.length === 0}
              className="w-full rounded-lg bg-acao py-2.5 text-sm font-semibold text-white
                         hover:bg-acao-escuro transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adicionando ? "A adicionar…" : "Adicionar Módulos Selecionados"}
            </button>
          </div>
        </div>

        <div className="pt-1">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-linha py-2.5 text-sm font-medium
                       text-cinza hover:bg-papel hover:text-tinta transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}

const ITEMS_PER_PAGE_GEST = 5;

export default function GestoresPage() {
  const [gestores, setGestores] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // <-- Estado da pesquisa
  const [entidades, setEntidades] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'novo' | { tipo: 'editar', gestor }
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [removendoId, setRemovendoId] = useState(null);
  const [adicionando, setAdicionando] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

    if (!users || users.length === 0) { setGestores([]); setLoading(false); return []; }

    // Buscar permissões associadas a cada gestor
    const { data: tipos } = await supabase
      .from("tipo_utilizador")
      .select("id_tipo_utilizador, id_utilizador, id_programa, id_modulo, role")
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

        const moduloAssociacoes = associaçõesDoGestor
          .filter(a => a.id_modulo)
          .map(a => ({
            id_tipo_utilizador: a.id_tipo_utilizador,
            id_modulo: a.id_modulo,
            id_programa: a.id_programa,
            nome_modulo: (allDisciplinas || []).find(d => d.id_modulo === a.id_modulo)?.nome || "—",
            nome_programa: (programas || []).find(p => p.id_programa === a.id_programa)?.nome || "—",
          }));

        return {
          ...u,
          entidade_nome: u.entidade?.nome || "",
          programa_nome: programaNome || "—",
          disciplinas: disciplinasNomes,
          moduloAssociacoes,
        };
      });

    setGestores(gestoresComDisc);
    setLoading(false);
    return gestoresComDisc;
  }, []);

  useEffect(() => { fetchGestores(); }, [fetchGestores]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

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

  // Remover um módulo atribuído a um gestor
  async function handleRemoverModulo(idTipoUtilizador) {
    setRemovendoId(idTipoUtilizador);
    const supabase = createSupabaseBrowser();

    const { error } = await supabase
      .from("tipo_utilizador")
      .delete()
      .eq("id_tipo_utilizador", idTipoUtilizador);

    if (error) {
      showToast("Erro ao remover módulo: " + error.message);
    } else {
      showToast("Módulo removido do gestor.");
      const gestoresAtualizados = await fetchGestores();
      setModal(prev => {
        if (!prev || prev.tipo !== "editar") return prev;
        const gestorAtualizado = gestoresAtualizados.find(g => g.id_utilizadores === prev.gestor.id_utilizadores);
        return gestorAtualizado ? { ...prev, gestor: gestorAtualizado } : prev;
      });
    }
    setRemovendoId(null);
  }

  // Adicionar novos módulos a um gestor já existente
  async function handleAdicionarModulos(gestor, idPrograma, moduloIds) {
    setAdicionando(true);
    const supabase = createSupabaseBrowser();

    const inserts = moduloIds.map(id_modulo => ({
      id_utilizador: gestor.id_utilizadores,
      id_entidade: gestor.id_entidade,
      id_programa: idPrograma,
      id_modulo: Number(id_modulo),
      role: "gestor_disciplina",
    }));

    const { error } = await supabase.from("tipo_utilizador").insert(inserts);

    if (error) {
      showToast("Erro ao adicionar módulos: " + error.message);
    } else {
      showToast("Módulo(s) adicionado(s) com sucesso!");
      const gestoresAtualizados = await fetchGestores();
      setModal(prev => {
        if (!prev || prev.tipo !== "editar") return prev;
        const gestorAtualizado = gestoresAtualizados.find(g => g.id_utilizadores === gestor.id_utilizadores);
        return gestorAtualizado ? { ...prev, gestor: gestorAtualizado } : prev;
      });
    }
    setAdicionando(false);
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

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const totalPagesGest  = Math.ceil(filteredGestores.length / ITEMS_PER_PAGE_GEST);
  const startIndexGest  = (currentPage - 1) * ITEMS_PER_PAGE_GEST;
  const paginatedGest   = filteredGestores.slice(startIndexGest, startIndexGest + ITEMS_PER_PAGE_GEST);

  const btnPageCls = (disabled) =>
    `rounded-md border border-linha bg-papel px-3 py-1.5 text-xs font-medium text-tinta-2
     transition hover:bg-mosaico hover:text-tinta disabled:opacity-30 disabled:cursor-not-allowed`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-linha bg-superficie
                        px-4 py-2.5 text-sm text-tinta shadow-xl">
          {toast}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tinta">Gestores</h1>
          <p className="text-sm text-cinza mt-1">
            {loading ? "…" : `${gestores.length} gestores`}
          </p>
          <FilterContextLine />
        </div>
        <button
          onClick={() => setModal("novo")}
          className="flex items-center gap-2 rounded-lg bg-acao px-4 py-2.5 text-sm
                     font-semibold text-white hover:bg-acao-escuro transition"
        >
          <span className="text-lg leading-none">+</span>
          Novo Gestor
        </button>
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
            placeholder="Pesquisar por nome, email, entidade ou programa..."
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
        ) : gestores.length === 0 ? (
          <div className="py-12 text-center text-sm text-cinza/80">
            Nenhum gestor encontrado.
          </div>
        ) : filteredGestores.length === 0 ? (
          <div className="py-12 text-center text-sm text-cinza/80">
            Nenhum gestor corresponde à pesquisa "{searchQuery}".
          </div>
        ) : (
          <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cinza/80 border-b border-linha bg-papel">
                <th className="text-left px-5 py-3 font-medium">Nome</th>
                <th className="text-left px-5 py-3 font-medium">Email</th>
                <th className="text-left px-5 py-3 font-medium">Entidade</th>
                <th className="text-left px-5 py-3 font-medium">Programa</th>
                <th className="text-left px-5 py-3 font-medium">Disciplinas</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGest.map((g, i) => (
                <tr
                  key={g.id_utilizadores}
                  className={`transition hover:bg-papel ${i !== paginatedGest.length - 1 ? "border-b border-linha" : ""}`}
                >
                  <td className="px-5 py-3.5 font-medium text-tinta">{g.nome}</td>
                  <td className="px-5 py-3.5 text-tinta-2">{g.email}</td>
                  <td className="px-5 py-3.5 text-tinta-2">{g.entidade_nome || "—"}</td>
                  <td className="px-5 py-3.5 text-tinta-2">{g.programa_nome || "—"}</td>
                  <td className="px-5 py-3.5 text-tinta-2">
                    {g.disciplinas.length > 0 ? g.disciplinas.join(", ") : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setModal({ tipo: "editar", gestor: g })}
                      className="rounded-md border border-acao/30 px-3 py-1.5 text-xs font-medium
                                 text-acao hover:bg-acao/10 hover:text-acao transition"
                    >
                      Editar Módulos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPagesGest > 1 && (
            <div className="flex items-center justify-between border-t border-linha bg-papel px-6 py-4">
              <p className="text-xs text-cinza">
                A mostrar <span className="font-semibold text-tinta">{startIndexGest + 1}</span> a{' '}
                <span className="font-semibold text-tinta">{Math.min(startIndexGest + ITEMS_PER_PAGE_GEST, filteredGestores.length)}</span>{' '}
                de <span className="font-semibold text-tinta">{filteredGestores.length}</span> gestores
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className={btnPageCls(currentPage === 1)}>Anterior</button>
                <span className="text-xs text-cinza font-mono px-2">{currentPage} / {totalPagesGest}</span>
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPagesGest))} disabled={currentPage === totalPagesGest} className={btnPageCls(currentPage === totalPagesGest)}>Próxima</button>
              </div>
            </div>
          )}
          </>
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

      {/* Modal — Editar Módulos do Gestor */}
      {modal?.tipo === "editar" && (
        <EditGestorModal
          gestor={modal.gestor}
          entidadeNome={modal.gestor.entidade_nome}
          onClose={() => setModal(null)}
          onRemover={handleRemoverModulo}
          onAdicionar={handleAdicionarModulos}
          removendoId={removendoId}
          adicionando={adicionando}
        />
      )}
    </div>
  );
}