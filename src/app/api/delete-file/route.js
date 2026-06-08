import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

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

export async function POST(request) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: 'Nome do ficheiro não fornecido.' }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME ?? 'media3d-modelos';
    const r2 = getR2Client();

    // Envia a ordem de eliminação para o Cloudflare
    await r2.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileName,
      })
    );

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err) {
    console.error('[API/delete-file] Erro:', err);
    return NextResponse.json(
      { error: err.message ?? 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}