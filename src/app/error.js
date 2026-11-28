'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* Página de erro: algo falhou ao gerar a página (por exemplo, a base de dados não respondeu) */
export default function Erro({ error, reset }) {
  useEffect(() => {
    console.error('[ECGMedia3D] Erro na página:', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col bg-papel text-tinta">
      <SiteHeader />

      <main className="contentor flex flex-1 flex-col justify-center py-20">
        <p className="font-mono text-[13px] font-medium text-cinza">Erro</p>
        <h1 className="mt-3 max-w-[18ch] text-[clamp(36px,5vw,60px)] font-semibold leading-[1.05] tracking-[-0.035em]">
          Algo correu mal
        </h1>
        <p className="mt-4 max-w-[52ch] text-[17px] text-tinta-2">
          Não foi possível carregar esta página. Tenta outra vez daqui a pouco.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => reset()} className="botao-acao">Tentar outra vez</button>
          <Link href="/" className="botao">Ir para o início</Link>
        </div>
        {error?.digest && <p className="mt-6 font-mono text-[12px] text-cinza">Código: {error.digest}</p>}
      </main>

      <SiteFooter />
    </div>
  );
}
