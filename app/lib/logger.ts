import { createLogger, format, transports, Logger } from 'winston';

// Log levels: error, warn, info, http, verbose, debug, silly
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /token["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /key["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /secret["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /authorization["\s]*[:=]["\s]*[^"\s,}]+/gi,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // emails
];

// Sanitize log data to remove sensitive information
function sanitizeLogData(data: any): any {
  if (typeof data === 'string') {
    let sanitized = data;
    SENSITIVE_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, (match) => {
        const [key, ...rest] = match.split(/[:=]/);
        return `${key}:***REDACTED***`;
      });
    });
    return sanitized;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive information
      if (lowerKey.includes('password') || 
          lowerKey.includes('token') || 
          lowerKey.includes('key') || 
          lowerKey.includes('secret') ||
          lowerKey.includes('authorization')) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = sanitizeLogData(value);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

// Create Winston logger instance
function createAppLogger(): Logger {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json(),
    format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const sanitizedMeta = sanitizeLogData(meta);
      const logObject = {
        timestamp,
        level,
        message: sanitizeLogData(message),
        ...(Object.keys(sanitizedMeta).length > 0 && { meta: sanitizedMeta }),
        ...(stack && { stack })
      };
      return JSON.stringify(logObject);
    })
  );

  const logTransports = [];
  
  // Console transport for development
  if (isDevelopment) {
    logTransports.push(
      new transports.Console({
        level: 'debug',
        format: format.combine(
          format.colorize(),
          format.simple(),
          format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(sanitizeLogData(meta), null, 2) : '';
            return `${timestamp} [${level}]: ${sanitizeLogData(message)} ${metaStr}`;
          })
        )
      })
    );
  }

  // File transports for production
  if (isProduction) {
    logTransports.push(
      new transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new transports.File({
        filename: 'logs/combined.log',
        level: 'info',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  } else {
    // Console for non-production environments
    logTransports.push(
      new transports.Console({
        level: 'info',
        format: logFormat
      })
    );
  }

  return createLogger({
    level: isProduction ? 'info' : 'debug',
    format: logFormat,
    transports: logTransports,
    exitOnError: false,
    // Prevent logging of sensitive HTTP headers
    meta: {
      service: 'abacushub-api'
    }
  });
}

// Create logger instance
const logger = createAppLogger();

// Enhanced logging interface
export class AppLogger {
  private static instance: AppLogger;
  private logger: Logger;
  
  private constructor() {
    this.logger = logger;
  }
  
  public static getInstance(): AppLogger {
    if (!AppLogger.instance) {
      AppLogger.instance = new AppLogger();
    }
    return AppLogger.instance;
  }

  // Error logging with context
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.logger.error(message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      context: sanitizeLogData(context),
      timestamp: new Date().toISOString()
    });
  }

  // Warning logging
  warn(message: string, context?: Record<string, any>): void {
    this.logger.warn(message, {
      context: sanitizeLogData(context),
      timestamp: new Date().toISOString()
    });
  }

  // Info logging
  info(message: string, context?: Record<string, any>): void {
    this.logger.info(message, {
      context: sanitizeLogData(context),
      timestamp: new Date().toISOString()
    });
  }

  // HTTP request logging
  http(method: string, url: string, statusCode: number, responseTime?: number, context?: Record<string, any>): void {
    this.logger.http(`${method} ${url} ${statusCode}`, {
      method,
      url: sanitizeLogData(url),
      statusCode,
      responseTime,
      context: sanitizeLogData(context),
      timestamp: new Date().toISOString()
    });
  }

  // Debug logging (only in development)
  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(message, {
        context: sanitizeLogData(context),
        timestamp: new Date().toISOString()
      });
    }
  }

  // Authentication specific logging
  auth(event: 'login' | 'logout' | 'signup' | 'failed_login', userId?: string, context?: Record<string, any>): void {
    this.logger.info(`Authentication: ${event}`, {
      event,
      userId,
      context: sanitizeLogData(context),
      timestamp: new Date().toISOString()
    });
  }

  // Security event logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Record<string, any>): void {
    this.logger.warn(`Security Event: ${event}`, {
      event,
      severity,
      context: sanitizeLogData(context),
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  performance(operation: string, duration: number, context?: Record<string, any>): void {
    const level = duration > 1000 ? 'warn' : 'info'; // Warn if operation takes > 1s
    this.logger.log(level, `Performance: ${operation} took ${duration}ms`, {
      operation,
      duration,
      context: sanitizeLogData(context),
      timestamp: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const appLogger = AppLogger.getInstance();

// Legacy console replacement (for gradual migration)
export const secureConsole = {
  log: (message: string, ...args: any[]) => appLogger.info(message, { args: sanitizeLogData(args) }),
  error: (message: string, ...args: any[]) => appLogger.error(message, undefined, { args: sanitizeLogData(args) }),
  warn: (message: string, ...args: any[]) => appLogger.warn(message, { args: sanitizeLogData(args) }),
  info: (message: string, ...args: any[]) => appLogger.info(message, { args: sanitizeLogData(args) }),
  debug: (message: string, ...args: any[]) => appLogger.debug(message, { args: sanitizeLogData(args) })
};

// Express middleware for request logging
export function requestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const { method, originalUrl, ip } = req;
      const { statusCode } = res;
      
      appLogger.http(method, originalUrl, statusCode, duration, {
        ip: sanitizeLogData(ip),
        userAgent: sanitizeLogData(req.get('User-Agent')),
        userId: req.user?.id
      });
    });
    
    next();
  };
}

export default appLogger;