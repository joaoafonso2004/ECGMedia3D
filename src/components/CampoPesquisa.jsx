'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Campo da página de pesquisa: os resultados atualizam-se enquanto se
 * escreve (o termo vai para o URL, ?q=, e a página volta a pesquisar).
 */
export default function CampoPesquisa({ termoInicial = '' }) {
  const router = useRouter();
  const [valor, setValor] = useState(termoInicial);
  const [focado, setFocado] = useState(false);
  const [visto, setVisto] = useState(termoInicial);
  const [aPesquisar, iniciar] = useTransition();

  // O URL mudou sem ser por escrita no campo (voltar atrás, link de sugestão)
  if (termoInicial !== visto) {
    setVisto(termoInicial);
    if (!focado) setValor(termoInicial);
  }

  function pesquisar(texto) {
    const t = texto.trim();
    const url = t ? `/pesquisa?q=${encodeURIComponent(t)}` : '/pesquisa';
    iniciar(() => router.replace(url, { scroll: false }));
  }

  useEffect(() => {
    if (valor.trim() === termoInicial.trim()) return;
    const espera = setTimeout(() => pesquisar(valor), 250);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, termoInicial]);

  return (
    <form
      role="search"
      action="/pesquisa"
      onSubmit={e => { e.preventDefault(); pesquisar(valor); }}
      className="relative"
    >
      <label htmlFor="pesquisa-termo" className="sr-only">Pesquisar</label>
      <svg
        aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cinza"
      >
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="pesquisa-termo"
        name="q"
        type="search"
        value={valor}
        onChange={e => setValor(e.target.value)}
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
        autoFocus={!termoInicial}
        autoComplete="off"
        spellCheck="false"
        enterKeyHint="search"
        placeholder="Projetos, disciplinas, autores…"
        className="h-14 w-full rounded-xl border border-linha-2 bg-superficie pl-12 pr-24 text-lg text-tinta
                   placeholder:text-cinza focus:border-acao focus:outline-none focus:ring-3 focus:ring-acao/15
                   [&::-webkit-search-cancel-button]:appearance-none"
      />
      <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {aPesquisar && (
          <span
            role="status" aria-label="A pesquisar"
            className="size-4 animate-spin rounded-full border-2 border-acao/25 border-t-acao"
          />
        )}
        {valor && (
          <button
            type="button"
            onClick={() => { setValor(''); pesquisar(''); }}
            aria-label="Limpar pesquisa"
            className="grid size-9 place-items-center rounded-lg text-cinza hover:bg-mosaico hover:text-tinta"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        )}
      </span>
    </form>
  );
}
