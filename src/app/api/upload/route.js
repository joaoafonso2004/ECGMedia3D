import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

/* ─── Cliente R2 (compatível com S3) ───────────────────────────── */
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error('R2_ACCOUNT_ID não definido no .env.local');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

/* ─── Helper: Identificar o Content-Type pelo ficheiro ─────────── */
function getContentType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'glb':  return 'model/gltf-binary';
    case 'png':  return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'mp4':  return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mov':  return 'video/quicktime';
    default:     return 'application/octet-stream';
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file     = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 });
    }

    const originalName = file.name ?? 'ficheiro.bin';
    const fileNameLower = originalName.toLowerCase();

    const isAllowed =
      fileNameLower.endsWith('.glb')  ||
      fileNameLower.endsWith('.png')  ||
      fileNameLower.endsWith('.jpg')  ||
      fileNameLower.endsWith('.jpeg') ||
      fileNameLower.endsWith('.mp4')  ||
      fileNameLower.endsWith('.webm') ||
      fileNameLower.endsWith('.mov');

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Formato não suportado. Apenas GLB, PNG, JPG, MP4, WEBM ou MOV.' },
        { status: 400 }
      );
    }

    // 2. Gera nome único: timestamp + nome original (sem espaços)
    const safeName   = originalName.replace(/\s+/g, '-');
    const fileName   = `${Date.now()}-${safeName}`;
    const bucketName = process.env.R2_BUCKET_NAME ?? 'media3d-modelos';
    const publicUrl  = process.env.R2_PUBLIC_URL   ?? '';

    // 3. Obtém o Content-Type dinâmico
    const contentType = getContentType(originalName);

    // Converte para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Upload para R2
    const r2 = getR2Client();
    await r2.send(
      new PutObjectCommand({
        Bucket:      bucketName,
        Key:         fileName,
        Body:        buffer,
        ContentType: contentType,
      })
    );

    const url = `${publicUrl.replace(/\/$/, '')}/${fileName}`;

    return NextResponse.json({ url, fileName }, { status: 200 });

  } catch (err) {
    console.error('[API/upload] Erro:', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}