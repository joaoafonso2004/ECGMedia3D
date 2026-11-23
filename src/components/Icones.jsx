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
