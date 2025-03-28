import { default as mockServer } from 'vite-plugin-mock-server';
import { requireDPoPToken } from './middleware';

// https://github.com/enjoycoding/vite-plugin-mock-server/issues/26
// NOTE: 'vite-plugin-mock-server' module does not "natively" support running
// the mock server when running `yarn preview`. The export pattern fixes this

// export default function () {
//   return mockServer({
//     printStartupLog: false,
//     mockRootDir: './resource-server/mock',
//     middlewares: [
//       requireBearerToken
//     ]
//   });
// }

export default function (): ReturnType<typeof mockServer> {
  const { name, configureServer } = mockServer({
    printStartupLog: false,
    mockRootDir: './resource-server/mock',
    middlewares: [
      requireDPoPToken
    ]
  });

  return {
    name,
    configureServer,
    configurePreviewServer: (configureServer as any)
  };
}
