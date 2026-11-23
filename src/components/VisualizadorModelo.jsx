'use client';

/**
 * Visualizador de um modelo 3D (GLB) com controlos: arrastar roda o modelo,
 * a roda do rato ou a pinça fazem zoom, duplo clique/toque repõe a vista.
 *
 * Usado na página do projeto e no ecrã inteiro das galerias. Tem o seu próprio
 * canvas, por isso só se usa em páginas sem os cartões de hover (que partilham
 * o canvas global).
 *
 * Em telemóveis com poupança de dados ou pouca memória, o modelo só é
 * carregado quando se toca em "Carregar modelo 3D".
 *
 * Só de cliente (importar com next/dynamic e ssr: false). Para mudar de
 * modelo, dar-lhe outra `key`, para o estado (progresso, vista) recomeçar.
 */

import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { IconeCubo, IconeEcraInteiro, IconeSairEcraInteiro } from './Icones';
import LuzEstudio from './LuzEstudio';

const CHAVE_DICA = 'ecgm-dica-3d-vista';
const POSICAO_INICIAL = [2.6, 1.5, 3.6];
const FOV = 40;

/* ─── Erros a carregar o GLB ───────────────────────────────────── */
class LimiteErro extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }
  static getDerivedStateFromError(erro) {
    return { erro };
  }
  render() {
    return this.state.erro ? this.props.alternativa : this.props.children;
  }
}

/* ─── Modelo: normalizado para ~2 unidades e centrado na origem ── */
function Modelo({ url, onPronto }) {
  const { scene, animations } = useGLTF(url);
  const copia = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const grupo = useRef(null);
  const { actions } = useAnimations(animations, grupo);

  const { escala, centro, base } = useMemo(() => {
    const caixa = new THREE.Box3().setFromObject(copia);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const meio = caixa.getCenter(new THREE.Vector3());
    const s = 2 / (Math.max(tamanho.x, tamanho.y, tamanho.z) || 1);
    return { escala: s, centro: meio, base: (-tamanho.y * s) / 2 };
  }, [copia]);

  /* Animação do próprio ficheiro (p. ex. um rig): toca a primeira.
     Tocar todas ao mesmo tempo mistura-as (andar + correr + parado). */
  useEffect(() => {
    const primeira = animations[0] ? actions[animations[0].name] : null;
    primeira?.reset().play();
    return () => { primeira?.stop(); };
  }, [actions, animations]);

  useEffect(() => { onPronto(); }, [onPronto]);

  return (
    <>
      <group ref={grupo} scale={escala}>
        <group position={[-centro.x, -centro.y, -centro.z]}>
          <primitive object={copia} />
        </group>
      </group>
      {/* Sombra de contacto: calculada uma vez (a câmara é que roda, não o modelo) */}
      <ContactShadows position={[0, base - 0.002, 0]} scale={6} blur={2.4} far={2.5} opacity={0.35} resolution={512} frames={1} />
    </>
  );
}

/* Ecrã ao alto (telemóvel em ecrã inteiro): abre o ângulo para o modelo caber na largura */
function AjustarCamara() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspeto = size.width / size.height;
    const base = THREE.MathUtils.degToRad(FOV);
    // eslint-disable-next-line react-hooks/immutability -- a câmara do three.js altera-se diretamente
    camera.fov = aspeto < 1
      ? Math.min(80, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(base / 2) / aspeto)))
      : FOV;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/* ─── Enquanto o ficheiro carrega ──────────────────────────────────
   Sem percentagem: o gestor de carregamento do three.js conta ficheiros,
   não bytes, e um GLB é um só ficheiro (ficaria em 0% até ao fim). */
function Progresso({ escuro }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="w-56 text-center" role="status">
        <p className={`text-sm font-medium ${escuro ? 'text-white' : 'text-tinta'}`}>A carregar modelo 3D…</p>
        <div className={`mt-2.5 h-1.5 animate-pulse rounded-full ${escuro ? 'bg-white/30' : 'bg-tinta/15'}`} />
      </div>
    </div>
  );
}

/* Telemóvel em poupança de dados ou com pouca memória: não carrega sozinho */
function deveEsperar() {
  if (typeof navigator === 'undefined') return false;
  const ligacao = navigator.connection;
  return Boolean(ligacao?.saveData) || (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2);
}

