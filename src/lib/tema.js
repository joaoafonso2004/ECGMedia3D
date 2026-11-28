/**
 * Modo claro / escuro.
 * A escolha fica guardada no browser (localStorage, chave "tema": "claro" | "escuro").
 * Sem escolha guardada, o site abre no modo claro.
 */

/** Script do <head>: repõe a escolha guardada antes de a página ser pintada (não pisca) */
export const SCRIPT_TEMA =
  "try{if(localStorage.getItem('tema')==='escuro')document.documentElement.classList.add('dark')}catch(e){}";
