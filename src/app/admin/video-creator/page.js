'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Constants ────────────────────────────────────────────────────── */
const ANIM_OPTS = [
  { value: 'none',     label: 'Sem Animação' },
  { value: 'zoom',     label: 'Zoom'         },
  { value: 'rotation', label: 'Rotação'      },
  { value: 'float',    label: 'Flutuação'    },
  { value: 'pulse',    label: 'Pulsar'       },
  { value: 'custom',   label: 'Custom'       },
];

const RESOLUTIONS = [
  { label: 'Landscape 16:9 (1920×1080)', value: '16:9', w: 1920, h: 1080 },
  { label: 'Portrait 9:16 (1080×1920)',  value: '9:16', w: 1080, h: 1920 },
  { label: 'Square 1:1 (1080×1080)',     value: '1:1',  w: 1080, h: 1080 },
  { label: 'Landscape 4:3 (1440×1080)',  value: '4:3',  w: 1440, h: 1080 },
];

/* ─── Animation helpers ─────────────────────────────────────────────── */
const PV_Z_START   = -40;
const PV_Z_END     = -8;
const PV_S_START   = 0.3;
const PV_CYCLE_SEC = 4.0;
const PV_T_IN      = 0.33;
const PV_T_ROT     = 0.67;
function pvEio(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ─── Estilos ─────────────────────────────────────────────────────── */
const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition disabled:opacity-40 disabled:cursor-not-allowed`;

/* ─── Fundo da cena ───────────────────────────────────────────────── */
function SceneBackground({ url, type }) {
  const { scene } = useThree();
  const videoRef  = useRef(null);

  useEffect(() => {
    if (!url) {
      scene.background = new THREE.Color('#0c0c0f');
      return;
    }
    if (type === 'video') {
      const v = document.createElement('video');
      v.src = url; v.loop = true; v.muted = true; v.playsInline = true;
      v.play().catch(() => {});
      videoRef.current = v;
      scene.background = new THREE.VideoTexture(v);
    } else {
      new THREE.TextureLoader().load(url, t => { scene.background = t; });
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current = null;
      }
      scene.background = new THREE.Color('#0c0c0f');
    };
  }, [url, type, scene]);

  useFrame(() => {
    if (scene.background?.isVideoTexture) scene.background.needsUpdate = true;
  });

  return null;
}

/* ─── Modelo 3D animado ───────────────────────────────────────────── */
function VideoModel({ url, escala, animacaoTipo }) {
  const { scene, animations } = useGLTF(url);
  const groupRef  = useRef(null);
  const clockRef  = useRef(0);
  const { camera } = useThree();
  const { actions } = useAnimations(animations, groupRef);

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
        let posZ, sc, rotY;
        if (c < PV_T_IN) {
          const p = pvEio(c / PV_T_IN);
          posZ = THREE.MathUtils.lerp(PV_Z_START, PV_Z_END, p);
          sc   = THREE.MathUtils.lerp(PV_S_START, escala, p);
          rotY = 0;
        } else if (c < PV_T_ROT) {
          const p = (c - PV_T_IN) / (PV_T_ROT - PV_T_IN);
          posZ = PV_Z_END; sc = escala; rotY = p * Math.PI * 2;
        } else {
          const p = pvEio((c - PV_T_ROT) / (1 - PV_T_ROT));
          posZ = THREE.MathUtils.lerp(PV_Z_END, PV_Z_START, p);
          sc   = THREE.MathUtils.lerp(escala, PV_S_START, p);
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
        groupRef.current.scale.setScalar(escala);
        groupRef.current.rotation.y += delta * 1.5;
        camera.lookAt(0, 0, PV_Z_END);
        break;
      case 'float':
        groupRef.current.position.set(0, Math.sin(t * 1.5) * 0.5, PV_Z_END);
        groupRef.current.scale.setScalar(escala);
        camera.lookAt(0, 0, PV_Z_END);
        break;
      case 'pulse':
        groupRef.current.position.set(0, 0, PV_Z_END);
        groupRef.current.scale.setScalar(escala + Math.sin(t * 2) * 0.1);
        camera.lookAt(0, 0, PV_Z_END);
        break;
      default:
        groupRef.current.position.set(0, 0, PV_Z_END);
        groupRef.current.scale.setScalar(escala);
        groupRef.current.rotation.y = 0;
        camera.lookAt(0, 0, PV_Z_END);
        break;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, PV_Z_START]} scale={[PV_S_START, PV_S_START, PV_S_START]}>
      <primitive object={scene} />
    </group>
  );
}

/* ─── Secção de configuração ──────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-white/8 bg-[#13131a] p-4 space-y-3">
      <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  );
}

function TogglePair({ value, options, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-white/10">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex-1 py-2 text-xs font-medium transition
            ${value === v
              ? 'bg-[#4f9eff]/15 text-[#4f9eff]'
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────────────── */
export default function VideoCreatorPage() {

  /* ── Fundo ── */
  const [bgType, setBgType] = useState('imagem');
  const [bgFile, setBgFile] = useState(null);
  const [bgUrl,  setBgUrl]  = useState('');
  const bgFileRef = useRef();

  /* ── Modelo 3D ── */
  const [modelSource,     setModelSource]     = useState('biblioteca');
  const [biblioteca,      setBiblioteca]      = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [libModelUrl,     setLibModelUrl]     = useState('');
  const [uploadFile,      setUploadFile]      = useState(null);
  const [uploadUrl,       setUploadUrl]       = useState('');
  const [escala,          setEscala]          = useState(1.5);
  const [animacao,        setAnimacao]        = useState('zoom');
  const modelFileRef = useRef();

  /* ── Formato ── */
  const [resolucao, setResolucao] = useState('16:9');
  const [duracao,   setDuracao]   = useState(5);
  const [formato,   setFormato]   = useState('mp4');

  /* ── Gravação ── */
  const [recordStatus, setRecordStatus] = useState('idle');
  const [progress,     setProgress]     = useState(0);
  const [toast,        setToast]        = useState('');
  const glRef = useRef(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  /* ── URL ativa do modelo (calculada em tempo real) ── */
  const activeModelUrl = modelSource === 'biblioteca' ? libModelUrl : uploadUrl;

  /* ── Biblioteca do Supabase ── */
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase
      .from('media_items')
      .select('id_media_items, titulo, url')
      .eq('tipo', 'modelo3d')
      .order('id_media_items', { ascending: false })
      .then(({ data }) => setBiblioteca(data || []));
  }, []);

  /* ── Handlers ── */
  function handleBgFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setBgFile(f);
    if (bgUrl) URL.revokeObjectURL(bgUrl);
    setBgUrl(URL.createObjectURL(f));
  }

  function handleModelFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setUploadFile(f);
    if (uploadUrl) URL.revokeObjectURL(uploadUrl);
    setUploadUrl(URL.createObjectURL(f));
  }

  function handleLibSelect(id) {
    setSelectedModelId(id);
    setLibModelUrl(biblioteca.find(m => m.id_media_items == id)?.url || '');
  }

  /* ── Download ── */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ── Gravar e Exportar ── */
  async function handleGravar() {
    if (!glRef.current) { showToast('Canvas não disponível.'); return; }

    const canvas = glRef.current.domElement;
    setRecordStatus('recording');
    setProgress(0);

    const stream   = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks   = [];

    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    recorder.onstop = async () => {
      setRecordStatus('processing');
      const webmBlob = new Blob(chunks, { type: 'video/webm' });

      if (formato === 'webm') {
        downloadBlob(webmBlob, 'breakout-media3d.webm');
        setRecordStatus('idle');
        setProgress(0);
        showToast('Vídeo WebM exportado!');
        return;
      }

      try {
        const { FFmpeg }               = await import('@ffmpeg/ffmpeg');
        const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
        const ffmpeg  = new FFmpeg();
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));

        if (formato === 'mp4') {
          await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', 'output.mp4']);
          const data = await ffmpeg.readFile('output.mp4');
          downloadBlob(new Blob([data.buffer], { type: 'video/mp4' }), 'breakout-media3d.mp4');
        } else if (formato === 'gif') {
          await ffmpeg.exec(['-i', 'input.webm', '-vf', 'fps=15,scale=480:-1', 'output.gif']);
          const data = await ffmpeg.readFile('output.gif');
          downloadBlob(new Blob([data.buffer], { type: 'image/gif' }), 'breakout-media3d.gif');
        }
        showToast('Exportação concluída!');
      } catch (err) {
        console.error('FFmpeg error:', err);
        downloadBlob(webmBlob, 'breakout-media3d.webm');
        showToast('Conversão falhou — guardado como WebM.');
      }

      setRecordStatus('idle');
      setProgress(0);
    };

    recorder.start();

    const t0 = Date.now();
    const iv = setInterval(() => {
      setProgress(Math.min((Date.now() - t0) / (duracao * 1000), 0.99));
    }, 100);

    setTimeout(() => {
      clearInterval(iv);
      setProgress(1);
      recorder.stop();
    }, duracao * 1000);
  }

  /* ── Dimensões do preview ── */
  const res    = RESOLUTIONS.find(r => r.value === resolucao) || RESOLUTIONS[0];
  const aspect = res.w / res.h;
  const pvMaxW = 680;
  const pvMaxH = 520;
  const pvW    = aspect >= pvMaxW / pvMaxH ? pvMaxW : Math.round(pvMaxH * aspect);
  const pvH    = aspect >= pvMaxW / pvMaxH ? Math.round(pvMaxW / aspect) : pvMaxH;

  const isBusy = recordStatus !== 'idle';

  return (
    <div className="p-6 max-w-[1600px] mx-auto">

      {toast && (
        <div className="fixed top-5 right-5 z-50 rounded-lg border border-white/10 bg-[#13131a]
                        px-4 py-2.5 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Criador de Vídeo</h1>
        <p className="text-sm text-white/35 mt-1">
          Cria vídeos com modelos 3D animados sobre um fundo personalizado e exporta em MP4, WebM ou GIF.
        </p>
      </div>

      <div className="flex gap-6 items-start">

        {/* ════ Configuração (40%) ════ */}
        <div className="w-[400px] shrink-0 space-y-4">

          {/* 1. Fundo */}
          <Section title="Fundo">
            <TogglePair
              value={bgType}
              options={[['imagem', 'Imagem'], ['video', 'Vídeo']]}
              onChange={v => {
                setBgType(v);
                setBgFile(null);
                if (bgUrl) URL.revokeObjectURL(bgUrl);
                setBgUrl('');
                if (bgFileRef.current) bgFileRef.current.value = '';
              }}
            />
            <div
              onClick={() => bgFileRef.current?.click()}
              className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition
                ${bgUrl ? 'border-[#4f9eff]/30 bg-[#4f9eff]/5' : 'border-white/10 hover:border-white/20'}`}
            >
              {bgUrl && bgType === 'imagem' && (
                <img src={bgUrl} alt="" className="h-10 w-16 object-cover rounded shrink-0" />
              )}
              {bgUrl && bgType === 'video' && (
                <video src={bgUrl} className="h-10 w-16 object-cover rounded shrink-0" muted />
              )}
              {!bgUrl && (
                <span className="text-2xl shrink-0">{bgType === 'imagem' ? '🖼️' : '🎬'}</span>
              )}
              <div className="flex-1 min-w-0">
                {bgFile
                  ? <p className="text-sm text-white/80 truncate">{bgFile.name}</p>
                  : <p className="text-sm text-white/30">
                      Clica para selecionar {bgType === 'imagem' ? 'JPG / PNG' : 'MP4 / WebM'}
                    </p>
                }
              </div>
              {bgFile && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setBgFile(null);
                    URL.revokeObjectURL(bgUrl);
                    setBgUrl('');
                  }}
                  className="text-white/20 hover:text-red-400 transition text-xl leading-none shrink-0"
                >×</button>
              )}
            </div>
            <input ref={bgFileRef} type="file"
              accept={bgType === 'imagem' ? 'image/jpeg,image/png' : 'video/mp4,video/webm'}
              className="hidden" onChange={handleBgFile} />
          </Section>

          {/* 2. Modelo 3D */}
          <Section title="Modelo 3D">
            <TogglePair
              value={modelSource}
              options={[['biblioteca', 'Biblioteca'], ['upload', 'Upload GLB']]}
              onChange={v => {
                setModelSource(v);
                setSelectedModelId('');
                setLibModelUrl('');
                setUploadFile(null);
                if (uploadUrl) URL.revokeObjectURL(uploadUrl);
                setUploadUrl('');
              }}
            />

            {modelSource === 'biblioteca' && (
              <select className={inputCls} value={selectedModelId}
                onChange={e => handleLibSelect(e.target.value)}>
                <option value="">Seleciona modelo da biblioteca…</option>
                {biblioteca.map(m => (
                  <option key={m.id_media_items} value={m.id_media_items}>
                    {m.titulo || `Modelo #${m.id_media_items}`}
                  </option>
                ))}
              </select>
            )}

            {modelSource === 'upload' && (
              <>
                <div
                  onClick={() => modelFileRef.current?.click()}
                  className={`flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition
                    ${uploadFile ? 'border-[#4f9eff]/30 bg-[#4f9eff]/5' : 'border-white/10 hover:border-white/20'}`}
                >
                  <span className="text-2xl shrink-0">{uploadFile ? '🧊' : '📁'}</span>
                  <div className="flex-1 min-w-0">
                    {uploadFile
                      ? <p className="text-sm text-white/80 truncate">{uploadFile.name}</p>
                      : <p className="text-sm text-white/30">Clica para selecionar .glb</p>
                    }
                  </div>
                </div>
                <input ref={modelFileRef} type="file" accept=".glb"
                  className="hidden" onChange={handleModelFile} />
              </>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-white/50">Escala</label>
                <span className="text-xs font-mono text-[#4f9eff]">{escala.toFixed(1)}</span>
              </div>
              <input type="range" min={0.1} max={35} step={0.1} value={escala}
                onChange={e => setEscala(parseFloat(e.target.value))}
                className="w-full accent-[#4f9eff] cursor-pointer" />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/50 mb-2">Animação</label>
              <div className="grid grid-cols-3 gap-1.5">
                {ANIM_OPTS.map(opt => (
                  <button key={opt.value} onClick={() => setAnimacao(opt.value)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition
                      ${animacao === opt.value
                        ? 'border-[#4f9eff] bg-[#4f9eff]/10 text-[#4f9eff]'
                        : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* 3. Formato */}
          <Section title="Formato">
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Resolução</label>
              <select className={inputCls} value={resolucao} onChange={e => setResolucao(e.target.value)}>
                {RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Duração</label>
                <select className={inputCls} value={duracao} onChange={e => setDuracao(Number(e.target.value))}>
                  {[3, 5, 10, 15].map(d => <option key={d} value={d}>{d}s</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Formato</label>
                <select className={inputCls} value={formato} onChange={e => setFormato(e.target.value)}>
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                  <option value="gif">GIF</option>
                </select>
              </div>
            </div>
          </Section>

          {/* 4. Botão gravar */}
          <div className="space-y-2">
            <button onClick={handleGravar} disabled={isBusy}
              className="w-full rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                         hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {recordStatus === 'recording'
                ? `A gravar… ${Math.round(progress * 100)}%`
                : recordStatus === 'processing'
                ? 'A processar…'
                : 'Gravar e Exportar'}
            </button>

            {isBusy && (
              <div className="space-y-1">
                <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                  {recordStatus === 'recording' ? (
                    <div className="h-full bg-[#4f9eff] rounded-full transition-all duration-100"
                      style={{ width: `${progress * 100}%` }} />
                  ) : (
                    <div className="h-full bg-[#a78bfa] rounded-full w-full animate-pulse" />
                  )}
                </div>
                {recordStatus === 'processing' && (
                  <p className="text-xs text-white/30 text-center">A processar com FFmpeg…</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ════ Preview em tempo real (60%) ════ */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="rounded-xl border border-white/8 bg-[#0c0c0f] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-medium text-white/40">
                Preview — {res.w}×{res.h}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/25">{duracao}s</span>
                <span className="text-xs font-mono text-white/25 uppercase">{formato}</span>
              </div>
            </div>

            <div className="flex items-center justify-center p-6 bg-[#080808]" style={{ minHeight: 400 }}>
              <div style={{ width: pvW, height: pvH, maxWidth: '100%' }}
                className="rounded-lg overflow-hidden">
                <Canvas
                  camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
                  gl={{ alpha: false, antialias: true, preserveDrawingBuffer: true }}
                  style={{ width: '100%', height: '100%' }}
                  onCreated={({ gl }) => { glRef.current = gl; }}
                >
                  <SceneBackground url={bgUrl} type={bgType} />
                  {bgUrl ? (
                    <ambientLight intensity={1} />
                  ) : (
                    <>
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[10, 10, 5]} intensity={1.2} />
                      <pointLight position={[0, 4, PV_Z_END]} color="#4f9eff" intensity={3} distance={60} />
                    </>
                  )}
                  {activeModelUrl && (
                    <Suspense fallback={null}>
                      <VideoModel
                        url={activeModelUrl}
                        escala={escala}
                        animacaoTipo={animacao}
                      />
                    </Suspense>
                  )}
                </Canvas>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#13131a] px-4 py-3">
            <p className="text-xs text-white/25 leading-relaxed">
              O preview atualiza automaticamente ao alterar qualquer configuração.
              A gravação captura o canvas a 30fps — aguarda o modelo carregar antes de gravar.
              O FFmpeg corre localmente no browser para converter para {formato.toUpperCase()}.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
