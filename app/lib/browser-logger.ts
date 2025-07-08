// Browser-compatible logger to replace Winston when running in client
export class BrowserLogger {
  private static instance: BrowserLogger;
  
  private constructor() {}
  
  public static getInstance(): BrowserLogger {
    if (!BrowserLogger.instance) {
      BrowserLogger.instance = new BrowserLogger();
    }
    return BrowserLogger.instance;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${contextStr}`;
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    const logMessage = this.formatMessage('error', message, { ...context, error: error?.message });
    console.error(logMessage);
  }

  warn(message: string, context?: Record<string, any>): void {
    const logMessage = this.formatMessage('warn', message, context);
    console.warn(logMessage);
  }

  info(message: string, context?: Record<string, any>): void {
    const logMessage = this.formatMessage('info', message, context);
    console.info(logMessage);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = this.formatMessage('debug', message, context);
      console.debug(logMessage);
    }
  }

  http(method: string, url: string, statusCode: number, responseTime?: number, context?: Record<string, any>): void {
    const logMessage = this.formatMessage('http', `${method} ${url} ${statusCode}`, { responseTime, ...context });
    console.log(logMessage);
  }

  auth(event: string, userId?: string, context?: Record<string, any>): void {
    const logMessage = this.formatMessage('auth', `Authentication: ${event}`, { userId, ...context });
    console.log(logMessage);
  }

  security(event: string, severity: string, context?: Record<string, any>): void {
    const logMessage = this.formatMessage('security', `Security Event: ${event}`, { severity, ...context });
    console.warn(logMessage);
  }

  performance(operation: string, duration: number, context?: Record<string, any>): void {
    const logMessage = this.formatMessage('performance', `${operation} took ${duration}ms`, context);
    if (duration > 1000) {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }
}

export const browserLogger = BrowserLogger.getInstance();