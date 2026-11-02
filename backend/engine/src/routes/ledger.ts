import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../plugins/supabase.js';
import { authenticate, requireRole } from '../plugins/auth.js';

export async function ledgerRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/eti/v1/ledger/candidate
   * Recibe de eTrade cada candidato evaluado por ADUANA (aprobado o rechazado)
   */
  fastify.post(
    '/api/eti/v1/ledger/candidate',
    { preHandler: [requireRole(['service', 'owner', 'admin'])] },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      const candidate = request.body;

      if (!candidate.underlying || !candidate.strategy_name || candidate.aduana_passed === undefined) {
        return reply.status(400).send({ error: 'Payload de candidato incompleto' });
      }

      const { data, error } = await supabaseAdmin
        .from('eti_experience_candidates')
        .insert({
          underlying: candidate.underlying,
          execution_mode: candidate.execution_mode || 'PAPER',
          strategy_name: candidate.strategy_name,
          direction: candidate.direction || 'CALL',
          apex_score: candidate.apex_score || 0.0,
          score_components: candidate.score_components || {},
          aduana_passed: candidate.aduana_passed,
          aduana_rules_detail: candidate.aduana_rules_detail || {},
          rejection_reason: candidate.rejection_reason || null,
          market_regime: candidate.market_regime || 'UNKNOWN',
          config_hash: candidate.config_hash || null,
          eti_query_id: candidate.eti_query_id || null,
        })
        .select('id')
        .single();

      if (error) {
        return reply.status(500).send({ error: `Error persistiendo en el Experience Ledger: ${error.message}` });
      }

      return reply.status(201).send({ status: 'recorded', candidate_id: data.id });
    }
  );

  /**
   * POST /api/eti/v1/ledger/trade
   * Recibe de eTrade cada operación ejecutada y cerrada en PAPER o LIVE (Vía C)
   */
  fastify.post(
    '/api/eti/v1/ledger/trade',
    { preHandler: [requireRole(['service', 'owner', 'admin'])] },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      const trade = request.body;

      if (!trade.candidate_id || !trade.contract_symbol || trade.entry_fill_price === undefined) {
        return reply.status(400).send({ error: 'Payload de trade incompleto' });
      }

      const { data, error } = await supabaseAdmin
        .from('eti_experience_trades')
        .insert({
          candidate_id: trade.candidate_id,
          execution_mode: trade.execution_mode || 'PAPER',
          fill_model: trade.fill_model || 'CONSERVATIVE_BID_ASK',
          contract_symbol: trade.contract_symbol,
          quantity: trade.quantity || 1,
          entry_mid_price: trade.entry_mid_price || trade.entry_fill_price,
          entry_fill_price: trade.entry_fill_price,
          entry_slippage_usd: trade.entry_slippage_usd || 0.0,
          entry_fees_usd: trade.entry_fees_usd || 0.70,
          entry_at: trade.entry_at || new Date().toISOString(),
          exit_fill_price: trade.exit_fill_price || null,
          exit_slippage_usd: trade.exit_slippage_usd || 0.0,
          exit_fees_usd: trade.exit_fees_usd || 0.70,
          exit_reason: trade.exit_reason || null,
          exit_at: trade.exit_at || null,
          duration_minutes: trade.duration_minutes || null,
          mfe_usd: trade.mfe_usd || null,
          mae_usd: trade.mae_usd || null,
          net_pnl_usd: trade.net_pnl_usd || 0.0,
          return_pct: trade.return_pct || 0.0,
        })
        .select('id')
        .single();

      if (error) {
        return reply.status(500).send({ error: `Error registrando trade en Experience Ledger: ${error.message}` });
      }

      return reply.status(201).send({ status: 'recorded', trade_id: data.id });
    }
  );

  /**
   * POST /api/eti/v1/ledger/shadow_signal
   * Registra señales generadas en sombra (E3) sin límite diario
   */
  fastify.post(
    '/api/eti/v1/ledger/shadow_signal',
    { preHandler: [requireRole(['service', 'owner', 'admin'])] },
    async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
      const signal = request.body;

      if (!signal.underlying || !signal.direction || signal.simulated_entry_premium === undefined) {
        return reply.status(400).send({ error: 'Payload de señal en sombra incompleto' });
      }

      const { data, error } = await supabaseAdmin
        .from('eti_shadow_signals')
        .insert({
          strategy_version_id: signal.strategy_version_id || null,
          underlying: signal.underlying,
          direction: signal.direction,
          signal_time: signal.signal_time || new Date().toISOString(),
          simulated_entry_premium: signal.simulated_entry_premium,
          simulated_exit_premium: signal.simulated_exit_premium || null,
          simulated_pnl_usd: signal.simulated_pnl_usd || null,
          rule_nature: signal.rule_nature || 'STANDARD_CONSENSUS',
          exception_override_applied: signal.exception_override_applied || null,
        })
        .select('id')
        .single();

      if (error) {
        return reply.status(500).send({ error: `Error registrando shadow signal: ${error.message}` });
      }

      return reply.status(201).send({ status: 'recorded', signal_id: data.id });
    }
  );

  /**
   * GET /api/eti/v1/ledger/stats
   * Consulta agregada del Experience Ledger
   */
  fastify.get(
    '/api/eti/v1/ledger/stats',
    { preHandler: [authenticate] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const { count: totalCandidates } = await supabaseAdmin
        .from('eti_experience_candidates')
        .select('*', { count: 'exact', head: true });

      const { count: totalTrades } = await supabaseAdmin
        .from('eti_experience_trades')
        .select('*', { count: 'exact', head: true });

      return reply.send({
        total_candidates_evaluated: totalCandidates || 0,
        total_executed_trades: totalTrades || 0,
        ledger_mode: 'APPEND_ONLY',
      });
    }
  );
}
