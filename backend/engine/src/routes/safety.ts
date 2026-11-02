import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../plugins/supabase.js';
import { authenticate, requireRole } from '../plugins/auth.js';

let EMERGENCY_HALT = false;
let HALT_REASON = 'NORMAL_OPERATIONS';
let HALTED_AT: string | null = null;

export function isEmergencyHaltActive(): boolean {
  return EMERGENCY_HALT;
}

export function getEmergencyHaltReason(): string {
  return HALT_REASON;
}

export async function safetyRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/eti/v1/safety/kill-switch
   * Interruptor de emergencia general (Sprint ETI-S10 / Hardening)
   * Desactiva inmediatamente cualquier recomendación hacia eTrade
   */
  fastify.post(
    '/api/eti/v1/safety/kill-switch',
    { preHandler: [requireRole(['owner', 'admin'])] },
    async (request: FastifyRequest<{ Body: { activate: boolean; reason?: string } }>, reply: FastifyReply) => {
      const { activate, reason } = request.body || {};

      EMERGENCY_HALT = !!activate;
      HALT_REASON = activate ? (reason || 'CIRCUIT_BREAKER_TRIGGERED') : 'NORMAL_OPERATIONS';
      HALTED_AT = activate ? new Date().toISOString() : null;

      // Registrar evento de seguridad en app_auth_events
      await supabaseAdmin.from('app_auth_events').insert({
        user_id: request.user?.id || null,
        event_type: activate ? 'KILL_SWITCH_ACTIVATED' : 'KILL_SWITCH_DEACTIVATED',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'] || 'ETI_SYSTEM',
        metadata: {
          halt_reason: HALT_REASON,
          halted_by: request.user?.email,
          timestamp: new Date().toISOString(),
        },
      });

      fastify.log.warn(`🚨 [SAFETY CIRCUIT BREAKER] Kill-Switch ${activate ? 'ACTIVADO' : 'DESACTIVADO'}. Razón: ${HALT_REASON}`);

      return reply.send({
        status: 'updated',
        emergency_halt_active: EMERGENCY_HALT,
        reason: HALT_REASON,
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * GET /api/eti/v1/telemetry/health
   * Métricas profundas de observabilidad y telemetría del sistema
   */
  fastify.get('/api/eti/v1/telemetry/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const mem = process.memoryUsage();

    const [
      { count: candidatesCount },
      { count: tradesCount },
      { count: strategiesCount },
      { count: rulesCount },
    ] = await Promise.all([
      supabaseAdmin.from('eti_experience_candidates').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('eti_experience_trades').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('eti_strategies').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('eti_strategy_rules').select('*', { count: 'exact', head: true }),
    ]);

    return reply.send({
      service: 'eTrade Trading Intelligence (ETI) Engine',
      version: '2.1.0',
      status: EMERGENCY_HALT ? 'CIRCUIT_BREAKER_HALTED' : 'HEALTHY',
      emergency_halt: {
        active: EMERGENCY_HALT,
        reason: HALT_REASON,
        halted_at: HALTED_AT,
      },
      system: {
        uptime_seconds: Math.floor(process.uptime()),
        memory_heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
        node_version: process.version,
      },
      telemetry: {
        total_strategies: strategiesCount || 0,
        total_rules: rulesCount || 0,
        experience_ledger_candidates: candidatesCount || 0,
        experience_ledger_trades: tradesCount || 0,
        integrity_guarantee: 'APPEND_ONLY_POSTGRES_TRIGGERS',
      },
      timestamp: new Date().toISOString(),
    });
  });
}
