import { ConfigContext } from 'expo/config';
import envModule from '@repo/env';


envModule.setEnvironmentVarsFromTestEnv(__dirname);
const env: any = {};
// List of environment variables made available to the app
[
  'ISSUER',
  'NATIVE_CLIENT_ID',
  'NATIVE_REDIRECT_URI',
  'NATIVE_LOGOUT_REDIRECT_URI',
  'USE_DPOP'
].forEach((key) => {
  if (!process.env[key]) {
    console.warn(`Environment variable ${key} should be set for development. See README.md`);
  }
  env[key] = process.env[key];
});


export default ({ config }: ConfigContext) => ({
  ...config,
  extra: {
    env
  },
  newArchEnabled: true,
  "android": {
    "package": "com.anonymous.reporeactnativeoidc",
    "usesCleartextTraffic": true
  },
  "ios": {
    "bundleIdentifier": "com.anonymous.reporeactnativeoidc"
  },
  scheme: process.env.NATIVE_SCHEME_URI,
  autolinking: {
    searchPaths: [
      "../../node_modules",
      "../../packages"
    ]
  },
  intentFilters: [
    {
      action: "VIEW",
      autoVerify: true,
      data: [
        {
          scheme: process.env.NATIVE_SCHEME_URI
        }
      ],
      category: ["BROWSABLE", "DEFAULT"]
    }
  ],
  "plugins": [
    "expo-font",
    "expo-router",
    [
      "expo-build-properties",
      {
        "ios": {
          "newArchEnabled": true
        },
        "android": {
          "newArchEnabled": true
        }
      }
    ]
  ]
});