function formatarTamanho(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Botao({ onClick, ativo, children, rotulo, escuro }) {
  const cores = escuro
    ? (ativo ? 'border-white bg-white text-tinta' : 'border-white/20 bg-white/10 text-white hover:border-white/50')
    : (ativo ? 'border-tinta bg-tinta text-papel' : 'border-linha-2 bg-superficie text-tinta hover:border-tinta');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      aria-label={rotulo}
      className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${cores}`}
    >
      {children}
    </button>
  );
}

/* ─── Componente principal ────────────────────────────────────── */
export default function VisualizadorModelo({ url, imagem = null, titulo = 'Modelo 3D', escuro = false, className = '' }) {
  const caixaRef = useRef(null);
  const controlosRef = useRef(null);

  const [pedido, setPedido] = useState(() => !deveEsperar());
  const [tamanho, setTamanho] = useState(null);
  const [pronto, setPronto] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [rodar, setRodar] = useState(true);
  const [ecraInteiro, setEcraInteiro] = useState(false);
  const [pseudoEcra, setPseudoEcra] = useState(false); // iPhone: sem Fullscreen API para elementos
  const [toque] = useState(() => window.matchMedia('(hover: none)').matches);
  /* Dica dos gestos: só na primeira visita (componente só de cliente: pode ler o localStorage já) */
  const [dica, setDica] = useState(() => {
    try { return !localStorage.getItem(CHAVE_DICA); } catch { return true; }
  });

  const marcarPronto = useCallback(() => setPronto(true), []);

  function esconderDica() {
    if (!dica) return;
    setDica(false);
    try { localStorage.setItem(CHAVE_DICA, '1'); } catch {}
  }

  /* Tamanho do ficheiro para o botão "Carregar modelo 3D" (se o servidor o disser) */
  useEffect(() => {
    if (pedido || !url) return;
    let ativo = true;
    fetch(url, { method: 'HEAD' })
      .then(r => Number(r.headers.get('content-length')) || null)
      .then(n => { if (ativo) setTamanho(n); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [pedido, url]);

  /* Ecrã inteiro */
  useEffect(() => {
    const mudou = () => setEcraInteiro(document.fullscreenElement === caixaRef.current);
    document.addEventListener('fullscreenchange', mudou);
    return () => document.removeEventListener('fullscreenchange', mudou);
  }, []);
  useEffect(() => {
    if (!pseudoEcra) return;
    const tecla = e => { if (e.key === 'Escape') { e.stopPropagation(); setPseudoEcra(false); } };
    window.addEventListener('keydown', tecla, true);
    return () => window.removeEventListener('keydown', tecla, true);
  }, [pseudoEcra]);

  async function alternarEcra() {
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    if (pseudoEcra) { setPseudoEcra(false); return; }
    const el = caixaRef.current;
    if (el?.requestFullscreen) {
      try { await el.requestFullscreen(); return; } catch { /* segue para a alternativa */ }
    }
    setPseudoEcra(true);
  }

  function zoom(fator) {
    const c = controlosRef.current;
    if (!c) return;
    const distancia = c.object.position.clone().sub(c.target).multiplyScalar(fator);
    c.object.position.copy(c.target).add(distancia);
    c.update();
  }
  function reporVista() {
    controlosRef.current?.reset();
    setRodar(true);
  }
  function tentarOutraVez() {
    useGLTF.clear(url);
    setPronto(false);
    setTentativa(n => n + 1);
  }

  const cheio = ecraInteiro || pseudoEcra;
  const fundo = escuro ? 'bg-white/[0.04]' : 'bg-mosaico';
  const textoFraco = escuro ? 'text-white/70' : 'text-tinta-2';

  /* Imagem do projeto, para quando o modelo não carrega (ou ainda não foi pedido) */
  const imagemFundo = imagem && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imagem} alt="" className="absolute inset-0 size-full object-cover opacity-60" />
  );

  const falhou = (
    <div className="absolute inset-0 grid place-items-center p-6">
      {imagemFundo}
      <div className={`relative rounded-xl px-5 py-4 text-center ${escuro ? 'bg-black/60 text-white' : 'bg-superficie/95 text-tinta shadow-sm'}`}>
        <p className="text-sm font-medium">Não foi possível carregar o modelo 3D.</p>
        <button type="button" onClick={tentarOutraVez} className="mt-2 text-sm font-medium text-acao underline-offset-4 hover:underline">
          Tentar outra vez
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={caixaRef}
      className={`overflow-hidden ${cheio ? `fixed inset-0 z-[200] ${escuro ? 'bg-tinta' : 'bg-papel'}` : `relative ${fundo} ${className}`}`}
    >
      {!pedido ? (
        /* Poupança de dados: só carrega quando a pessoa pede */
        <div className="absolute inset-0 grid place-items-center p-6">
          {imagemFundo}
          <button
            type="button"
            onClick={() => setPedido(true)}
            className="relative inline-flex h-11 items-center gap-2 rounded-lg bg-tinta px-5 text-sm font-medium text-papel shadow-sm"
          >
            <IconeCubo tamanho={16} />
            Carregar modelo 3D{tamanho ? ` (${formatarTamanho(tamanho)})` : ''}
          </button>
        </div>
      ) : (
        <LimiteErro key={`${url}-${tentativa}`} alternativa={falhou}>
          <Canvas
            dpr={[1, toque ? 1.5 : 2]}
            camera={{ position: POSICAO_INICIAL, fov: FOV, near: 0.05, far: 100 }}
            gl={{ alpha: true, antialias: true }}
            onPointerDown={esconderDica}
            onDoubleClick={reporVista}
            aria-label={titulo}
            role="img"
          >
            <AjustarCamara />
            <LuzEstudio />
            <Suspense fallback={null}>
              <Modelo url={url} onPronto={marcarPronto} />
            </Suspense>
            <OrbitControls
              ref={controlosRef}
              makeDefault
              enableDamping
              enablePan={false}
              autoRotate={rodar && pronto}
              autoRotateSpeed={1.1}
              minDistance={1.6}
              maxDistance={9}
              onStart={() => setRodar(false)}
            />
          </Canvas>
          {!pronto && <Progresso escuro={escuro} />}
        </LimiteErro>
      )}

      {/* Dica dos gestos (primeira visita) */}
      {pedido && pronto && dica && (
        <p className={`pointer-events-none absolute left-3 top-3 rounded-full border px-3 py-1 text-xs
                       ${escuro ? 'border-white/15 bg-black/50 text-white/80' : 'border-linha-2 bg-superficie/90 text-tinta-2'}`}>
          {toque ? 'Arrastar: rodar · Pinça: zoom · Duplo toque: repor' : 'Arrastar: rodar · Roda do rato: zoom'}
        </p>
      )}

      {/* Ecrã inteiro: sempre visível (no telemóvel é o único controlo) */}
      {pedido && (
        <button
          type="button"
          onClick={alternarEcra}
          aria-label={cheio ? 'Sair do ecrã inteiro' : 'Ecrã inteiro'}
          className={`absolute right-3 top-3 grid size-10 place-items-center rounded-lg border
                      ${escuro ? 'border-white/15 bg-black/50 text-white' : 'border-linha-2 bg-superficie/95 text-tinta hover:border-tinta'}`}
        >
          {cheio ? <IconeSairEcraInteiro tamanho={18} /> : <IconeEcraInteiro tamanho={18} />}
        </button>
      )}

      {/* Controlos (computador) */}
      {pedido && pronto && (
        <div className="absolute inset-x-3 bottom-3 hidden flex-wrap items-center gap-2 sm:flex">
          <Botao escuro={escuro} onClick={() => setRodar(r => !r)} ativo={rodar} rotulo="Rodar automaticamente">Rodar</Botao>
          <Botao escuro={escuro} onClick={() => zoom(0.8)}>Zoom +</Botao>
          <Botao escuro={escuro} onClick={() => zoom(1.25)}>Zoom −</Botao>
          <Botao escuro={escuro} onClick={reporVista}>Repor vista</Botao>
          <span className={`ml-auto hidden text-xs md:inline ${textoFraco}`}>Modelo 3D (GLB)</span>
        </div>
      )}
    </div>
  );
}
