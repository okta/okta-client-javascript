/**
 * @packageDocumentation
 * @internal
 */

// defined in rollup.config.js and jest.config.ts
declare const __PKG_NAME__: string;
declare const __PKG_VERSION__: string;

const envs: Set<string> = new Set();

/** @internal */
export function addEnv (env: string) {
  envs.add(env);
}

/** @internal */
export function getOktaUserAgent () {
  return [...envs].join(' ');
}

addEnv(`${__PKG_NAME__}/${__PKG_VERSION__}`);
