'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Canvas } from '@react-three/fiber';
import { AnimatedModel, Z_END } from '@/components/ModelScene';

const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#a78bfa]/50 focus:ring-1
  focus:ring-[#a78bfa]/30 transition`;

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
function NovoModeloForm({ onSave, onCancel, saving, disciplinasGestor }) {
  const [titulo,    setTitulo]    = useState('');
  const [moduloId,  setModuloId]  = useState(disciplinasGestor?.[0]?.id_modulo || '');
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

    const disciplinaSelecionada = disciplinasGestor.find(d => d.id_modulo == moduloId);
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
            ${file ? 'border-[#a78bfa]/40 bg-[#a78bfa]/5' : 'border-white/10 hover:border-white/20'}`}
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
        <input ref={fileRef} type="file" accept=".glb" className="hidden"
          onChange={e => { setFile(e.target.files[0] ?? null); setError(''); }} />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Título do Modelo *</label>
        <input className={inputCls} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="ex: Motor V8" />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Associar a Disciplina *</label>
        <select className={inputCls} value={moduloId} onChange={e => setModuloId(e.target.value)}>
          <option value="" disabled>Seleciona a disciplina...</option>
          {disciplinasGestor.map(d => (
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
        <button onClick={handleSave} disabled={isBusy}
          className="flex-1 rounded-lg bg-[#a78bfa] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#8b5cf6] transition disabled:opacity-50 disabled:cursor-not-allowed">
          {uploading ? 'A fazer upload…' : saving ? 'A guardar…' : 'Adicionar Modelo'}
        </button>
        <button onClick={onCancel} disabled={isBusy}
          className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                     text-white/50 hover:bg-white/5 hover:text-white/80 transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ─── Formulário de novo vídeo ───────────────────────────────────── */
function NovoVideoForm({ onSave, onCancel, saving, disciplinasGestor }) {
  const [titulo,    setTitulo]    = useState('');
  const [moduloId,  setModuloId]  = useState(disciplinasGestor?.[0]?.id_modulo || '');
  const [file,      setFile]      = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const fileRef = useRef();

  async function handleSave() {
    if (!file)          { setError('Seleciona um ficheiro de vídeo.'); return; }
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

    const disciplinaSelecionada = disciplinasGestor.find(d => d.id_modulo == moduloId);
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
              <p className="text-sm text-white/30">Clica para selecionar .mp4, .webm ou .mov</p>
            )}
          </div>
          {file && (
            <button
              onClick={e => { e.stopPropagation(); setFile(null); fileRef.current.value = ''; }}
              className="text-white/25 hover:text-red-400 transition text-lg leading-none"
            >×</button>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".mp4,.webm,.mov" className="hidden"
          onChange={e => { setFile(e.target.files[0] ?? null); setError(''); }} />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Título do Vídeo *</label>
        <input className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="ex: Demonstração do produto" />
      </div>

      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Associar a Disciplina *</label>
        <select className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1 focus:ring-[#4f9eff]/30 transition" value={moduloId} onChange={e => setModuloId(e.target.value)}>
          <option value="" disabled>Seleciona a disciplina...</option>
          {disciplinasGestor.map(d => (
            <option key={d.id_modulo} value={d.id_modulo}>{d.nome}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-white/25 leading-relaxed">
        O vídeo aparece na zona superior do card da disciplina ao fazer hover,
        em conjunto com o modelo 3D associado.
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={handleSave} disabled={isBusy}
          className="flex-1 rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                     hover:bg-[#3b82f6] transition disabled:opacity-50 disabled:cursor-not-allowed">
          {uploading ? 'A fazer upload…' : saving ? 'A guardar…' : 'Adicionar Vídeo'}
        </button>
        <button onClick={onCancel} disabled={isBusy}
          className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                     text-white/50 hover:bg-white/5 hover:text-white/80 transition">
          Cancelar
        </button>
      </div>
    </div>
  );
}


const ANIM_OPTS = [
  { value: 'none',     label: 'Sem Animação', desc: 'Modelo estático no centro'          },
  { value: 'zoom',     label: 'Zoom',         desc: 'Avança, roda 360° e recua em loop'  },
  { value: 'rotation', label: 'Rotação',      desc: 'Roda continuamente no lugar'        },
  { value: 'float',    label: 'Flutuação',    desc: 'Sobe e desce suavemente'            },
  { value: 'pulse',    label: 'Pulsar',       desc: 'Aumenta e diminui de escala'        },
  { value: 'custom',   label: 'Custom',       desc: 'Animação nativa do ficheiro GLB'    },
];


/* ─── Slider auxiliar reutilizável ───────────────────────────────── */
function SliderRow({ label, value, onChange, min, max, step, format }) {
  const display = format ? format(value) : value;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-xs font-mono text-[#a78bfa]">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value} onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#a78bfa] cursor-pointer"
      />
    </div>
  );
}

/* ─── Modal de edição com preview 3D ────────────────────────────── */
function EditModelModal({ modelo, onClose, onSave, saving }) {
  const [titulo,       setTitulo]       = useState(modelo.titulo ?? '');
  const [escala,       setEscala]       = useState(modelo.escala ?? 1.5);
  const [animacaoTipo, setAnimacaoTipo] = useState(modelo.animacao_tipo ?? 'zoom');
  const [rotacaoX,     setRotacaoX]     = useState(modelo.rotacao_x ?? 0);
  const [rotacaoY,     setRotacaoY]     = useState(modelo.rotacao_y ?? 0);
  const [rotacaoZ,     setRotacaoZ]     = useState(modelo.rotacao_z ?? 0);
  const [posicaoX,     setPosicaoX]     = useState(modelo.posicao_x ?? 0);
  const [posicaoY,     setPosicaoY]     = useState(modelo.offset_y  ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex flex-col rounded-2xl border border-[#a78bfa]/30 overflow-hidden shadow-2xl"
        style={{ width: '80vw', height: '80vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#13131a] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white">Editar Modelo</h2>
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
              <pointLight position={[0, 4, Z_END]} color="#a78bfa" intensity={3} distance={60} />
              <Suspense fallback={null}>
                <AnimatedModel
                  key={modelo.url}
                  url={modelo.url}
                  escala={escala}
                  animacaoTipo={animacaoTipo}
                  rotacaoX={rotacaoX}
                  rotacaoY={rotacaoY}
                  rotacaoZ={rotacaoZ}
                  posicaoX={posicaoX}
                  offsetY={posicaoY}
                />
              </Suspense>
            </Canvas>
          </div>

          <div className="flex-1 bg-[#13131a] overflow-y-auto p-6 flex flex-col gap-6 border-l border-white/8">
            
            {/* Campo de edição do Título */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">Título do Modelo</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                className={inputCls}
                placeholder="Ex: Célula Animal"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-white/70">Escala</label>
                <span className="text-sm font-mono font-semibold text-[#a78bfa]">{escala.toFixed(1)}</span>
              </div>
              <input
                type="range" min={0.1} max={35} step={0.1}
                value={escala} onChange={e => setEscala(parseFloat(e.target.value))}
                className="w-full accent-[#a78bfa] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-3">Tipo de Animação</label>
              <div className="grid grid-cols-2 gap-2">
                {ANIM_OPTS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setAnimacaoTipo(opt.value)}
                    className={`rounded-lg border p-3 text-left transition ${
                      animacaoTipo === opt.value
                        ? 'border-[#a78bfa] bg-[#a78bfa]/10'
                        : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${animacaoTipo === opt.value ? 'text-[#a78bfa]' : 'text-white/70'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-white/30 mt-0.5 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Campo: Posição e Rotação */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-white/70">Posição e Rotação</label>
                <button
                  type="button"
                  onClick={() => { setRotacaoX(0); setRotacaoY(0); setRotacaoZ(0); setPosicaoX(0); setPosicaoY(0); }}
                  className="text-xs text-white/30 hover:text-white/60 transition"
                >
                  Repor
                </button>
              </div>
              <div className="space-y-3">
                <SliderRow label="Rot. X" value={rotacaoX} onChange={setRotacaoX} min={-180} max={180} step={1} format={v => `${v}°`} />
                <SliderRow label="Rot. Y" value={rotacaoY} onChange={setRotacaoY} min={-180} max={180} step={1} format={v => `${v}°`} />
                <SliderRow label="Rot. Z" value={rotacaoZ} onChange={setRotacaoZ} min={-180} max={180} step={1} format={v => `${v}°`} />
                <SliderRow label="Pos. X" value={posicaoX} onChange={setPosicaoX} min={-2} max={2} step={0.05} format={v => v.toFixed(2)} />
                <SliderRow label="Pos. Y" value={posicaoY} onChange={setPosicaoY} min={-2} max={2} step={0.05} format={v => v.toFixed(2)} />
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => onSave({ titulo, escala, animacao_tipo: animacaoTipo, rotacao_x: rotacaoX, rotacao_y: rotacaoY, rotacao_z: rotacaoZ, posicao_x: posicaoX, offset_y: posicaoY })}
                disabled={saving || !titulo.trim()}
                className="flex-1 rounded-lg bg-[#a78bfa] py-2.5 text-sm font-semibold text-white
                           hover:bg-[#8b5cf6] transition disabled:opacity-50"
              >
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
              <button onClick={onClose} disabled={saving}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-white/50 hover:bg-white/5 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Página principal direcionada ao Gestor ─────────────────────── */
export default function GestorModelosPage() {
  const [modelos,           setModelos]           = useState([]);
  const [videos,            setVideos]            = useState([]);
  const [disciplinasGestor, setDisciplinasGestor] = useState([]);
  const [loading,           setLoading]           = useState(true);

  /* estados modelos */
  const [showModal,     setShowModal]     = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [editModelo,    setEditModelo]    = useState(null);
  const [savingEdit,    setSavingEdit]    = useState(false);

  /* estados vídeos */
  const [showVideoModal,     setShowVideoModal]     = useState(false);
  const [savingVideo,        setSavingVideo]        = useState(false);
  const [confirmDeleteVideo, setConfirmDeleteVideo] = useState(null);
  const [deletingVideo,      setDeletingVideo]      = useState(false);

  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  /* ─── Carregar dados ───────────────────────────────────────────── */
  const fetchDados = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowser();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: permissoes } = await supabase
      .from('tipo_utilizador')
      .select('id_modulo')
      .eq('id_utilizador', user.id)
      .not('id_modulo', 'is', null);

    const moduloIds = Array.from(new Set((permissoes || []).map(p => p.id_modulo)));

    if (moduloIds.length === 0) {
      setModelos([]);
      setVideos([]);
      setDisciplinasGestor([]);
      setLoading(false);
      return;
    }

    const { data: disciplinas } = await supabase
      .from('modulo')
      .select('id_modulo, nome, id_programa, programa:id_programa(id_entidade)')
      .in('id_modulo', moduloIds);

    setDisciplinasGestor(disciplinas || []);

    const { data: ligacoes } = await supabase
      .from('modulo_media')
      .select('id_media_items, modulo:id_modulo(nome)')
      .in('id_modulo', moduloIds);

    const mediaItemIds = Array.from(new Set((ligacoes || []).map(l => l.id_media_items)));

    if (mediaItemIds.length > 0) {
      /* modelos 3D */
      const { data: modelosData } = await supabase
        .from('media_items')
        .select('*')
        .eq('tipo', 'modelo3d')
        .in('id_media_items', mediaItemIds)
        .order('id_media_items', { ascending: false });

      setModelos((modelosData || []).map(m => ({
        ...m,
        nome_disciplina: ligacoes.find(l => l.id_media_items === m.id_media_items)?.modulo?.nome,
      })));

      /* vídeos */
      const { data: videosData } = await supabase
        .from('media_items')
        .select('*')
        .eq('tipo', 'video')
        .in('id_media_items', mediaItemIds)
        .order('id_media_items', { ascending: false });

      setVideos((videosData || []).map(v => ({
        ...v,
        nome_disciplina: ligacoes.find(l => l.id_media_items === v.id_media_items)?.modulo?.nome,
      })));
    } else {
      setModelos([]);
      setVideos([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchDados(); }, [fetchDados]);

  /* ─── Criar modelo ──────────────────────────────────────────────── */
  async function handleCreate({ titulo, url, id_modulo, id_programa, id_entidade }) {
    setSaving(true);
    const supabase = createSupabaseBrowser();

    const { data: novoModelo, error: mediaError } = await supabase
      .from('media_items')
      .insert([{
        titulo,
        url,
        tipo:        'modelo3d',
        escala:      1.5,
        offset_y:    0,
        loop:        true,
        id_programa,
        id_entidade: Array.isArray(id_entidade) ? id_entidade[0]?.id_entidade : id_entidade?.id_entidade,
      }])
      .select()
      .single();

    if (mediaError) { showToast('Erro: ' + mediaError.message); setSaving(false); return; }

    const { error: relError } = await supabase
      .from('modulo_media')
      .insert([{ id_modulo, id_media_items: novoModelo.id_media_items }]);

    if (relError) {
      showToast('Modelo criado, mas falhou a associar à disciplina: ' + relError.message);
    } else {
      showToast('Modelo adicionado com sucesso!');
      setShowModal(false);
      fetchDados();
    }
    setSaving(false);
  }

  /* ─── Criar vídeo ───────────────────────────────────────────────── */
  async function handleCreateVideo({ titulo, url, id_modulo, id_programa, id_entidade }) {
    setSavingVideo(true);
    const supabase = createSupabaseBrowser();

    const { data: novoVideo, error: mediaError } = await supabase
      .from('media_items')
      .insert([{
        titulo,
        url,
        tipo:        'video',
        loop:        true,
        id_programa,
        id_entidade: Array.isArray(id_entidade) ? id_entidade[0]?.id_entidade : id_entidade?.id_entidade,
      }])
      .select()
      .single();

    if (mediaError) { showToast('Erro: ' + mediaError.message); setSavingVideo(false); return; }

    const { error: relError } = await supabase
      .from('modulo_media')
      .insert([{ id_modulo, id_media_items: novoVideo.id_media_items }]);

    if (relError) {
      showToast('Vídeo criado, mas falhou a associar à disciplina: ' + relError.message);
    } else {
      showToast('Vídeo adicionado com sucesso!');
      setShowVideoModal(false);
      fetchDados();
    }
    setSavingVideo(false);
  }

  /* ─── Editar modelo ─────────────────────────────────────────────── */
  async function handleEdit({ titulo, escala, animacao_tipo, rotacao_x, rotacao_y, rotacao_z, posicao_x, offset_y }) {
    setSavingEdit(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .update({ titulo: titulo.trim(), escala, animacao_tipo, rotacao_x, rotacao_y, rotacao_z, posicao_x, offset_y })
      .eq('id_media_items', editModelo.id_media_items);

    if (error) { showToast('Erro: ' + error.message); }
    else       { showToast('Modelo guardado!'); setEditModelo(null); fetchDados(); }
    setSavingEdit(false);
  }

  /* ─── Eliminar modelo ───────────────────────────────────────────── */
  async function handleDelete() {
    setDeleting(true);
    const modelo = modelos.find(m => m.id_media_items === confirmDelete);

    if (modelo?.url) {
      const res = await fetch('/api/delete-model', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: modelo.url }),
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
    else       { showToast('Modelo eliminado.'); fetchDados(); }
    setConfirmDelete(null);
    setDeleting(false);
  }

  /* ─── Eliminar vídeo ────────────────────────────────────────────── */
  async function handleDeleteVideo() {
    setDeletingVideo(true);
    const video = videos.find(v => v.id_media_items === confirmDeleteVideo);

    if (video?.url) {
      const res = await fetch('/api/delete-model', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: video.url }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast('Erro ao apagar ficheiro: ' + (json.error ?? res.statusText));
        setDeletingVideo(false);
        return;
      }
    }

    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id_media_items', confirmDeleteVideo);

    if (error) { showToast('Erro: ' + error.message); }
    else       { showToast('Vídeo eliminado.'); fetchDados(); }
    setConfirmDeleteVideo(null);
    setDeletingVideo(false);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a]
                        px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ══ Secção Modelos 3D ════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Modelos 3D <span className="text-[#a78bfa] text-base">(Área do Gestor)</span>
            </h1>
            <p className="text-sm text-white/35 mt-1">
              {loading ? '…' : `${modelos.length} modelo${modelos.length !== 1 ? 's' : ''} nas suas disciplinas`}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#a78bfa] px-4 py-2.5 text-sm
                       font-semibold text-white hover:bg-[#8b5cf6] transition"
          >
            <span className="text-lg leading-none">+</span>
            Novo Modelo
          </button>
        </div>

        <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
          ) : disciplinasGestor.length === 0 ? (
            <div className="py-12 text-center text-sm text-red-300/80">
              Ainda não lhe foi associada nenhuma disciplina. Fale com um Administrador.
            </div>
          ) : modelos.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/25">
              Nenhum modelo nas suas disciplinas. Crie o primeiro!
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
                {modelos.map((m, i) => (
                  <tr key={m.id_media_items}
                      className={`transition hover:bg-white/2 ${i !== modelos.length - 1 ? 'border-b border-white/5' : ''}`}>
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
                              <AnimatedModel
                                key={m.url}
                                url={m.url}
                                escala={m.escala ?? 1.5}
                                animacaoTipo={m.animacao_tipo ?? 'rotation'}
                                rotacaoX={m.rotacao_x ?? 0}
                                rotacaoY={m.rotacao_y ?? 0}
                                rotacaoZ={m.rotacao_z ?? 0}
                                posicaoX={m.posicao_x ?? 0}
                                offsetY={m.offset_y  ?? 0}
                              />
                            </Suspense>
                          </Canvas>
                        </div>
                        <p className="font-medium text-white/85 truncate max-w-[150px]">{m.titulo ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white/45 text-xs">{m.nome_disciplina ?? '—'}</td>
                    <td className="px-5 py-3.5 text-white/45 font-mono text-xs">{m.escala ?? 1.5}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-[#a78bfa] bg-[#a78bfa]/10 px-2 py-1 rounded-md font-mono">
                        {m.animacao_tipo ?? 'none'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <a href={m.url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-[#a78bfa]/60 hover:text-[#a78bfa] transition truncate block max-w-[150px]"
                         title={m.url}>
                        {m.url?.split('/').pop() ?? m.url}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditModelo(m)}
                          className="rounded-md border border-[#a78bfa]/20 px-3 py-1.5 text-xs font-medium
                                     text-[#a78bfa]/60 hover:bg-[#a78bfa]/10 hover:text-[#a78bfa] transition">
                          Editar
                        </button>
                        <button onClick={() => setConfirmDelete(m.id_media_items)}
                          className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium
                                     text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition">
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
      </section>

      {/* ══ Secção Vídeos de Fundo ═══════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Vídeos de Fundo <span className="text-[#4f9eff] text-base">(Breakout)</span>
            </h2>
            <p className="text-sm text-white/35 mt-1">
              {loading ? '…' : `${videos.length} vídeo${videos.length !== 1 ? 's' : ''} nas suas disciplinas`}
              <span className="ml-2 text-white/20">— aparecem no hover do card quando há modelo 3D associado</span>
            </p>
          </div>
          <button
            onClick={() => setShowVideoModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#4f9eff] px-4 py-2.5 text-sm
                       font-semibold text-white hover:bg-[#3b82f6] transition"
          >
            <span className="text-lg leading-none">+</span>
            Novo Vídeo
          </button>
        </div>

        <div className="rounded-xl border border-white/8 bg-[#13131a] overflow-hidden">
          {loading ? (
            <div className="py-12 text-center text-sm text-white/25">A carregar…</div>
          ) : videos.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/25">
              Nenhum vídeo associado às suas disciplinas.
              {disciplinasGestor.length > 0 && ' Adiciona um para activar o efeito breakout!'}
            </div>
          ) : (
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
                {videos.map((v, i) => (
                  <tr key={v.id_media_items}
                      className={`transition hover:bg-white/2 ${i !== videos.length - 1 ? 'border-b border-white/5' : ''}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎬</span>
                        <p className="font-medium text-white/85">{v.titulo ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-white/45 text-xs">{v.nome_disciplina ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <a href={v.url} target="_blank" rel="noopener noreferrer"
                         className="text-xs text-[#4f9eff]/60 hover:text-[#4f9eff] transition truncate block max-w-[200px]"
                         title={v.url}>
                        {v.url?.split('/').pop() ?? v.url}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => setConfirmDeleteVideo(v.id_media_items)}
                        className="rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium
                                   text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Modal Novo Modelo ─────────────────────────────────────── */}
      {showModal && (
        <Modal title="Novo Modelo 3D" onClose={() => setShowModal(false)}>
          <NovoModeloForm
            onSave={handleCreate}
            onCancel={() => setShowModal(false)}
            saving={saving}
            disciplinasGestor={disciplinasGestor}
          />
        </Modal>
      )}

      {/* ── Modal Novo Vídeo ──────────────────────────────────────── */}
      {showVideoModal && (
        <Modal title="Novo Vídeo de Fundo" onClose={() => setShowVideoModal(false)}>
          <NovoVideoForm
            onSave={handleCreateVideo}
            onCancel={() => setShowVideoModal(false)}
            saving={savingVideo}
            disciplinasGestor={disciplinasGestor}
          />
        </Modal>
      )}

      {/* ── Modal Editar Modelo ───────────────────────────────────── */}
      {editModelo && (
        <EditModelModal
          modelo={editModelo}
          onClose={() => setEditModelo(null)}
          onSave={handleEdit}
          saving={savingEdit}
        />
      )}

      {/* ── Modal Confirmar eliminar modelo ──────────────────────── */}
      {confirmDelete !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-white/60 mb-6">Tens a certeza que queres eliminar este modelo?</p>
          <div className="flex gap-3">
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-sm font-semibold text-white
                         hover:bg-red-500 transition disabled:opacity-50">
              {deleting ? 'A eliminar…' : 'Eliminar'}
            </button>
            <button onClick={() => setConfirmDelete(null)} disabled={deleting}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                         text-white/50 hover:bg-white/5 transition">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal Confirmar eliminar vídeo ───────────────────────── */}
      {confirmDeleteVideo !== null && (
        <Modal title="Confirmar eliminação" onClose={() => setConfirmDeleteVideo(null)}>
          <p className="text-sm text-white/60 mb-6">Tens a certeza que queres eliminar este vídeo?</p>
          <div className="flex gap-3">
            <button onClick={handleDeleteVideo} disabled={deletingVideo}
              className="flex-1 rounded-lg bg-red-500/80 py-2.5 text-sm font-semibold text-white
                         hover:bg-red-500 transition disabled:opacity-50">
              {deletingVideo ? 'A eliminar…' : 'Eliminar'}
            </button>
            <button onClick={() => setConfirmDeleteVideo(null)} disabled={deletingVideo}
              className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium
                         text-white/50 hover:bg-white/5 transition">
              Cancelar
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}