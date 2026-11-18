import Link from 'next/link';
import { MarcaRGB } from './SiteHeader';

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-linha bg-superficie">
      <div className="contentor grid gap-7 pt-12 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-tinta">
            <MarcaRGB />
            ECGMedia3D
          </Link>
          <p className="mt-3 max-w-[36ch] text-[15px] text-tinta-2">
            Plataforma de visualização 3D dos projetos dos alunos de Engenharia da Computação Gráfica e Multimédia.
          </p>
        </div>
        <div>
          <h2 className="mb-2.5 text-[13px] font-medium text-cinza">Explorar</h2>
          <Link href="/#instituicoes" className="block py-1 text-[15px] text-tinta-2 hover:text-acao">Instituições</Link>
          <Link href="/#como-funciona" className="block py-1 text-[15px] text-tinta-2 hover:text-acao">Como funciona</Link>
        </div>
        <div>
          <h2 className="mb-2.5 text-[13px] font-medium text-cinza">Plataforma</h2>
          <Link href="/admin/login" className="block py-1 text-[15px] text-tinta-2 hover:text-acao">Entrar</Link>
        </div>
      </div>
      <div className="contentor mt-10 flex flex-wrap justify-between gap-4 border-t border-linha py-5 text-[13px] text-cinza">
        <span className="inline-flex items-baseline gap-2.5">
          <b className="text-[19px] font-bold tracking-tight text-tinta">unipvc</b>
          Universidade Politécnica de Viana do Castelo
        </span>
        <span>© {new Date().getFullYear()} ECGMedia3D</span>
      </div>
    </footer>
  );
}
