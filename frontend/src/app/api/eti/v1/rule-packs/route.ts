import { NextResponse } from 'next/server';
import { rulePacksStore } from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    rule_packs: Object.values(rulePacksStore),
  });
}
