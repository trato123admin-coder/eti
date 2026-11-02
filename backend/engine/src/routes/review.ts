import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../plugins/supabase.js';
import { authenticate, requireRole } from '../plugins/auth.js';

export async function reviewRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/eti/v1/review/queue
   * Lista todas las extracciones pendientes de revisión humana
   */
  fastify.get(
    '/api/eti/v1/review/queue',
    { preHandler: [requireRole(['owner', 'admin', 'reviewer'])] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // 1. Obtener estrategias estructuradas pendientes de validación
      const { data: strategies, error: sErr } = await supabaseAdmin
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
        return reply.status(500).send({ error: sErr.message });
      }

      // 2. Obtener operaciones declaradas pendientes de auditoría
      const { data: operations, error: oErr } = await supabaseAdmin
        .from('eti_operations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (oErr) {
        return reply.status(500).send({ error: oErr.message });
      }

      return reply.send({
        pending_strategies_count: strategies?.length || 0,
        pending_strategies: strategies || [],
        recent_operations: operations || [],
      });
    }
  );

  /**
   * POST /api/eti/v1/review/decision
   * Registra la decisión humana (Aprobar, Modificar, Rechazar) sobre una regla o estrategia
   */
  fastify.post(
    '/api/eti/v1/review/decision',
    { preHandler: [requireRole(['owner', 'admin', 'reviewer'])] },
    async (request: FastifyRequest<{
      Body: {
        entity_type: 'STRATEGY' | 'RULE' | 'OPERATION';
        entity_id: string;
        decision: 'APPROVED' | 'MODIFIED' | 'REJECTED' | 'UNCERTAIN';
        modifications?: any;
        notes?: string;
      }
    }>, reply: FastifyReply) => {
      const { entity_type, entity_id, decision, modifications, notes } = request.body;

      if (!entity_type || !entity_id || !decision) {
        return reply.status(400).send({ error: 'Faltan parámetros obligatorios (entity_type, entity_id, decision)' });
      }

      // 1. Registrar revisión en eti_reviews
      const { error: revErr } = await supabaseAdmin
        .from('eti_reviews')
        .insert({
          entity_type,
          entity_id,
          decision,
          reviewer_id: request.user?.id,
          modifications: modifications || {},
          notes: notes || null,
        });

      if (revErr) {
        return reply.status(500).send({ error: `Error registrando revisión: ${revErr.message}` });
      }

      // 2. Si es estrategia y fue aprobada, promover su estado
      if (entity_type === 'STRATEGY') {
        const nextStatus = decision === 'APPROVED' ? 'BACKTEST_PASSED' : decision === 'REJECTED' ? 'REJECTED' : 'STRUCTURED';
        await supabaseAdmin
          .from('eti_strategies')
          .update({ lifecycle_status: nextStatus })
          .eq('id', entity_id);
      }

      return reply.status(200).send({ status: 'review_recorded', decision, entity_id });
    }
  );

  /**
   * GET /api/eti/v1/strategies/:id/dsl
   * Exporta la definición canónica formal en Strategy DSL de una estrategia específica
   */
  fastify.get(
    '/api/eti/v1/strategies/:id/dsl',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const { data: strategy, error } = await supabaseAdmin
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
          eti_strategy_versions(
            version_number,
            dsl_definition,
            eti_strategy_rules(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error || !strategy) {
        return reply.status(404).send({ error: 'Estrategia no encontrada' });
      }

      return reply.send({
        schema_version: '1.0-dsl',
        compiled_strategy: strategy,
      });
    }
  );
}
