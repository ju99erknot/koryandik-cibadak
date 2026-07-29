/**
 * Centralized logging utility with environment-based configuration
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLogLevel: LogLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 
  (process.env.NODE_ENV === 'production' ? 'error' : 'debug');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLogLevel];
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(formatMessage('error', message, { ...context, error: errorMessage, stack: errorStack }));
    }
  },

  warn: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  info: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog('info')) {
      console.log(formatMessage('info', message, context));
    }
  },

  debug: (message: string, context?: Record<string, unknown>) => {
    if (shouldLog('debug')) {
      console.log(formatMessage('debug', message, context));
    }
  },
};

/**
 * Safe error handler that logs and optionally rethrows
 */
export function handleError(error: unknown, context?: Record<string, unknown>, rethrow = false): void {
  if (error instanceof Error) {
    logger.error(error.message, error, context);
  } else {
    logger.error('Unknown error occurred', error, context);
  }
  
  if (rethrow) {
    throw error;
  }
}

/**
 * Async error wrapper for consistent error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return null;
  }
}
