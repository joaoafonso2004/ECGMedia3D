'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import CropOverlay from '@/components/CropOverlay';

/* ─── Constants ────────────────────────────────────────────────────── */
const ANIM_OPTS = [
  { value: 'none',     label: 'Sem Animação' },
  { value: 'zoom',     label: 'Zoom'         },
  { value: 'rotation', label: 'Rotação'      },
  { value: 'float',    label: 'Flutuação'    },
  { value: 'pulse',    label: 'Pulsar'       },
  { value: 'custom',   label: 'Custom'       },
];

const RATIOS = [
  { label: '16:9 — Landscape',         value: '16:9', ratio: 16 / 9  },
  { label: '9:16 — Portrait / TikTok', value: '9:16', ratio: 9  / 16 },
  { label: '1:1 — Square / Instagram', value: '1:1',  ratio: 1        },
  { label: '4:3 — Apresentações',      value: '4:3',  ratio: 4  / 3  },
  { label: 'Livre',                    value: 'free', ratio: null     },
];

const OUTPUT_RES = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '1:1':  { w: 1080, h: 1080 },
  '4:3':  { w: 1440, h: 1080 },
};

const PV_W = 640;
const PV_H = 460;

const FPS = 30;

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

/* Calcula a transformação do grupo para um dado tempo t (segundos) */
function computeTransform(t, escala, animacaoTipo) {
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
      return { pos: [0, 0, posZ], scale: sc, rotY, lookAt: [0, 0, posZ] };
    }
    case 'rotation':
      return { pos: [0, 0, PV_Z_END], scale: escala, rotY: t * 1.5, lookAt: [0, 0, PV_Z_END] };
    case 'float':
      return { pos: [0, Math.sin(t * 1.5) * 0.5, PV_Z_END], scale: escala, rotY: 0, lookAt: [0, 0, PV_Z_END] };
    case 'pulse':
      return { pos: [0, 0, PV_Z_END], scale: escala + Math.sin(t * 2) * 0.1, rotY: 0, lookAt: [0, 0, PV_Z_END] };
    default:
      return { pos: [0, 0, PV_Z_END], scale: escala, rotY: 0, lookAt: [0, 0, PV_Z_END] };
  }
}

/* ─── Estilos ─────────────────────────────────────────────────────── */
const inputCls = `w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white
  placeholder-white/20 focus:outline-none focus:border-[#4f9eff]/50 focus:ring-1
  focus:ring-[#4f9eff]/30 transition disabled:opacity-40 disabled:cursor-not-allowed`;

/* ─── Fundo da cena ───────────────────────────────────────────────── */
function SceneBackground({ url, type, onVideoReady }) {
  const { scene } = useThree();
  const videoRef  = useRef(null);

  useEffect(() => {
    if (!url) {
      scene.background = null;
      onVideoReady?.(null);
      return;
    }
    if (type === 'video') {
      const v = document.createElement('video');
      v.src = url; v.loop = true; v.muted = true; v.playsInline = true;
      v.play().catch(() => {});
      videoRef.current = v;
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      scene.background = tex;
      onVideoReady?.(v);
    } else {
      new THREE.TextureLoader().load(url, t => {
        t.colorSpace = THREE.SRGBColorSpace;
        scene.background = t;
      });
      onVideoReady?.(null);
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current = null;
        onVideoReady?.(null);
      }
      scene.background = null;
    };
  }, [url, type, scene]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (scene.background?.isVideoTexture) scene.background.needsUpdate = true;
  });

  return null;
}

