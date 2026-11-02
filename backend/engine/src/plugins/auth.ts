import { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAdmin } from './supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  isServiceToken?: boolean;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Middleware para validar autenticación vía Supabase JWT o Service Token criptográfico
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  let serviceToken = request.headers['x-eti-service-token'] as string | undefined;

  // Si viene en el Bearer token y empieza con eti_, tratarlo como service token
  if (!serviceToken && authHeader && authHeader.startsWith('Bearer eti_')) {
    serviceToken = authHeader.split(' ')[1];
  }

  // 1. Verificación de Service Token (para Robot y Workers)
  if (serviceToken) {
    const { data: tokenRecord, error } = await supabaseAdmin
      .from('app_service_tokens')
      .select('id, name, role_code, scopes, is_active')
      .eq('token_hash', serviceToken)
      .eq('is_active', true)
      .single();

    if (error || !tokenRecord) {
      return reply.status(401).send({ error: 'Service Token no válido o revocado' });
    }

    request.user = {
      id: tokenRecord.id,
      email: `${tokenRecord.name}@service.etrade`,
      role: tokenRecord.role_code,
      isServiceToken: true,
    };
    return;
  }

  // 2. Verificación de JWT de usuario
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Encabezado de autorización ausente o malformado' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return reply.status(401).send({ error: 'Token de sesión expirado o inválido' });
  }

  // Obtener rol del usuario desde app_user_roles
  const { data: userRoles } = await supabaseAdmin
    .from('app_user_roles')
    .select('app_roles(code)')
    .eq('user_id', user.id)
    .single();

  const roleCode = (userRoles as any)?.app_roles?.code || 'viewer';

  request.user = {
    id: user.id,
    email: user.email || '',
    role: roleCode,
  };
}

/**
 * Decorador de autorización estricta por rol (RBAC)
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);
    if (!request.user) return;

    if (!allowedRoles.includes(request.user.role)) {
      return reply.status(403).send({
        error: 'Acceso denegado: permisos insuficientes para esta operación',
        requiredRoles: allowedRoles,
        currentRole: request.user.role,
      });
    }
  };
}
