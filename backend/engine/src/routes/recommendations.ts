import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../plugins/supabase.js';
import { authenticate } from '../plugins/auth.js';
import { isEmergencyHaltActive, getEmergencyHaltReason } from './safety.js';
import { marketDataService } from '../services/marketDataService.js';

interface RecommendationPayload {
  underlying: string; // ej. SPY, QQQ
  current_price: number;
  market_regime: string; // ej. TRENDING_UP, VOLATILITY_SPIKE, GAP_OPEN
  iv_rank?: number;
  rsi_1h?: number;
  gap_pct?: number;
  price_vs_vwap?: 'ABOVE' | 'BELOW';
  ema9_vs_ema20?: 'ABOVE' | 'BELOW';
  gamma_wall?: number;
}

export async function recommendationsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/eti/v1/recommendations
   * Endpoint de consulta para el Robot eTrade (Solo Lectura)
   * Recibe el snapshot de mercado y evalúa si aplica una Regla Estándar o un Override de Excepción.
   */
  fastify.post(
    '/api/eti/v1/recommendations',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Body: RecommendationPayload }>, reply: FastifyReply) => {
      const body = request.body || {};
      return evaluateRecommendations(body, reply);
    }
  );

  /**
   * GET /api/eti/v1/recommendations
   * Endpoint alternativo vía query params para consulta rápida
   */
  fastify.get(
    '/api/eti/v1/recommendations',
    { preHandler: [authenticate] },
    async (request: FastifyRequest<{ Querystring: any }>, reply: FastifyReply) => {
      const query = request.query || {};
      const payload: RecommendationPayload = {
        underlying: query.underlying || 'SPY',
        current_price: parseFloat(query.current_price || '560.0'),
        market_regime: query.regime || 'TRENDING_UP',
        price_vs_vwap: query.price_vs_vwap || 'ABOVE',
        ema9_vs_ema20: query.ema9_vs_ema20 || 'ABOVE',
        gap_pct: query.gap_pct ? parseFloat(query.gap_pct) : 0.0,
        rsi_1h: query.rsi_1h ? parseFloat(query.rsi_1h) : 55.0,
      };
      return evaluateRecommendations(payload, reply);
    }
  );
}