/* ─── Modelo 3D animado ───────────────────────────────────────────── */
function VideoModel({ url, escala, animacaoTipo, tempoManual, rotacaoX = 0, rotacaoY = 0, rotacaoZ = 0, posicaoX = 0, posicaoY = 0 }) {
  const { scene, animations } = useGLTF(url);
  const groupRef    = useRef(null);
  const clockRef    = useRef(0);
  const autoScaleRef = useRef(1);
  const { camera } = useThree();
  const { actions, mixer } = useAnimations(animations, groupRef);

  /* Normalização automática de escala ao carregar o modelo */
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maiorDimensao = Math.max(size.x, size.y, size.z);
    if (maiorDimensao > 0) autoScaleRef.current = 2.0 / maiorDimensao;
  }, [scene]);

  /* Setup das animações internas (custom) */
  useEffect(() => {
    const all = Object.values(actions);
    if (animacaoTipo === 'custom') {
      all.forEach(a => a?.reset().play());
      // Em modo manual o mixer é avançado manualmente — paramos o tempo automático
      if (tempoManual !== null) all.forEach(a => a?.paused && (a.paused = true));
    } else {
      all.forEach(a => a?.stop());
    }
  }, [animacaoTipo, actions]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    clockRef.current = 0;
    if (groupRef.current) groupRef.current.rotation.y = 0;
  }, [animacaoTipo]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Determina o tempo total: manual (export) ou automático (preview)
    const t = tempoManual !== null ? tempoManual : (clockRef.current += delta);

    if (animacaoTipo === 'custom') {
      const all = Object.values(actions);
      if (tempoManual !== null) {
        // Avança o mixer manualmente para o tempo exato
        all.forEach(a => {
          if (!a) return;
          const dur = a.getClip().duration || 1;
          a.time = t % dur;
        });
        mixer.update(0);
      } else {
        // Automático — o mixer já avança sozinho via useAnimations
      }
      groupRef.current.position.set(posicaoX, posicaoY, PV_Z_END);
      groupRef.current.scale.setScalar(escala * autoScaleRef.current);
      camera.lookAt(0, 0, PV_Z_END);
      return;
    }

    const { pos, scale, rotY, lookAt } = computeTransform(t, escala * autoScaleRef.current, animacaoTipo);
    groupRef.current.position.set(pos[0] + posicaoX, pos[1] + posicaoY, pos[2]);
    groupRef.current.scale.setScalar(scale);
    groupRef.current.rotation.y = rotY;
    camera.lookAt(lookAt[0], lookAt[1], lookAt[2]);
  });

  return (
    <group ref={groupRef} position={[posicaoX, posicaoY, PV_Z_START]} scale={[PV_S_START, PV_S_START, PV_S_START]}>
      <group
        rotation={[
          THREE.MathUtils.degToRad(rotacaoX),
          THREE.MathUtils.degToRad(rotacaoY),
          THREE.MathUtils.degToRad(rotacaoZ),
        ]}
      >
        <primitive object={scene} />
      </group>
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
  const [bgType,          setBgType]          = useState('imagem');
  const [bgFile,          setBgFile]          = useState(null);
  const [bgUrl,           setBgUrl]           = useState('');
  const [mediaNaturalSize, setMediaNaturalSize] = useState({ w: 0, h: 0 });
  const bgFileRef = useRef();

  /* ── Modelo 3D ── */
  const [modelSource,     setModelSource]     = useState('biblioteca');
  const [biblioteca,      setBiblioteca]      = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [libModelUrl,     setLibModelUrl]     = useState('');
  const [libRotacaoX,     setLibRotacaoX]     = useState(0);
  const [libRotacaoY,     setLibRotacaoY]     = useState(0);
  const [libRotacaoZ,     setLibRotacaoZ]     = useState(0);
  const [libPosicaoX,     setLibPosicaoX]     = useState(0);
  const [libPosicaoY,     setLibPosicaoY]     = useState(0);
  const [uploadFile,      setUploadFile]      = useState(null);
  const [uploadUrl,       setUploadUrl]       = useState('');
  const [escala,          setEscala]          = useState(1.0);
  const [animacao,        setAnimacao]        = useState('zoom');
  const modelFileRef = useRef();

  /* ── Formato ── */
  const [ratioKey,      setRatioKey]      = useState('free');
  const [cropBox,       setCropBox]       = useState(null);
  const [cropResetKey,  setCropResetKey]  = useState(0);
  const [duracao,       setDuracao]       = useState(5);
  const [formato,   setFormato]   = useState('mp4');

  /* ── Gravação / Renderização ── */
  const [recordStatus, setRecordStatus] = useState('idle'); // idle | rendering | processing
  const [progress,     setProgress]     = useState(0);
  const [frameInfo,    setFrameInfo]    = useState({ atual: 0, total: 0 });
  const [toast,        setToast]        = useState('');
  const [tempoManual,  setTempoManual]  = useState(null); // null = animação automática (preview)
  const [canvasMounted, setCanvasMounted] = useState(false);

  const glRef           = useRef(null);
  const bgVideoRef      = useRef(null);
  const ffmpegRef       = useRef(null); // instância FFmpeg reutilizada entre exports
  const lastFramesRef   = useRef(0);    // nº de frames do último export (para limpeza)

  // Garante que o Canvas só renderiza no cliente (evita SSR → target.addEventListener em null)
  useEffect(() => { setCanvasMounted(true); }, []);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  /* ── URL ativa do modelo (calculada em tempo real) ── */
  const activeModelUrl  = modelSource === 'biblioteca' ? libModelUrl : uploadUrl;
  const activeRotacaoX  = modelSource === 'biblioteca' ? libRotacaoX : 0;
  const activeRotacaoY  = modelSource === 'biblioteca' ? libRotacaoY : 0;
  const activeRotacaoZ  = modelSource === 'biblioteca' ? libRotacaoZ : 0;
  const activePosicaoX  = modelSource === 'biblioteca' ? libPosicaoX : 0;
  const activePosicaoY  = modelSource === 'biblioteca' ? libPosicaoY : 0;

  /* ── Biblioteca do Supabase ── */
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase
      .from('media_items')
      .select('id_media_items, titulo, url, rotacao_x, rotacao_y, rotacao_z, posicao_x, offset_y')
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
    const objectUrl = URL.createObjectURL(f);
    setBgUrl(objectUrl);
    setMediaNaturalSize({ w: 0, h: 0 });
    if (bgType === 'imagem') {
      const img = new Image();
      img.onload = () => setMediaNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = objectUrl;
    } else {
      const v = document.createElement('video');
      v.onloadedmetadata = () => setMediaNaturalSize({ w: v.videoWidth, h: v.videoHeight });
      v.src = objectUrl;
    }
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
    const m = biblioteca.find(m => m.id_media_items == id);
    setLibModelUrl(m?.url || '');
    setLibRotacaoX(m?.rotacao_x ?? 0);
    setLibRotacaoY(m?.rotacao_y ?? 0);
    setLibRotacaoZ(m?.rotacao_z ?? 0);
    setLibPosicaoX(m?.posicao_x ?? 0);
    setLibPosicaoY(m?.offset_y  ?? 0);
  }

  /* ── Download ── */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* Espera 2 frames de animação para garantir que o R3F renderizou o novo estado */
  function waitTwoFrames() {
    return new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  /* Converte um dataURL "data:image/png;base64,XXXX" em Uint8Array */
  function dataUrlToUint8Array(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  /* ── Carrega (ou reutiliza) a instância FFmpeg ── */
  async function getFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    const { FFmpeg }        = await import('@ffmpeg/ffmpeg');
    const { toBlobURL }     = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.warn('[FFmpeg]', message));
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }

  /* ── Gravar e Exportar (frame a frame) ── */
  async function handleGravar() {
    if (!glRef.current) { showToast('Canvas não disponível.'); return; }
    if (!activeModelUrl) { showToast('Seleciona um modelo 3D primeiro.'); return; }

    const canvas = glRef.current.domElement;
    const totalFrames = duracao * FPS;

    setRecordStatus('rendering');
    setProgress(0);
    setFrameInfo({ atual: 0, total: totalFrames });

    try {
      const ffmpeg = await getFFmpeg();

      /* Limpa frames sobrantes do export anterior */
      const prevFrames = lastFramesRef.current;
      for (let i = 0; i < prevFrames; i++) {
        try { await ffmpeg.deleteFile(`frame${String(i).padStart(4, '0')}.png`); } catch {}
      }
      /* Limpa ficheiro de saída anterior para evitar falha de "overwrite" */
      for (const f of ['output.mp4', 'output.webm', 'output.gif']) {
        try { await ffmpeg.deleteFile(f); } catch {}
      }

      /* Renderiza cada frame e escreve PNG no FS virtual do FFmpeg */
      for (let i = 0; i < totalFrames; i++) {
        const frameTime = i / FPS;
        setTempoManual(frameTime);

        // Sincroniza o vídeo de fundo com o tempo exato do frame
        const bgVideo = bgVideoRef.current;
        if (bgVideo && bgVideo.duration) {
          bgVideo.pause();
          bgVideo.currentTime = frameTime % bgVideo.duration;
          await new Promise(resolve => {
            bgVideo.addEventListener('seeked', resolve, { once: true });
            setTimeout(resolve, 300); // fallback se seeked não disparar
          });
        }

        // Garante que o R3F aplicou o novo tempo e renderizou o frame
        await waitTwoFrames();

        const dataUrl = canvas.toDataURL('image/png');
        const bytes   = dataUrlToUint8Array(dataUrl);
        await ffmpeg.writeFile(`frame${String(i).padStart(4, '0')}.png`, bytes);

        setFrameInfo({ atual: i + 1, total: totalFrames });
        setProgress((i + 1) / totalFrames);
      }

      setRecordStatus('processing');

      /* Calcula o crop em pixels do canvas a partir do cropBox (percentagens) */
      const box = cropBox ?? { x: 0, y: 0, width: 1, height: 1 };
      const cW = canvas.width, cH = canvas.height;
      const cropX = Math.floor(box.x     * cW / 2) * 2;
      const cropY = Math.floor(box.y     * cH / 2) * 2;
      const cropW = Math.floor(box.width * cW / 2) * 2;
      const cropH = Math.floor(box.height* cH / 2) * 2;
      const outRes = OUTPUT_RES[ratioKey];
      const outW = outRes ? outRes.w : cropW;
      const outH = outRes ? outRes.h : cropH;
      const cropStr = `crop=${cropW}:${cropH}:${cropX}:${cropY}`;

      /* Junta os frames com o FFmpeg conforme o formato escolhido */
      if (formato === 'mp4') {
        const vf = `${cropStr},scale=${outW}:${outH},format=yuv420p`;
        const code = await ffmpeg.exec([
          '-framerate', String(FPS),
          '-i', 'frame%04d.png',
          '-c:v', 'mpeg4',
          '-q:v', '4',
          '-vf', vf,
          '-movflags', '+faststart',
          'output.mp4'
        ]);
        if (code !== 0) throw new Error(`FFmpeg MP4 saiu com código ${code}`);
        const data = await ffmpeg.readFile('output.mp4');
        downloadBlob(new Blob([data], { type: 'video/mp4' }), 'breakout-media3d.mp4');

      } else if (formato === 'webm') {
        const vf2 = `${cropStr},scale=${outW}:${outH},format=yuv420p`;
        const code = await ffmpeg.exec([
          '-framerate', String(FPS),
          '-i', 'frame%04d.png',
          '-c:v', 'libvpx',
          '-vf', vf2,
          '-b:v', '2M',
          '-auto-alt-ref', '0',
          'output.webm'
        ]);
        if (code !== 0) throw new Error(`FFmpeg WebM saiu com código ${code}`);
        const data = await ffmpeg.readFile('output.webm');
        downloadBlob(new Blob([data], { type: 'video/webm' }), 'breakout-media3d.webm');

      } else if (formato === 'gif') {
        const gifScale = bgUrl
          ? `${cropStr},fps=15,scale=480:-1:flags=lanczos`
          : `${cropStr},fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on[p];[s1][p]paletteuse=alpha_threshold=128`;
        const code = await ffmpeg.exec([
          '-framerate', String(FPS),
          '-i', 'frame%04d.png',
          '-vf', gifScale,
          'output.gif'
        ]);
        if (code !== 0) throw new Error(`FFmpeg GIF saiu com código ${code}`);
        const data = await ffmpeg.readFile('output.gif');
        downloadBlob(new Blob([data], { type: 'image/gif' }), 'breakout-media3d.gif');
      }

      showToast('Exportação concluída!');
    } catch (err) {
      console.error('Erro na renderização:', err);
      showToast('Ocorreu um erro durante a exportação.');
    } finally {
      /* Limpa frames do FS virtual — sempre, mesmo em caso de erro */
      const ffmpeg = ffmpegRef.current;
      if (ffmpeg) {
        for (let i = 0; i < totalFrames; i++) {
          try { await ffmpeg.deleteFile(`frame${String(i).padStart(4, '0')}.png`); } catch {}
        }
      }
      lastFramesRef.current = totalFrames;
      setTempoManual(null);
      bgVideoRef.current?.play().catch(() => {});
      setRecordStatus('idle');
      setProgress(0);
      setFrameInfo({ atual: 0, total: 0 });
    }
  }

  /* ── Ratio: snap + reset ao mudar preset ── */
  function handleRatioChange(key) {
    setRatioKey(key);
    setCropResetKey(k => k + 1);
  }

  const activeRatio = RATIOS.find(r => r.value === ratioKey)?.ratio ?? null;

  /* ── Dimensões do preview (contain-fit ao aspect ratio do media) ── */
  const pvW = (() => {
    if (!bgUrl || !mediaNaturalSize.w) return PV_W;
    const a = mediaNaturalSize.w / mediaNaturalSize.h;
    return a >= PV_W / PV_H ? PV_W : Math.round(PV_H * a);
  })();
  const pvH = (() => {
    if (!bgUrl || !mediaNaturalSize.w) return PV_H;
    const a = mediaNaturalSize.w / mediaNaturalSize.h;
    return a >= PV_W / PV_H ? Math.round(PV_W / a) : PV_H;
  })();

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
                setMediaNaturalSize({ w: 0, h: 0 });
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
                    setMediaNaturalSize({ w: 0, h: 0 });
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
                <span className="text-xs font-mono text-[#4f9eff]">{escala.toFixed(1)}x</span>
              </div>
              <input type="range" min={0.1} max={5} step={0.1} value={escala}
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
              <label className="block text-xs font-medium text-white/50 mb-1.5">Ratio de Saída</label>
              <select className={inputCls} value={ratioKey} onChange={e => handleRatioChange(e.target.value)}>
                {RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <p className="mt-1.5 text-[11px] text-white/25">
                Arrasta e faz zoom no preview para enquadrar · duplo clique para centrar
              </p>
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
            <button
              onClick={() => setCropResetKey(k => k + 1)}
              className="w-full rounded-lg border border-white/10 py-2 text-xs text-white/40
                         hover:text-white/70 hover:border-white/20 transition"
            >
              Centrar
            </button>
          </Section>

          {/* 4. Botão gravar */}
          <div className="space-y-2">
            <button onClick={handleGravar} disabled={isBusy}
              className="w-full rounded-lg bg-[#4f9eff] py-2.5 text-sm font-semibold text-white
                         hover:bg-[#3d8aef] transition disabled:opacity-50 disabled:cursor-not-allowed">
              {recordStatus === 'rendering'
                ? `A renderizar frame ${frameInfo.atual} de ${frameInfo.total} (${Math.round(progress * 100)}%)`
                : recordStatus === 'processing'
                ? 'A processar com FFmpeg…'
                : 'Gravar e Exportar'}
            </button>

            {isBusy && (
              <div className="space-y-1">
                <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                  {recordStatus === 'rendering' ? (
                    <div className="h-full bg-[#4f9eff] rounded-full transition-all duration-100"
                      style={{ width: `${progress * 100}%` }} />
                  ) : (
                    <div className="h-full bg-[#a78bfa] rounded-full w-full animate-pulse" />
                  )}
                </div>
                {recordStatus === 'processing' && (
                  <p className="text-xs text-white/30 text-center">A juntar frames com FFmpeg…</p>
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
                Preview — {OUTPUT_RES[ratioKey] ? `${OUTPUT_RES[ratioKey].w}×${OUTPUT_RES[ratioKey].h}` : 'Livre'}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/25">{duracao}s</span>
                <span className="text-xs font-mono text-white/25 uppercase">{formato}</span>
              </div>
            </div>

            <div className="flex items-center justify-center p-6 bg-[#080808]" style={{ minHeight: 400 }}>
              <div
                style={{
                  width: pvW, height: pvH, maxWidth: '100%',
                  position: 'relative',
                  background: bgUrl
                    ? undefined
                    : 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 16px 16px',
                }}
                className={`rounded-lg overflow-hidden${bgUrl ? ' bg-[#0c0c0f]' : ''}`}
              >
                {canvasMounted ? (
                  <Canvas
                    camera={{ position: [0, 1, 0], fov: 45, near: 0.1, far: 200 }}
                    gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.NoToneMapping }}
                    style={{ width: '100%', height: '100%' }}
                    onCreated={({ gl }) => {
                      glRef.current = gl;
                      gl.toneMapping = THREE.NoToneMapping;
                      gl.outputColorSpace = THREE.SRGBColorSpace;
                    }}
                  >
                    <SceneBackground url={bgUrl} type={bgType} onVideoReady={v => { bgVideoRef.current = v; }} />
                    {activeModelUrl && (
                      <Suspense fallback={null}>
                        <VideoModel
                          url={activeModelUrl}
                          escala={escala}
                          animacaoTipo={animacao}
                          tempoManual={tempoManual}
                          rotacaoX={activeRotacaoX}
                          rotacaoY={activeRotacaoY}
                          rotacaoZ={activeRotacaoZ}
                          posicaoX={activePosicaoX}
                          posicaoY={activePosicaoY}
                        />
                      </Suspense>
                    )}
                  </Canvas>
                ) : (
                  <div className="w-full h-full bg-[#0c0c0f]" />
                )}
                <CropOverlay
                  containerWidth={pvW}
                  containerHeight={pvH}
                  ratio={activeRatio}
                  initRatio={activeRatio}
                  resetKey={cropResetKey}
                  onChange={setCropBox}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#13131a] px-4 py-3">
            <p className="text-xs text-white/25 leading-relaxed">
              O preview atualiza automaticamente ao alterar qualquer configuração.
              A exportação renderiza cada frame individualmente a {FPS}fps garantindo qualidade
              constante independentemente do desempenho do computador.
              O FFmpeg corre localmente no browser para gerar o ficheiro final em {formato.toUpperCase()}.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}