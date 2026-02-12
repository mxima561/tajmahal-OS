import { createServiceRoleClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'event_create'
  | 'event_update'
  | 'event_delete'
  | 'order_cancel'
  | 'order_delete'
  | 'staff_invite'
  | 'staff_delete'
  | 'promo_code_create'
  | 'promo_code_update'
  | 'promo_code_delete'
  | 'guest_list_add'
  | 'guest_list_update'
  | 'guest_list_delete'
  | 'file_upload'
  | 'file_delete'

export type AuditResourceType =
  | 'auth'
  | 'event'
  | 'order'
  | 'staff'
  | 'promo_code'
  | 'guest_list'
  | 'file'

interface AuditLogParams {
  adminUserId?: string
  adminEmail?: string
  action: AuditAction
  resourceType: AuditResourceType
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an audit event for admin actions.
 * This is fire-and-forget to avoid blocking the main request.
 *
 * Note: The audit_logs table is created by migration 20260212_security_fixes.sql.
 * We use a type assertion here since the types are generated from an older schema.
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()

    // Type assertion needed until database.ts types are regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_logs').insert({
      admin_user_id: params.adminUserId || null,
      admin_email: params.adminEmail || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      details: params.details || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })
  } catch (error) {
    // Log but don't throw - audit logging should not break the main flow
    console.error('[Audit] Failed to log event:', error)
  }
}

/**
 * Extract IP address from request headers
 */
export function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * Extract user agent from request headers
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
