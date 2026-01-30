import { ConfigContext } from "expo/config";
import envModule from "@repo/env";

envModule.setEnvironmentVarsFromTestEnv(__dirname);
const env: any = {};
// List of environment variables made available to the app
[
  "ISSUER",
  "NATIVE_CLIENT_ID",
  "REDIRECT_URI",
  "LOGOUT_REDIRECT_URI",
  "USE_DPOP",
].forEach((key) => {
  if (!process.env[key]) {
    console.warn(
      `Environment variable ${key} should be set for development. See README.md`,
    );
  }
  env[key] = process.env[key];
});

console.log("Expo extra.env at config time = ", env);

export default ({ config }: ConfigContext) => ({
  ...config,
  extra: {
    env,
  },
  scheme: "com.oktapreview.tciuc-test",
  plugins: [
    "expo-font",
    "expo-router",
    "expo-web-browser",
    [
      "expo-build-properties",
      {
        android: {
          packagingOptions: {
            pickFirst: ["**/libfbjni.so", "**/libc++_shared.so"],
          },
        },
      },
    ],
  ],
  android: {
    package: "com.anonymous.reporeactnativeoidc",
  },
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: "com.anonymous.reporeactnativeoidc",
  },
});
