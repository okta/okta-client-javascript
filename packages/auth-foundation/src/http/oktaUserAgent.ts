const envs: string[] = [];

/** @internal */
export function addEnv (env: string) {
  envs.push(env);
}

/** @internal */
export function getOktaUserAgent () {
  return envs.join(' ');
}

// TODO: rename from package.json or use build?
const packageName = '@okta/auth-foundation';
const version = '0.0.0';
addEnv(`${packageName}/${version}`);
