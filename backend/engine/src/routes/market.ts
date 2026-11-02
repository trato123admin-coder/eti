import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { marketDataService } from '../services/marketDataService.js';
import { authenticate } from '../plugins/auth.js';

export async function marketRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/eti/v1/market/instruments
   * Retorna los instrumentos monitoreados con su estado calculado RADAR
   */
  fastify.get('/api/eti/v1/market/instruments', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = marketDataService.getInstruments();
    return reply.send({
      count: data.length,
      instruments: data,
      cached_at: new Date().toISOString(),
    });
  });

  /**
   * GET /api/eti/v1/market/breadth
   * Retorna las métricas de amplitud del mercado sobre el S&P 500 y el Sesgo de Sesión
   */
  fastify.get('/api/eti/v1/market/breadth', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = marketDataService.getBreadth();
    return reply.send(data);
  });

  /**
   * GET /api/eti/v1/market/movers
   * Retorna los mayores ganadores, perdedores y volumen inusual
   */
  fastify.get('/api/eti/v1/market/movers', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = marketDataService.getMovers();
    return reply.send({
      count: data.length,
      movers: data,
    });
  });

  /**
   * GET /api/eti/v1/market/heatmap
   * Retorna el rendimiento sectorial del S&P 500
   */
  fastify.get('/api/eti/v1/market/heatmap', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = marketDataService.getHeatmap();
    return reply.send({
      count: data.length,
      sectors: data,
    });
  });

  /**
   * GET /api/eti/v1/market/projections
   * Retorna los 3 escenarios indicativos con niveles de activación e invalidación
   */
  fastify.get(
    '/api/eti/v1/market/projections',
    async (request: FastifyRequest<{ Querystring: { symbol?: string } }>, reply: FastifyReply) => {
      const { symbol } = request.query || {};
      const data = marketDataService.getProjections(symbol);
      return reply.send({
        count: data.length,
        projections: data,
        notice: 'Proyección v1 por escenarios. Sin probabilidades numéricas hasta calibración.',
      });
    }
  );

  /**
   * GET /api/eti/v1/market/fde-projection
   * Retorna el estado pre-market, proyección causal del día (FDE/FCG) y mandatos del robot
   */
  fastify.get('/api/eti/v1/market/fde-projection', async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = marketDataService.getFdeProjection();
    return reply.send(data);
  });

  /**
   * GET /api/eti/v1/etrade/signals/active
   * Entrega al robot eTrade las señales activas con contratos de opciones,
   * condiciones de gatillo técnico (TA Gate) y niveles de riesgo (Bracket Orders).
   */
  fastify.get(
    '/api/eti/v1/etrade/signals/active',
    async (
      request: FastifyRequest<{ Querystring: { cadence?: string; symbol?: string; horizon?: string } }>,
      reply: FastifyReply
    ) => {
      const { cadence, symbol, horizon } = request.query || {};
      const data = marketDataService.getEtradeLiveSignals();
      let signals = data.signals || [];

      if (cadence) {
        signals = signals.filter((s: any) => s.cadence?.toUpperCase() === cadence.toUpperCase());
      }
      if (symbol) {
        signals = signals.filter((s: any) => s.symbol?.toUpperCase() === symbol.toUpperCase());
      }
      if (horizon) {
        signals = signals.filter((s: any) => s.strategy?.horizon?.toUpperCase() === horizon.toUpperCase());
      }

      return reply.send({
        success: true,
        updated_at: data.updated_at || new Date().toISOString(),
        fde_regime: data.fde_regime || 'DECELERATION',
        tws_broker_connected: data.tws_broker_connected ?? true,
        tws_account: data.tws_account || 'DUR260933',
        count: signals.length,
        signals,
      });
    }
  );

  /**
   * POST /api/eti/v1/etrade/signals/feedback
   * Recibe la confirmación o rechazo técnico del robot eTrade tras evaluar sus indicadores locales.
   */
  fastify.post(
    '/api/eti/v1/etrade/signals/feedback',
    async (
      request: FastifyRequest<{
        Body: {
          signal_id: string;
          status: 'TRIGGERED_AND_FILLED' | 'REJECTED_TA_GATE' | 'EXPIRED' | 'ERROR';
          fill_price?: number;
          rejection_reason?: string;
          order_id?: number | string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const body = request.body || {};
      fastify.log.info({ eTradeFeedback: body }, 'eTrade Robot Execution Feedback received');

      return reply.send({
        success: true,
        signal_id: body.signal_id,
        received_at: new Date().toISOString(),
        message: `Feedback registrado con éxito en el motor ETI: ${body.status}`,
      });
    }
  );
}
