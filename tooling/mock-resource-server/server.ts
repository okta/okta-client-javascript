import express from 'express';
import cors from 'cors';
import { requestLogger } from './logger.ts';
import { createAuthMiddleware } from './auth.ts';
import { messagesRouter } from './mocks/messages.ts';
import { bankingRouter } from './mocks/banking.ts';
import type { MockResourceServerOptions } from './types.ts';


export function createMockResourceServer (options: MockResourceServerOptions) {
  const app = express();

  const mockResourceServer = express.Router();

  mockResourceServer.use(cors());
  if (options.enableLogging) {
    mockResourceServer.use(requestLogger);
  }
  mockResourceServer.use(createAuthMiddleware(options.auth ?? 'token_present'));
  mockResourceServer.use(messagesRouter);
  mockResourceServer.use(bankingRouter);

  app.use(options.basePath ?? '/api', mockResourceServer);

  return app;
}
