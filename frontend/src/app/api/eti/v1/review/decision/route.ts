import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entity_id, decision } = body;

    if (!entity_id || !decision) {
      return NextResponse.json({ error: 'entity_id and decision are required' }, { status: 400 });
    }

    const nextStatus = decision === 'APPROVED' ? 'VALIDATED' : 'ARCHIVED';

    const { error: updErr } = await supabase
      .from('eti_strategies')
      .update({
        lifecycle_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entity_id);

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      entity_id,
      new_status: nextStatus,
      decision,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
