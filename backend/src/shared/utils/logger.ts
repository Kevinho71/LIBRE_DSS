type LogContext = Record<string, unknown>;

function formatLog(level: string, message: string, context?: LogContext): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  });
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.log(formatLog('INFO', message, context));
  },
  warn(message: string, context?: LogContext): void {
    console.warn(formatLog('WARN', message, context));
  },
  error(message: string, context?: LogContext): void {
    console.error(formatLog('ERROR', message, context));
  },
  debug(message: string, context?: LogContext): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(formatLog('DEBUG', message, context));
    }
  },
};
