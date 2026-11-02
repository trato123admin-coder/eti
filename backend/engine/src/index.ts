import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { recommendationsRoutes } from './routes/recommendations.js';
import { ledgerRoutes } from './routes/ledger.js';
import { reviewRoutes } from './routes/review.js';
import { safetyRoutes } from './routes/safety.js';
import { marketRoutes } from './routes/market.js';
import { topicsRoutes } from './routes/topics.js';
import { ingestionRoutes } from './routes/ingestion.js';

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
  },
});

async function main() {
  // CORS restringido
  await fastify.register(cors, {
    origin: [config.engineAllowedOrigins, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Registrar Rutas
  await fastify.register(healthRoutes);
  await fastify.register(recommendationsRoutes);
  await fastify.register(ledgerRoutes);
  await fastify.register(reviewRoutes);
  await fastify.register(safetyRoutes);
  await fastify.register(marketRoutes);
  await fastify.register(topicsRoutes);
  await fastify.register(ingestionRoutes);

  // Iniciar Servidor
  try {
    const address = await fastify.listen({ port: config.port, host: config.host });
    fastify.log.info(`🚀 ETI Fastify Engine activo y escuchando en ${address}`);
    fastify.log.info(`📊 Entorno: ${config.nodeEnv} | Conectado a Supabase: ${config.supabaseUrl}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
