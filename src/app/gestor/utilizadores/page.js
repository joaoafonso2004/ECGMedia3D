'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

/* ─── Modal Genérico (Estilo Gestores) ──────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#13131a] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-xl leading-none">
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#a78bfa]/50 focus:ring-1
  focus:ring-[#a78bfa]/30 transition`;

export default function GestorUtilizadoresPage() {
  const [alunos, setAlunos] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Estados do Modal de Associação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState(null);
  const [selectedModulo, setSelectedModulo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados do Modal de Eliminação
  const [deleteModalData, setDeleteModalData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createSupabaseBrowser();

  async function fetchData() {
    setLoading(true);
    
    const { data: todosUtilizadores } = await supabase.from('utilizadores').select('*');
    const { data: papeis } = await supabase
      .from('tipo_utilizador')
      .select('id_tipo_utilizador, id_utilizador, role, id_modulo, modulo(nome, codigo)')
      .eq('role', 'utilizador');

    if (todosUtilizadores && papeis) {
      const alunosFormatados = todosUtilizadores
        .filter(u => papeis.some(p => p.id_utilizador === u.id_utilizadores))
        .map(u => ({
          ...u,
          disciplinas: papeis.filter(p => p.id_utilizador === u.id_utilizadores && p.id_modulo !== null)
        }));
      setAlunos(alunosFormatados);
    }

    const { data: todosModulos } = await supabase.from('modulo').select('id_modulo, nome, codigo');
    if (todosModulos) setModulos(todosModulos);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Ações: Associar ──────────────────────────────────────────────
  
  function openModal(aluno) {
    setSelectedAluno(aluno);
    setSelectedModulo('');
    setIsModalOpen(true);
  }

  async function handleAssociar(e) {
    e.preventDefault();
    if (!selectedAluno || !selectedModulo) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('tipo_utilizador').insert([{
      id_utilizador: selectedAluno.id_utilizadores,
      role: 'utilizador',
      id_modulo: selectedModulo
    }]);

    if (!error) {
      await fetchData(); 
      setIsModalOpen(false);
    } else {
      alert('Erro ao associar disciplina: ' + error.message);
    }
    
    setIsSubmitting(false);
  }

  // ─── Ações: Remover (Agora com Modal) ─────────────────────────────

  function confirmRemoverAssociacao(id_tipo_utilizador, alunoNome, disciplinaNome) {
    setDeleteModalData({ id_tipo_utilizador, alunoNome, disciplinaNome });
  }

  async function executeRemoverAssociacao() {
    if (!deleteModalData) return;
    
    setIsDeleting(true);

    const { error } = await supabase
      .from('tipo_utilizador')
      .delete()
      .eq('id_tipo_utilizador', deleteModalData.id_tipo_utilizador);

    if (!error) {
      await fetchData();
      setDeleteModalData(null);
    } else {
      alert('Erro ao remover: ' + error.message);
    }

    setIsDeleting(false);
  }

  // ─── Filtragem ────────────────────────────────────────────────────
  const alunosFiltrados = alunos.filter(a => {
    const q = search.toLowerCase();
    const nome = a.nome?.toLowerCase() || '';
    const email = a.email?.toLowerCase() || '';
    return nome.includes(q) || email.includes(q);
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Alunos</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading ? "…" : `${alunos.length} alunos registados`}
          </p>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white/30">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Pesquisar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#13131a] py-3 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-[#a78bfa]/50 focus:outline-none focus:ring-1 focus:ring-[#a78bfa]/30 transition shadow-sm"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar alunos...</div>
        ) : alunos.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">Nenhum aluno registado.</div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            Nenhum aluno corresponde à pesquisa "{search}".
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                <th className="text-left px-5 py-3 font-medium">Aluno</th>
                <th className="text-left px-5 py-3 font-medium">Disciplinas Associadas</th>
                <th className="text-right px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((aluno, i) => (
                <tr 
                  key={aluno.id_utilizadores} 
                  className={`transition hover:bg-white/2 ${i !== alunosFiltrados.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white/85">{aluno.nome}</p>
                    <p className="text-xs text-white/40 mt-0.5">{aluno.email}</p>
                  </td>

                  <td className="px-5 py-3.5">
                    {aluno.disciplinas.length === 0 ? (
                      <span className="text-xs text-white/20 italic">Sem associações</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {aluno.disciplinas.map(disc => (
                          <div 
                            key={disc.id_tipo_utilizador} 
                            className="flex items-center gap-1.5 rounded-md bg-[#a78bfa]/10 pl-2.5 pr-1.5 py-1 border border-[#a78bfa]/20"
                          >
                            <span className="text-[11px] font-medium text-[#a78bfa]">
                              {disc.modulo?.codigo || 'MOD'} - {disc.modulo?.nome}
                            </span>
                            <button 
                              onClick={() => confirmRemoverAssociacao(disc.id_tipo_utilizador, aluno.nome, disc.modulo?.nome)}
                              className="text-[#a78bfa]/60 hover:text-red-400 hover:bg-red-500/20 rounded-md p-0.5 transition"
                              title="Remover disciplina"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => openModal(aluno)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Associar
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal de Associação ── */}
      {isModalOpen && (
        <Modal title="Associar Disciplina" onClose={() => setIsModalOpen(false)}>
          <p className="text-sm text-white/40 mb-5">
            A dar acesso a <span className="text-white font-medium">{selectedAluno?.nome}</span>
          </p>

          <form onSubmit={handleAssociar} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Escolher Disciplina *</label>
              <select
                required
                value={selectedModulo}
                onChange={(e) => setSelectedModulo(e.target.value)}
                className={inputCls}
              >
                <option value="" disabled>Seleciona uma disciplina...</option>
                {modulos.map(m => (
                  <option key={m.id_modulo} value={m.id_modulo}>
                    {m.codigo ? `${m.codigo} - ` : ''}{m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !selectedModulo}
                className="flex-1 rounded-lg bg-[#a78bfa] py-2.5 text-sm font-semibold text-white hover:bg-[#8b5cf6] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'A associar...' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal de Confirmação de Eliminação ── */}
      {deleteModalData && (
        <Modal title="Remover Disciplina" onClose={() => setDeleteModalData(null)}>
          <p className="text-sm text-white/60 mb-6 leading-relaxed">
            Tens a certeza que queres remover o aluno <span className="text-white font-semibold">{deleteModalData.alunoNome}</span> da disciplina de <span className="text-white font-semibold">{deleteModalData.disciplinaNome}</span>?
            <br/><br/>
            Ele deixará de ter acesso à galeria comunitária desta disciplina.
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={executeRemoverAssociacao}
              disabled={isDeleting}
              className="flex-1 rounded-lg bg-red-500 hover:bg-red-600 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isDeleting ? 'A remover...' : 'Remover'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalData(null)}
              disabled={isDeleting}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}