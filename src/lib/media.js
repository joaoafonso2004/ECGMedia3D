/**
 * Tipos de ficheiro das galerias públicas (projetos e biblioteca da comunidade).
 * A coluna `tipo` de media_items tem vários valores para a mesma coisa
 * (p. ex. "video", "video_externo", "video_gerado"); aqui ficam só quatro.
 */

const IMAGEM = ['imagem', 'imagem_externa', 'gif_gerado'];
const VIDEO = ['video', 'video_externo', 'video_generated', 'video_gerado'];
const MODELO = ['modelo3d', 'glb'];

const EXT_VIDEO = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;
const EXT_MODELO = /\.(glb|gltf)(\?|#|$)/i;

/** Tipo deduzido só pelo endereço: 'modelo', 'video', 'imagem' ou null */
export function tipoDoUrl(url) {
  if (!url) return null;
  if (EXT_MODELO.test(url)) return 'modelo';
  if (EXT_VIDEO.test(url)) return 'video';
  return 'imagem';
}

/** 'imagem' | 'video' | 'modelo' | 'outro' */
export function tipoMedia(item) {
  const tipo = String(item?.tipo ?? '').toLowerCase();
  if (MODELO.includes(tipo) || EXT_MODELO.test(item?.url ?? '')) return 'modelo';
  if (VIDEO.includes(tipo)) return 'video';
  if (IMAGEM.includes(tipo)) return 'imagem';
  return tipoDoUrl(item?.url) ?? 'outro';
}

export const NOME_TIPO = {
  imagem: 'Imagem',
  video: 'Vídeo',
  modelo: 'Modelo 3D',
  outro: 'Ficheiro',
};
