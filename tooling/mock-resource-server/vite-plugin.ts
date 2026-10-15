import type { Plugin } from 'vite';
import { createMockResourceServer } from './server.ts';
import type { MockResourceServerOptions } from './types.ts';
import type { AuthMiddlewareOptions } from './auth.ts';

export type MockResourceServerPluginOptions = MockResourceServerOptions & AuthMiddlewareOptions;

export function mockResourceServerPlugin (options: MockResourceServerPluginOptions = {}): Plugin {
  return {
    name: 'mock-resource-server',
    configureServer (server) {
      server.middlewares.use(createMockResourceServer(options));
    },
    configurePreviewServer (server) {
      server.middlewares.use(createMockResourceServer(options));
    },
  };
}
