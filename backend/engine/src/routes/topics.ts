import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from '../plugins/supabase.js';

export async function topicsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/eti/v1/topics
   * Retorna el catálogo de temas con su estado (Opciones: ACTIVE, Scalping: PLANNED, Swing: PLANNED)
   */
  fastify.get('/api/eti/v1/topics', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Intentar desde Supabase, con fallback seguro a seeds v2.2
    try {
      const { data, error } = await supabaseAdmin.from('eti_topics').select('*').order('created_at');
      if (!error && data && data.length > 0) {
        return reply.send({ topics: data });
      }
    } catch {
      // Usar fallback
    }

    const fallbackTopics = [
      {
        id: 'top_options_mvp_2026',
        code: 'OPTIONS',
        name: 'Opciones',
        status: 'ACTIVE',
        description: 'Estrategias y trading intradía con contratos de opciones CALL/PUT sobre SPY, QQQ, SPX.',
        sources_count: 5,
        playbook_rules_count: 27,
      },
      {
        id: 'top_scalping_planned_2026',
        code: 'SCALPING',
        name: 'Scalping',
        status: 'PLANNED',
        description: 'Estrategias de momentum de alta frecuencia en acciones de baja capitalización. Fuente prevista: Ross Cameron.',
        sources_count: 1,
        playbook_rules_count: 0,
      },
      {
        id: 'top_swing_planned_2026',
        code: 'SWING_TRADING',
        name: 'Swing Trading',
        status: 'PLANNED',
        description: 'Operativa multidía en acciones y ETFs. Fuente prevista: Jesús Navarrete.',
        sources_count: 1,
        playbook_rules_count: 0,
      },
    ];

    return reply.send({ topics: fallbackTopics });
  });

  /**
   * GET /api/eti/v1/topics/:code/sources
   * Retorna las fuentes iniciales de un tema con sus roles, prioridad y cobertura
   */
  fastify.get(
    '/api/eti/v1/topics/:code/sources',
    async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
      const { code } = request.params;

      if (code.toUpperCase() !== 'OPTIONS') {
        return reply.send({
          topic: code.toUpperCase(),
          status: 'PLANNED',
          sources: [],
          message: 'Tema planificado pero no activado aún.',
        });
      }

      // Las 5 Fuentes Iniciales del Tema Opciones (Addendum v2.2 §4)
      const optionsSources = [
        {
          id: 'src_opcion_sigma',
          name: 'Opción Sigma (Luis Hernán Silva)',
          channel_url: 'https://www.youtube.com/@OpcionSigma',
          language: 'ES',
          role: 'ENTRY_RULES + MARKET_CONTEXT',
          priority: 'VERY_HIGH',
          verification: 'CONFIRMED',
          specialty: 'SPX/0DTE, sesiones en vivo, niveles GEX',
          text_coverage_pct: 88.5,
          credibility_score_vía_a: 85.0,
          claims_audited: 2,
        },
        {
          id: 'src_gala_trades',
          name: 'Gala Trades',
          channel_url: 'https://www.youtube.com/results?search_query=gala+trades+options',
          language: 'EN',
          role: 'ENTRY_RULES',
          priority: 'VERY_HIGH',
          verification: 'PENDING_EXACT_HANDLE',
          specialty: 'Intradía 2m/5m: breakouts, retests, rechazos, pivots',
          text_coverage_pct: 72.0,
          credibility_score_vía_a: 80.0,
          claims_audited: 1,
        },
        {
          id: 'src_yoel_sardinas',
          name: 'Yoel Sardiñas',
          channel_url: 'https://www.youtube.com/@YoelSardinas',
          language: 'ES',
          role: 'ENTRY_RULES + EDUCATION',
          priority: 'HIGH',
          verification: 'PENDING_HANDLE_CONFIRMATION',
          specialty: 'Análisis técnico, operaciones relatadas, psicología',
          text_coverage_pct: 81.0,
          credibility_score_vía_a: 78.0,
          claims_audited: 1,
        },
        {
          id: 'src_imran_lakha',
          name: 'Imran Lakha (Options Insight)',
          channel_url: 'https://www.youtube.com/@OptionsInsight',
          language: 'EN',
          role: 'MARKET_CONTEXT',
          priority: 'HIGH',
          verification: 'CONFIRMED_MACRO_ANALYST',
          specialty: 'IV, flujo institucional, GEX, gamma, 0DTE',
          text_coverage_pct: 90.0,
          credibility_score_vía_a: 92.0,
          claims_audited: 1,
        },
        {
          id: 'src_john_carter',
          name: 'John Carter (Simpler Trading)',
          channel_url: 'https://www.youtube.com/@SimplerTrading',
          language: 'EN',
          role: 'ENTRY_RULES + RISK_MGMT',
          priority: 'HIGH',
          verification: 'CONFIRMED_AUTHOR',
          specialty: 'TTM Squeeze, momentum, gestión de riesgo',
          text_coverage_pct: 94.0,
          credibility_score_vía_a: 88.0,
          claims_audited: 0,
        },
      ];

      return reply.send({
        topic: 'OPTIONS',
        topic_name: 'Opciones',
        status: 'ACTIVE',
        sources_count: optionsSources.length,
        sources: optionsSources,
      });
    }
  );

  /**
   * GET /api/eti/v1/topics/:code/playbook
   * Retorna el Playbook Consolidado del Tema
   * Columnas separadas: Consenso vs. Validación ("Consenso NO es validez")
   */
  fastify.get(
    '/api/eti/v1/topics/:code/playbook',
    async (request: FastifyRequest<{ Params: { code: string } }>, reply: FastifyReply) => {
      const { code } = request.params;

      if (code.toUpperCase() !== 'OPTIONS') {
        return reply.status(404).send({ error: 'Playbook no disponible para temas inactivos' });
      }

      // Reglas consolidadas representativas del Playbook de Opciones (Addendum v2.2 §5.7)
      const playbookRules = [
        {
          id: 'pb_rule_01',
          category: 'CALL_PUT_ENTRY',
          rule_code: 'PB_VWAP_EMA9_MOMENTUM_ALIGNMENT',
          title: 'Reclamo de VWAP con Confluencia EMA 9/20',
          description: 'Apertura de CALL cuando el precio supera VWAP con EMA 9 sobre EMA 20 y volumen creciente en horario 9:45-15:30 EST.',
          horizon: 'INTRADAY',
          consensus: {
            count: 4,
            percentage: 80.0,
            supporting_sources: ['Opción Sigma', 'Gala Trades', 'Yoel Sardiñas', 'John Carter'],
          },
          parameter_variants: {
            timeframe: ['2m', '5m'],
            delta_target: [0.40, 0.50],
            profit_target_pct: [25.0, 45.0],
          },
          contradictions: [
            'Gala Trades exige retest exacto al centavo en la vela siguiente; Yoel Sardiñas entra al cruce directo.',
          ],
          rule_nature: 'STANDARD_CONSENSUS',
          evidence_level: 'E2',
          validation_status: 'STRUCTURED',
          usage_in_robot: 'INFORMATIVE',
        },
        {
          id: 'pb_rule_02',
          category: 'CONTEXT_REGIME',
          rule_code: 'PB_GEX_GAMMA_WALL_BARRIER',
          title: 'Filtro de Barrera Gamma (GEX Wall)',
          description: 'No comprar CALLs directas cuando el precio esté a menos de 0.3% del nivel de Gamma Neutro o Call Wall según Imran Lakha y Opción Sigma.',
          horizon: 'INTRADAY',
          consensus: {
            count: 2,
            percentage: 40.0,
            supporting_sources: ['Imran Lakha', 'Opción Sigma'],
          },
          parameter_variants: {
            gex_proximity_pct: [0.2, 0.4],
          },
          contradictions: [],
          rule_nature: 'STANDARD_CONSENSUS',
          evidence_level: 'E1',
          validation_status: 'STRUCTURED',
          usage_in_robot: 'SHADOW',
        },
        {
          id: 'pb_rule_03',
          category: 'CALL_PUT_ENTRY',
          rule_code: 'PB_EXC_EXTREME_GAP_FADE',
          title: 'Desvanecimiento de Gap Extremo (>1.8%) con RSI Climax',
          description: 'Override táctico: Si SPY o QQQ abren con un gap mayor a 1.8% y RSI 1H supera 75 o cae bajo 25, operar reversión hacia VWAP.',
          horizon: 'INTRADAY',
          consensus: {
            count: 1,
            percentage: 20.0,
            supporting_sources: ['Opción Sigma'],
          },
          parameter_variants: {
            gap_threshold_pct: [1.5, 2.0],
            stop_loss_pct: [15.0, 20.0],
          },
          contradictions: [
            'Gala Trades prohíbe operar contra el gap en los primeros 15 minutos; Opción Sigma aprovecha el shock de liquidez.',
          ],
          rule_nature: 'UNIQUE_EXCEPTION',
          evidence_level: 'E2',
          validation_status: 'STRUCTURED',
          usage_in_robot: 'SHADOW',
        },
        {
          id: 'pb_rule_04',
          category: 'RISK_MGMT_EXIT',
          rule_code: 'PB_HARD_STOP_THETA_GUARD',
          title: 'Stop Duro del 35% y Salida por Tiempo a las 15:45 EST',
          description: 'Salida obligatoria si la prima cae 35% o si se alcanzan las 15:45 EST en opciones 0DTE para prevenir destrucción por Theta.',
          horizon: 'INTRADAY',
          consensus: {
            count: 5,
            percentage: 100.0,
            supporting_sources: ['Opción Sigma', 'Gala Trades', 'Yoel Sardiñas', 'Imran Lakha', 'John Carter'],
          },
          parameter_variants: {
            stop_loss_range_pct: [30.0, 40.0],
            force_close_time: ['15:40', '15:50'],
          },
          contradictions: [],
          rule_nature: 'STANDARD_CONSENSUS',
          evidence_level: 'E3',
          validation_status: 'VALIDATED',
          usage_in_robot: 'GATED_EXECUTION',
        },
      ];

      return reply.send({
        topic: 'OPTIONS',
        playbook_name: 'Playbook Consolidado de Opciones',
        version: 'v1.0-s4',
        notice: 'ADVERTENCIA: Consenso no es validez. La validación exige superación cuantitativa en Vía B y evidencia forward en Vía C.',
        total_rules: playbookRules.length,
        rules: playbookRules,
      });
    }
  );

  /**
   * POST /api/eti/v1/context
   * Endpoint enriquecido para que el robot de eTrade consulte aplicabilidad de reglas
   * especificando topic, horizon y consumer_module (Addendum v2.2 §6)
   */
  fastify.post(
    '/api/eti/v1/context',
    async (request: FastifyRequest<{
      Body: {
        topic?: string;
        horizon?: string;
        consumer_module?: string;
        underlying: string;
        current_price: number;
        regime?: string;
      }
    }>, reply: FastifyReply) => {
      const body = request.body || ({} as any);
      const topic = (body.topic || 'OPTIONS').toUpperCase();
      const horizon = (body.horizon || 'INTRADAY').toUpperCase();
      const consumer = body.consumer_module || 'APEX_OPTIONS_MODULE';

      if (topic !== 'OPTIONS') {
        return reply.status(400).send({
          error: `El tema ${topic} está en estado PLANNED y no emite contexto para el robot.`,
        });
      }

      return reply.send({
        as_of: new Date().toISOString(),
        topic,
        horizon,
        consumer_module: consumer,
        underlying: body.underlying,
        execution_allowed: false, // Mandatorio de seguridad
        applicability_matrix: {
          current_market_regime: body.regime || 'TRENDING_UP',
          compatible_rules: ['PB_VWAP_EMA9_MOMENTUM_ALIGNMENT', 'PB_HARD_STOP_THETA_GUARD'],
          incompatible_rules: ['PB_EXC_EXTREME_GAP_FADE'],
          reason: 'Régimen de tendencia alcista moderada sin gap anómalo al inicio de sesión.',
        },
      });
    }
  );
}
