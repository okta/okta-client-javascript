import mockServer from 'vite-plugin-mock-server';
import { requireBearerToken } from './middleware';

export default function () {
  return mockServer({
    printStartupLog: false,
    mockRootDir: './resource-server/mock',
    middlewares: [
      requireBearerToken
    ]
  });
}
