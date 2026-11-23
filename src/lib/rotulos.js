/**
 * Rótulos de ano e semestre usados nas páginas públicas.
 * Aceitam números (1 → "1.º ano") ou texto livre, que é mostrado tal como está.
 */

const numero = v => v !== null && v !== '' && !isNaN(Number(v));

/** "2.º ano"; sem valor: "Sem ano" */
export function rotuloAno(ano) {
  if (ano == null || ano === '') return 'Sem ano';
  return numero(ano) ? `${Number(ano)}.º ano` : String(ano);
}

/** "1.º semestre"; sem valor: "Sem semestre" */
export function rotuloSemestre(semestre) {
  if (semestre == null || semestre === '') return 'Sem semestre';
  return numero(semestre) ? `${Number(semestre)}.º semestre` : String(semestre);
}

/** Versão curta para os filtros: "1.º sem." */
export function rotuloSemestreCurto(semestre) {
  return numero(semestre) ? `${Number(semestre)}.º sem.` : rotuloSemestre(semestre);
}

/** "2.º ano · 1.º semestre", só com os valores que existem */
export function anoSemestre(ano, semestre) {
  return [
    ano != null && ano !== '' ? rotuloAno(ano) : null,
    semestre != null && semestre !== '' ? rotuloSemestre(semestre) : null,
  ].filter(Boolean).join(' · ');
}
