'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { useAdminFilter } from '../AdminFilterContext';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

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

/* ─── Formulário de novo modelo ──────────────────────────────────── */
function NovoModeloForm({ onSave, onCancel, saving, disciplinas }) {
  const [titulo,    setTitulo]    = useState('');
  const [moduloId,  setModuloId]  = useState('');
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  async function handleSave() {
    if (!file)          { setError('Seleciona um ficheiro GLB.'); return; }
    if (!titulo.trim()) { setError('O título é obrigatório.'); return; }
    if (!moduloId)      { setError('Seleciona uma disciplina.'); return; }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'Erro no upload.');
      setUploading(false);
      return;
    }

    const disciplinaSelecionada = disciplinas.find(d => d.id_modulo == moduloId);

    await onSave({ 
      titulo: titulo.trim(), 
      url: json.url, 
      id_modulo: Number(moduloId),
      id_programa: disciplinaSelecionada?.id_programa,
      id_entidade: disciplinaSelecionada?.programa?.id_entidade
    });
    
    setUploading(false);
  }

  const isBusy = saving || uploading;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Ficheiro GLB *</label>
        <div
          onClick={() => fileRef.current?.click()}
          className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 cursor-pointer transition
            ${file ? 'border-[#4f9eff]/40 bg-[#4f9eff]/5' : 'border-white/10 hover:border-white/20'}`}
        >
          <span className="text-2xl">{file ? '🧊' : '📁'}</span>
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
                <p className="text-xs text-white/30">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            ) : (
              <p className="text-sm text-white/30">Clica para selecionar um ficheiro .glb</p>
            )}
          </div>
          {file && (
            <button
              onClick={e => { e.stopPropagation(); setFile(null); fileRef.current.value = ''; }}
              className="text-white/25 hover:text-red-400 transition text-lg leading-none"
            >×</button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={e => { setFile(e.target.files[0] ?? null); setError(''); }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Título do Modelo *</label>
        <input
          className={inputCls}
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="ex: Célula Animal"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Associar a Disciplina *</label>
        <select
          className={inputCls}
          value={moduloId}
          onChange={e => setModuloId(e.target.value)}
        >
          <option value="" disabled>Seleciona a disciplina...</option>
          {disciplinas.map(d => (
            <option key={d.id_modulo} value={d.id_modulo}>{d.nome}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={isBusy}
          className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'A fazer upload…' : saving ? 'A guardar…' : 'Adicionar Modelo'}
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

/* ─── Constantes de animação do preview ──────────────────────────── */
const PV_Z_START   = -40;
const PV_Z_END     = -8;
const PV_S_START   = 0.3;
const PV_CYCLE_SEC = 4.0;
const PV_T_IN      = 0.33;
const PV_T_ROT     = 0.67;

function pvEio(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const ANIM_OPTS = [
  { value: 'none',     label: 'Sem Animação', desc: 'Modelo estático no centro'          },
  { value: 'zoom',     label: 'Zoom',         desc: 'Avança, roda 360° e recua em loop'  },
  { value: 'rotation', label: 'Rotação',      desc: 'Roda continuamente no lugar'        },
  { value: 'float',    label: 'Flutuação',    desc: 'Sobe e desce suavemente'            },
  { value: 'pulse',    label: 'Pulsar',       desc: 'Aumenta e diminui de escala'        },
  { value: 'custom',   label: 'Custom',       desc: 'Animação nativa do ficheiro GLB'    },
];

/* ─── Modelo 3D com animação para o preview ──────────────────────── */
function PreviewModel({ url, escala, animacaoTipo }) {
  const { scene, animations } = useGLTF(url);
  const groupRef    = useRef(null);
  const clockRef    = useRef(0);
  const autoScaleRef = useRef(1);
  const { camera } = useThree();
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maiorDimensao = Math.max(size.x, size.y, size.z);
    if (maiorDimensao > 0) autoScaleRef.current = 2.0 / maiorDimensao;
  }, [scene]);

  useEffect(() => {
    const all = Object.values(actions);
    if (animacaoTipo === 'custom') {
      all.forEach(a => a?.reset().play());
    } else {
      all.forEach(a => a?.stop());
    }
  }, [animacaoTipo, actions]);

  useEffect(() => {
    clockRef.current = 0;
    if (groupRef.current) groupRef.current.rotation.y = 0;
  }, [animacaoTipo]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    clockRef.current += delta;
    const t = clockRef.current;

    switch (animacaoTipo) {
      case 'zoom': {
        const c = (t % PV_CYCLE_SEC) / PV_CYCLE_SEC;
        const effScale = escala * autoScaleRef.current;
        let posZ, sc, rotY;
        if (c < PV_T_IN) {
          const p = pvEio(c / PV_T_IN);
          posZ = THREE.MathUtils.lerp(PV_Z_START, PV_Z_END, p);
          sc   = THREE.MathUtils.lerp(PV_S_START, effScale, p);
          rotY = 0;
        } else if (c < PV_T_ROT) {
          const p = (c - PV_T_IN) / (PV_T_ROT - PV_T_IN);
          posZ = PV_Z_END; sc = effScale; rotY = p * Math.PI * 2;
        } else {
          const p = pvEio((c - PV_T_ROT) / (1 - PV_T_ROT));
          posZ = THREE.MathUtils.lerp(PV_Z_END, PV_Z_START, p);
          sc   = THREE.MathUtils.lerp(effScale, PV_S_START, p);
          rotY = Math.PI * 2;
        }
        groupRef.current.position.set(0, 0, posZ);
        groupRef.current.scale.setScalar(sc);
        groupRef.current.rotation.y = rotY;
        camera.lookAt(0, 0, posZ);
        break;
      }
      case 'rotation':
        groupRef.current.position.set(0, 0, PV_Z_END);
        groupRef.current.scale.setScalar(escala * autoScaleRef.current);
        groupRef.current.rotation.y += delta * 1.5;
        camera.lookAt(0, 0, PV_Z_END);
        break;
      case 'float':
        groupRef.current.position.set(0, Math.sin(t * 1.5) * 0.5, PV_Z_END);
        groupRef.current.scale.setScalar(escala * autoScaleRef.current);
        camera.lookAt(0, 0, PV_Z_END);
        break;
      case 'pulse':
        groupRef.current.position.set(0, 0, PV_Z_END);
        groupRef.current.scale.setScalar((escala + Math.sin(t * 2) * 0.1) * autoScaleRef.current);
        camera.lookAt(0, 0, PV_Z_END);
        break;
      default:
        groupRef.current.position.set(0, 0, PV_Z_END);
        groupRef.current.scale.setScalar(escala * autoScaleRef.current);
        groupRef.current.rotation.y = 0;
        camera.lookAt(0, 0, PV_Z_END);
        break;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, PV_Z_START]} scale={[PV_S_START, PV_S_START, PV_S_START]}>
      <primitive object={scene.clone()} />
    </group>
  );
}

/* ─── Modal de edição com preview 3D ────────────────────────────── */
function EditModelModal({ modelo, onClose, onSave, saving }) {
  const [titulo,       setTitulo]       = useState(modelo.titulo ?? '');
  const [escala,       setEscala]       = useState(modelo.escala ?? 1.5);
  const [animacaoTipo, setAnimacaoTipo] = useState(modelo.animacao_tipo ?? 'zoom');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex flex-col rounded-2xl border border-[#4f9eff]/30 overflow-hidden shadow-2xl"
        style={{ width: '80vw', height: '80vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#13131a] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Editar Modelo</h2>
            {/* O subtítulo agora mostra o estado atual dinamicamente em vez de apenas modelo.titulo */}
            <p className="text-xs text-white/35 mt-0.5">{titulo}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition text-2xl leading-none">×</button>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="flex-none bg-[#0c0c0f]" style={{ width: '60%' }}>
            <Canvas
              camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
              gl={{ alpha: true, antialias: true }}
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1.2} />
              <pointLight position={[0, 4, PV_Z_END]} color="#4f9eff" intensity={3} distance={60} />
              <Suspense fallback={null}>
                <PreviewModel url={modelo.url} escala={escala} animacaoTipo={animacaoTipo} />
              </Suspense>
            </Canvas>
          </div>

          <div className="flex-1 bg-[#13131a] overflow-y-auto p-6 flex flex-col gap-6 border-l border-white/8">
            
            {/* Campo: Título do Modelo */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">Título do Modelo</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition"
                placeholder="Ex: Motor V8"
              />
            </div>

            {/* Campo: Escala */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-white/70">Escala (Multiplicador)</label>
                <span className="text-sm font-mono font-semibold text-[#4f9eff]">{escala.toFixed(1)}x</span>
              </div>
              <input
                type="range" min={0.1} max={5} step={0.1}
                value={escala} onChange={e => setEscala(parseFloat(e.target.value))}
                className="w-full accent-[#4f9eff] cursor-pointer"
              />
            </div>

            {/* Campo: Animação */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">Tipo de Animação</label>
              <div className="grid grid-cols-2 gap-2">
                {ANIM_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAnimacaoTipo(opt.value)}
                    className={`rounded-lg border p-3 text-left transition ${
                      animacaoTipo === opt.value
                        ? 'border-[#4f9eff] bg-[#4f9eff]/10'
                        : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${animacaoTipo === opt.value ? 'text-[#4f9eff]' : 'text-white/70'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1" />

            {/* Botões do Modal */}
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => onSave({ titulo, escala, animacao_tipo: animacaoTipo })}
                disabled={saving || !titulo.trim()}
                className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                           hover:bg-[#3d8aef] transition disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
              <button
                onClick={onClose} disabled={saving}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────── */
export default function ModelosPage() {
  const { entidadeId, programaId, programas } = useAdminFilter();

  const [modelos,           setModelos]           = useState([]);
  const [todasDisciplinas,  setTodasDisciplinas]  = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [showModal,         setShowModal]         = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [confirmDelete,     setConfirmDelete]     = useState(null);
  const [deleting,          setDeleting]          = useState(false);
  const [editModelo,        setEditModelo]        = useState(null);
  const [savingEdit,        setSavingEdit]        = useState(false);
  const [toast,             setToast]             = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  /* ─── Listar modelos e todas as disciplinas ────────────────────── */
  const fetchDados = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();
    
    // 1. Procurar TODAS as disciplinas para o Admin
    const { data: disciplinas } = await supabase
      .from('modulo')
      .select('id_modulo, nome, id_programa, programa:id_programa(id_entidade)')
      .order('nome', { ascending: true });
      
    setTodasDisciplinas(disciplinas || []);

    // 2. Procurar TODOS os modelos
    const { data: modelosData, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('tipo', 'modelo3d')
      .order('id_media_items', { ascending: false });

    // 3. Procurar as ligações para mostrar a disciplina correta na tabela
    const { data: ligacoes } = await supabase
      .from('modulo_media')
      .select('id_media_items, modulo:id_modulo(nome)');

    if (error) {
      showToast('Erro ao carregar modelos: ' + error.message);
      setModelos([]);
    } else {
      const modelosComDisciplina = (modelosData || []).map(modelo => {
        const ligacaoModelo = ligacoes?.find(l => l.id_media_items === modelo.id_media_items);
        return { ...modelo, nome_disciplina: ligacaoModelo?.modulo?.nome };
      });
      setModelos(modelosComDisciplina);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  /* ─── Adicionar Novo Modelo e Associar à Disciplina ────────────── */
  async function handleCreate({ titulo, url, id_modulo, id_programa, id_entidade }) {
    setSaving(true);
    const supabase = createSupabaseBrowser();

    // 1. Inserir na tabela base de modelos
    const { data: novoModelo, error: mediaError } = await supabase
      .from('media_items')
      .insert([{
        titulo,
        url,
        tipo:        'modelo3d',
        escala:      1.5,
        offset_y:    0,
        loop:        true,
        id_programa: id_programa || null,
        id_entidade: Array.isArray(id_entidade) ? id_entidade[0]?.id_entidade : id_entidade?.id_entidade || null
      }])
      .select()
      .single();

    if (mediaError) {
      showToast('Erro ao registar modelo base: ' + mediaError.message);
      setSaving(false);
      return;
    }

    // 2. Associar o modelo à disciplina selecionada
    const { error: relError } = await supabase
      .from('modulo_media')
      .insert([{
        id_modulo: id_modulo,
        id_media_items: novoModelo.id_media_items
      }]);

    if (relError) {
      showToast('Modelo criado, mas falhou ao associar à disciplina: ' + relError.message);
    } else {
      showToast('Modelo adicionado e associado à disciplina com sucesso!');
      setShowModal(false);
      fetchDados();
    }
    setSaving(false);
  }

  /* ─── Editar modelo ──────────────────────────────────────────── */
  async function handleEdit({ titulo, escala, animacao_tipo }) {
    setSavingEdit(true);
    const supabase = createSupabaseBrowser();

    const { error } = await supabase
      .from('media_items')
      .update({ titulo: titulo.trim(), escala, animacao_tipo })
      .eq('id_media_items', editModelo.id_media_items);

    if (error) {
      showToast('Erro ao guardar: ' + error.message);
    } else {
      showToast('Modelo atualizado com sucesso!');
      setEditModelo(null);
      fetchDados();
    }
    setSavingEdit(false);
  }

  /* ─── Eliminar modelo ────────────────────────────────────────── */
  async function handleDelete() {
    setDeleting(true);

    const modelo = modelos.find(m => m.id_media_items === confirmDelete);

    if (modelo?.url) {
      const res = await fetch('/api/delete-model', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: modelo.url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast('Erro ao apagar ficheiro R2: ' + (json.error ?? res.statusText));
        setDeleting(false);
        return;
      }
    }

    const supabase = createSupabaseBrowser();
    // A Foreign Key (ON DELETE CASCADE) apagará a relação no modulo_media automaticamente.
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id_media_items', confirmDelete);

    if (error) {
      showToast('Erro ao apagar no Supabase: ' + error.message);
    } else {
      showToast('Modelo eliminado.');
      fetchDados();
    }
    setConfirmDelete(null);
    setDeleting(false);
  }

  const programaIdsEntidade = programas.map(p => p.id_programa);
  const modelosFiltrados = modelos.filter(m => {
    if (programaId) return m.id_programa == programaId;
    if (entidadeId) return programaIdsEntidade.includes(m.id_programa);
    return true;
  });

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
          <h1 className="text-2xl font-bold text-white">Modelos 3D</h1>
          <p className="text-sm text-white/35 mt-1">
            {loading ? '…' : `${modelosFiltrados.length} modelo${modelosFiltrados.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm
                     font-semibold text-white hover:bg-[#3d8aef] transition"
        >
          <span className="text-lg leading-none">+</span>
          Novo Modelo
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
        ) : modelosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-white/25">
            {modelos.length === 0 ? 'Nenhum modelo encontrado. Faz o upload do primeiro!' : 'Nenhum modelo para o filtro selecionado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/30 border-b border-white/5 bg-white/2">
                <th className="text-left px-5 py-3 font-medium">Título</th>
                <th className="text-left px-5 py-3 font-medium">Disciplina</th>
                <th className="text-left px-5 py-3 font-medium">Escala</th>
                <th className="text-left px-5 py-3 font-medium">Animação</th>
                <th className="text-left px-5 py-3 font-medium">URL</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {modelosFiltrados.map((m, i) => (
                <tr
                  key={m.id_media_items}
                  className={`transition hover:bg-white/2 ${i !== modelosFiltrados.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* Mini Visualizador 3D na Tabela */}
                      <div className="h-12 w-12 overflow-hidden rounded-md border border-white/10 bg-[#0c0c0f] flex-shrink-0 flex items-center justify-center">
                        <Canvas
                          camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
                          gl={{ alpha: true, antialias: true }}
                          style={{ width: '100%', height: '100%', background: 'transparent' }}
                        >
                          <ambientLight intensity={0.6} />
                          <directionalLight position={[10, 10, 5]} intensity={1.5} />
                          <Suspense fallback={null}>
                            <PreviewModel url={m.url} escala={m.escala ?? 1.5} animacaoTipo={m.animacao_tipo ?? 'rotation'} />
                          </Suspense>
                        </Canvas>
                      </div>
                      <p className="font-medium text-white/85 truncate max-w-[150px]">{m.titulo ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-white/45 text-xs">
                    {m.nome_disciplina ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-white/45 font-mono text-xs">
                    {m.escala ?? 1.5}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-[#4f9eff] bg-[#4f9eff]/10 px-2 py-1 rounded-md font-mono">
                      {m.animacao_tipo ?? 'none'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#4f9eff]/60 hover:text-[#4f9eff] transition truncate block max-w-[120px]"
                      title={m.url}
                    >
                      {m.url?.split('/').pop() ?? m.url}
                    </a>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditModelo(m)}
                        className="rounded-md border border-[#4f9eff]/20 px-3 py-1.5 text-xs font-medium
                                   text-[#4f9eff]/60 hover:bg-[#4f9eff]/10 hover:text-[#4f9eff] transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(m.id_media_items)}
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

      {/* Modal — Novo Modelo */}
      {showModal && (
        <Modal title="Novo Modelo 3D" onClose={() => setShowModal(false)}>
          <NovoModeloForm
            onSave={handleCreate}
            onCancel={() => setShowModal(false)}
            saving={saving}
            disciplinas={todasDisciplinas}
          />
        </Modal>
      )}

      {/* Modal — Editar Modelo */}
      {editModelo && (
        <EditModelModal
          modelo={editModelo}
          onClose={() => setEditModelo(null)}
          onSave={handleEdit}
          saving={savingEdit}
        />
      )}

      {/* Modal — Confirmar eliminação */}
      {confirmDelete !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-white/60 mb-6">
            Tens a certeza que queres eliminar este modelo?
            O ficheiro no R2 não será eliminado automaticamente.
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