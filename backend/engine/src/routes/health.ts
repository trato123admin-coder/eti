import { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../plugins/supabase.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    let dbStatus = 'healthy';
    try {
      const { error } = await supabaseAdmin.from('app_roles').select('count', { count: 'exact', head: true });
      if (error && error.code !== 'PGRST205') {
        dbStatus = `degraded: ${error.message}`;
      }
    } catch (e: any) {
      dbStatus = `unreachable: ${e.message}`;
    }

    return {
      status: 'ok',
      service: 'ETI Fastify Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  });
}
