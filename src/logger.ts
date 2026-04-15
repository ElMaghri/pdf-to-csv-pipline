import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { ensureDir } from './utils';

export function createLogger(
  logDirectory: string,
  verbose = false,
): winston.Logger {
  ensureDir(logDirectory);

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: verbose ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDirectory, 'pipeline.log'),
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
          ({ timestamp, level, message }) =>
            `${timestamp} [${level}]: ${message}`,
        ),
      ),
    }),
  ];

  return winston.createLogger({
    level: verbose ? 'debug' : 'info',
    transports,
  });
}
