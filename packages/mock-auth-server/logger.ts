import fs from 'node:fs';
import morgan from 'morgan';
import type { ErrorRequestHandler } from 'express';

const toStdout = process.env.MOCK_AUTH_SERVER_LOG_STDOUT === 'true';
const filePath = process.env.MOCK_AUTH_SERVER_LOG_FILE ?? 'mock-auth-server.log';

const fileStream = fs.createWriteStream(filePath, { flags: 'a' });

const logStream = {
  write (message: string) {
    fileStream.write(message);
    if (toStdout) {
      process.stdout.write(message);
    }
  },
};

// Logs every incoming request (method, path, status, response time).
export const requestLogger = morgan('combined', { stream: logStream });

// Logs any error thrown/forwarded from a route handler, then hands off to express's default error response.
export const errorLogger: ErrorRequestHandler = (err, req, res, next) => {
  logStream.write(
    `[${new Date().toISOString()}] ERROR ${req.method} ${req.originalUrl} - ${err instanceof Error ? err.stack : String(err)}\n`
  );
  next(err);
};

export function logException (err: Error) {
  logStream.write(err.message);
  if (err.stack) {
    logStream.write(err.stack);
  }
}
