import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Página não encontrada — ECGMedia3D',
};

/* Página 404: o endereço não existe ou o conteúdo foi removido */
export default function NaoEncontrado() {
  return (
    <div className="flex min-h-dvh flex-col bg-papel text-tinta">
      <SiteHeader />

      <main className="contentor flex flex-1 flex-col justify-center py-20">
        <p className="font-mono text-[13px] font-medium text-cinza">Erro 404</p>
        <h1 className="mt-3 max-w-[18ch] text-[clamp(36px,5vw,60px)] font-semibold leading-[1.05] tracking-[-0.035em]">
          Página não encontrada
        </h1>
        <p className="mt-4 max-w-[52ch] text-[17px] text-tinta-2">
          O endereço pode estar errado, ou o conteúdo foi removido ou mudou de sítio.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="botao-acao">Ir para o início</Link>
          <Link href="/pesquisa" className="botao">Pesquisar na plataforma</Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
