import { ZodError } from 'zod'

/**
 * Format a Zod error for API response.
 * In production, returns a generic message to avoid leaking internal structure.
 * In development, includes field-level details for debugging.
 */
export function formatZodError(error: ZodError): { error: string; details?: unknown } {
  const isProduction = process.env.NODE_ENV === 'production'

  // Get the first error message for user-friendly display
  const firstError = error.issues[0]
  const userMessage = firstError?.message || 'Invalid request data'

  if (isProduction) {
    return { error: userMessage }
  }

  // In development, include full details for debugging
  return {
    error: userMessage,
    details: error.flatten(),
  }
}

/**
 * Create a standardized error response object.
 * Sanitizes details in production to avoid leaking internal structure.
 */
export function createErrorResponse(
  error: string,
  details?: unknown
): { error: string; details?: unknown } {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction || !details) {
    return { error }
  }

  return { error, details }
}
