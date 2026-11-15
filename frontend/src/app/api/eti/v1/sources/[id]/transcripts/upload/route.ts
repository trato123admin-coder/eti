import { NextRequest, NextResponse } from 'next/server';
import {
  activeRuns,
  getBackfillStatusForSource,
  initialPendingQueue,
  normalizeDomainText,
} from '@/lib/ingestionService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const files: Array<{ filename: string; content: string }> = body?.files || [];

  const processed = [];

  for (const f of files) {
    const cleanName = (f.filename || '').replace(/\.(srt|vtt|txt)$/i, '');
    const tokens = cleanName.split(/[^a-zA-Z0-9_\-]/).filter((t) => t.length === 11);
    const matchedId = tokens.length > 0 ? tokens[0] : null;

    const normalized = normalizeDomainText(f.content || '');
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;

    if (matchedId) {
      const queueItem = initialPendingQueue.find((q) => q.videoId === matchedId);
      if (queueItem) {
        queueItem.status = 'WITH_TEXT';
        queueItem.provenance = 'USER_SRT_UPLOAD';
      }
    }

    processed.push({
      filename: f.filename,
      matched_video_id: matchedId,
      match_confidence: matchedId ? 1.0 : 0.5,
      word_count: wordCount,
      glossary_normalized: true,
      status: 'PROCESSED',
    });
  }

  const run = activeRuns[id] || (await getBackfillStatusForSource(id));
  run.funnel.withText += processed.filter((p) => p.matched_video_id).length;
  run.funnel.awaitingText = Math.max(0, run.funnel.relevant - run.funnel.withText);
  activeRuns[id] = run;

  return NextResponse.json({
    source_id: id,
    files_uploaded: files.length,
    files_matched: processed.filter((p) => p.matched_video_id).length,
    processed_items: processed,
  });
}
