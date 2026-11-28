'use client';

import { IconeLua, IconeSol } from './Icones';

/**
 * Botão de modo claro / escuro (lua no modo claro, sol no modo escuro).
 * Põe ou tira a classe .dark do <html> e guarda a escolha no browser.
 * O ícone certo aparece só com CSS (dark:), por isso não pisca ao carregar.
 */
export default function BotaoTema({ className = '' }) {
  function aplicar(escuro) {
    document.documentElement.classList.toggle('dark', escuro);
    try {
      localStorage.setItem('tema', escuro ? 'escuro' : 'claro');
    } catch {
      // Sem acesso ao armazenamento (modo privado): muda só nesta visita
    }
  }

  /* A mudança é gradual (fade), exceto para quem pediu menos movimento no sistema */
  function alternar() {
    const html = document.documentElement;
    const escuro = !html.classList.contains('dark');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      aplicar(escuro);
      return;
    }

    // Browsers com View Transitions: a página inteira (3D incluído) passa de um modo ao outro
    if (document.startViewTransition) {
      document.startViewTransition(() => aplicar(escuro));
      return;
    }

    // Os restantes: as cores mudam com uma transição CSS, só durante a troca
    html.classList.add('tema-a-mudar');
    aplicar(escuro);
    setTimeout(() => html.classList.remove('tema-a-mudar'), 500);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Mudar entre modo claro e modo escuro"
      title="Modo claro / escuro"
      className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-linha-2 bg-superficie
                  text-tinta transition-colors hover:border-tinta ${className}`}
    >
      <IconeLua tamanho={17} className="dark:hidden" />
      <IconeSol tamanho={17} className="hidden dark:block" />
    </button>
  );
}