function evaluateRecommendations(body: RecommendationPayload, reply: FastifyReply) {
  // Verificación prioritaria del Kill-Switch de Seguridad (Sprint ETI-S10)
  if (isEmergencyHaltActive()) {
    return reply.status(503).send({
      as_of: new Date().toISOString(),
      underlying: (body.underlying || 'SPY').toUpperCase(),
      strategy_found: false,
      rule_applied: 'CIRCUIT_BREAKER_HALTED',
      rule_nature: 'NONE',
      candidate_direction: null,
      execution_allowed: false,
      reasoning: [`CIRCUIT BREAKER ACTIVADO: Todas las recomendaciones suspendidas por seguridad (${getEmergencyHaltReason()}).`],
    });
  }

  if (!body.underlying || !body.current_price) {
    return reply.status(400).send({ error: 'Parámetros incompletos (underlying y current_price requeridos)' });
  }

  // En consulta: execution_allowed es false por defecto
  // La IA / ETI jamás emite órdenes directas; solo recomendaciones auditadas
  const response = {
    as_of: new Date().toISOString(),
    underlying: body.underlying.toUpperCase(),
    market_regime: body.market_regime || 'UNKNOWN',
    strategy_found: false,
    rule_applied: 'NONE',
    rule_nature: 'NONE', // 'STANDARD_CONSENSUS' | 'UNIQUE_EXCEPTION'
    candidate_direction: null as 'CALL' | 'PUT' | null,
    recommended_contracts: {
      delta_target: 0.45,
      dte: 0,
      max_spread_pct: 5.0,
    },
    risk_constraints: {
      stop_loss_pct: 15.0,
      take_profit_target_pct: 35.0,
      max_loss_usd: 1000.0,
    },
    execution_allowed: false, // Mandatorio de seguridad
    reasoning: [] as string[],
  };

  // Consulta de estado en tiempo real del Financial Dynamics Engine (FDE)
  const fde = marketDataService.getFdeProjection();
  const fdeBias = fde.financialSystemState.bias;
  const fdeRegime = fde.financialSystemState.code;

  // 1. Regla de Aduana O-13: Macro Regime Alignment & Playbook de Yoel Sardiñas (0DTE CPI / Breakdown)
  if ((body.market_regime === 'INFLATION_SURPRISE' || fdeBias === 'BEARISH') && body.price_vs_vwap === 'BELOW') {
    response.strategy_found = true;
    response.rule_applied = 'YOEL_CPI_VOLATILITY_BREAKDOWN_PUT';
    response.rule_nature = 'INFLUENCER_AUDITED_RULE';
    response.candidate_direction = 'PUT';
    response.recommended_contracts.dte = 0;
    response.recommended_contracts.delta_target = 0.50; // At The Money para scalping de alta velocidad
    response.risk_constraints.stop_loss_pct = 15.0;
    response.risk_constraints.take_profit_target_pct = 35.0;
    response.reasoning.push(
      `ADUANA O-13 PASADA (Macro Regime Gate): Régimen FDE '${fdeRegime}' con sesgo ${fdeBias}. ` +
      'Alineado con el playbook auditado de Yoel Sardiñas: Compra de PUT 0DTE ATM tras confirmación de precio bajo VWAP.'
    );
    return reply.send(response);
  }

  // 2. Evaluación de Reglas Únicas / Excepciones Situacionales
  if (body.gap_pct && Math.abs(body.gap_pct) >= 1.8 && body.rsi_1h && (body.rsi_1h >= 75 || body.rsi_1h <= 25)) {
    // Si ADUANA O-13 detecta sesgo bajista severo, prohíbe compras de CALLs contra-tendencia
    if (body.gap_pct < 0 && fdeBias === 'BEARISH') {
      response.strategy_found = false;
      response.rule_applied = 'O13_VETO_COUNTER_TREND_CALL';
      response.candidate_direction = null;
      response.reasoning.push(
        'ADUANA O-13 BLOQUEO: Intento de comprar CALL por reversión a la media vetado. ' +
        'El Financial Dynamics Engine diagnostica choque inflacionario/macro bajista activo.'
      );
      return reply.send(response);
    }

    response.strategy_found = true;
    response.rule_applied = 'EXC_01_EXTREME_GAP_MEAN_REVERSION';
    response.rule_nature = 'UNIQUE_EXCEPTION';
    response.candidate_direction = body.gap_pct > 0 ? 'PUT' : 'CALL';
    response.reasoning.push(`Excepción activada: Gap extremo (${body.gap_pct.toFixed(2)}%) con RSI sobreextendido (${body.rsi_1h}). Override de desvanecimiento hacia VWAP.`);
    return reply.send(response);
  }

  // 3. Evaluación de Regla Estándar (Consenso VWAP + EMAs con filtro O-13)
  if (body.price_vs_vwap === 'ABOVE' && body.ema9_vs_ema20 === 'ABOVE') {
    if (fdeBias === 'BEARISH') {
      response.strategy_found = false;
      response.rule_applied = 'O13_FILTERED_BULLISH_SIGNAL';
      response.candidate_direction = null;
      response.reasoning.push(
        'ADUANA O-13 FILTRADO: Señal técnica de CALLs descartada por divergencia con el régimen macro bajista del FDE.'
      );
      return reply.send(response);
    }

    response.strategy_found = true;
    response.rule_applied = 'CONSENSUS_VWAP_MOMENTUM_CALL';
    response.rule_nature = 'STANDARD_CONSENSUS';
    response.candidate_direction = 'CALL';
    response.reasoning.push('Consenso de 5 YouTubers cumplido: Precio sobre VWAP + alineación alcista EMA 9 > EMA 20 en horario regular.');
    return reply.send(response);
  } else if (body.price_vs_vwap === 'BELOW' && body.ema9_vs_ema20 === 'BELOW') {
    response.strategy_found = true;
    response.rule_applied = 'CONSENSUS_VWAP_MOMENTUM_PUT';
    response.rule_nature = 'STANDARD_CONSENSUS';
    response.candidate_direction = 'PUT';
    response.reasoning.push('Consenso de 5 YouTubers cumplido: Precio bajo VWAP + alineación bajista EMA 9 < EMA 20.');
    return reply.send(response);
  }

  response.reasoning.push('No hay confluencia de regla estándar ni excepción activa en el régimen actual.');
  return reply.send(response);
}
