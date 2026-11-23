import Link from 'next/link';

/**
 * Caminho até à página atual ("Início / IPVC / ECGM / Modelação 3D").
 *
 * itens: [{ href, label }]; o último é a página atual e não tem link.
 * Se não couber no telemóvel, faz scroll na horizontal.
 * Com `voltar`, no telemóvel mostra só o link para o nível de cima ("‹ Modelação 3D").
 */
export default function Localizacao({ itens, voltar = false }) {
  const pai = itens.at(-2);

  return (
    <nav aria-label="Localização" className="text-sm text-cinza">
      {voltar && pai?.href && (
        <Link href={pai.href} className="inline-flex items-center gap-1.5 py-1 hover:text-tinta hover:underline sm:hidden">
          <span aria-hidden="true">‹</span>{pai.label}
        </Link>
      )}
      <ol
        className={`${voltar ? 'hidden sm:flex' : 'flex'} -mx-4 gap-2 overflow-x-auto whitespace-nowrap px-4
                    [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0`}
      >
        {itens.map((item, i) => (
          <li key={`${i}-${item.label}`} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-tinta hover:underline">{item.label}</Link>
            ) : (
              <span aria-current="page" className="text-tinta">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
