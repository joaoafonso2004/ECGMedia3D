/* Ícones de linha usados nas páginas públicas (decorativos: aria-hidden) */

function Svg({ tamanho = 16, className = '', children, espessura = 1.8 }) {
  return (
    <svg
      aria-hidden="true"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconeCubo(p) {
  return (
    <Svg {...p}>
      <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </Svg>
  );
}

export function IconeParar(p) {
  return (
    <Svg {...p}>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconeFechar(p) {
  return <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
}

export function IconeAnterior(p) {
  return <Svg {...p}><path d="m15 5-7 7 7 7" /></Svg>;
}

export function IconeSeguinte(p) {
  return <Svg {...p}><path d="m9 5 7 7-7 7" /></Svg>;
}

export function IconePlay(p) {
  return (
    <Svg {...p}>
      <path d="M8 5.5v13l10.5-6.5L8 5.5Z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconeEcraInteiro(p) {
  return <Svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Svg>;
}

export function IconeSairEcraInteiro(p) {
  return <Svg {...p}><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></Svg>;
}

export function IconePesquisa(p) {
  return <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
}

/* Ícones dos painéis (formulários de envio, listas e mensagens) */
export function IconeImagem(p) {
  return <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-9 9" /></Svg>;
}
export function IconeVideo(p) {
  return <Svg {...p}><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></Svg>;
}
export function IconePasta(p) {
  return <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></Svg>;
}
export function IconeCarregar(p) {
  return <Svg {...p}><path d="M12 15V4m0 0L8 8m4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></Svg>;
}
export function IconeEspera(p) {
  return <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
}
export function IconeAviso(p) {
  return <Svg {...p}><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4M12 17h.01" /></Svg>;
}
export function IconeVisto(p) {
  return <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>;
}

/* Modo claro / escuro */
export function IconeSol(p) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}
export function IconeLua(p) {
  return <Svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></Svg>;
}
