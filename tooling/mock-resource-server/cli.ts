#!/usr/bin/env node
import { createMockResourceServer } from './server.ts';
import type { AuthMode } from './types.ts';

const AUTH_MODES: AuthMode[] = ['token_present', 'dpop', 'bearer', 'none'];

function parseArgs () {
  const args = process.argv.slice(2);
  let port = 3333;
  let auth: AuthMode = 'token_present';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port') {
      port = Number(args[++i]);
    }
    else if (args[i] === '--auth') {
      auth = args[++i] as AuthMode;
    }
  }

  if (!AUTH_MODES.includes(auth)) {
    throw new Error(`Invalid --auth value: "${auth}". Must be one of: ${AUTH_MODES.join(', ')}.`);
  }

  return { port, auth };
}

const { port, auth } = parseArgs();
const app = createMockResourceServer({ auth, enableLogging: true });

app.listen(port, () => {
  console.log(`Mock resource server listening on http://localhost:${port} (auth=${auth})`);
});
