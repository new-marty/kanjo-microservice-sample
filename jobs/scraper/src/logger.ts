import pino from 'pino';
import type { Config } from './config.js';

const sensitiveKeys = [
  'password',
  'mfPassword',
  'gmailAppPassword',
  'blueBubblesPassword',
  'cookie',
  'authorization',
  'token',
];

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      result[key] = redact(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

let logger: pino.Logger | null = null;

export function initLogger(config: Config): pino.Logger {
  const isPretty = process.stdout.isTTY;

  logger = pino({
    level: config.logLevel,
    transport: isPretty
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
    formatters: {
      log(obj) {
        return redact(obj) as Record<string, unknown>;
      },
    },
  });

  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    logger = pino({
      level: 'info',
      transport: process.stdout.isTTY
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    });
  }
  return logger;
}
