import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: strategies, error: sErr } = await supabase
      .from('eti_strategies')
      .select(`
        id,
        name,
        underlying,
        direction,
        primary_timeframe,
        nature,
        description,
        lifecycle_status,
        evidence_level,
        created_at,
        eti_strategy_versions(
          id,
          version_number,
          dsl_definition,
          eti_strategy_rules(
            id,
            rule_type,
            rule_nature,
            condition_code,
            parameters,
            activation_context
          )
        )
      `)
      .eq('lifecycle_status', 'STRUCTURED')
      .order('created_at', { ascending: false });

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    return NextResponse.json({
      pending_strategies: strategies || [],
      count: (strategies || []).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
