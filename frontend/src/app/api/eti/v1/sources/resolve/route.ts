import { NextRequest, NextResponse } from 'next/server';
import { resolveYouTubeSource } from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body?.input || '';
    if (!input.trim()) {
      return NextResponse.json({ error: 'El parámetro "input" es requerido.' }, { status: 400 });
    }

    const result = await resolveYouTubeSource(input);
    if (result.status === 'NOT_FOUND') {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Error interno al resolver canal de YouTube.' },
      { status: 500 }
    );
  }
}
