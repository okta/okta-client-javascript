import { ConfigContext } from 'expo/config';
import envModule from '@repo/env';


envModule.setEnvironmentVarsFromTestEnv(__dirname);
const env: any = {};
// List of environment variables made available to the app
['ISSUER', 'NATIVE_CLIENT_ID', 'USE_DPOP'].forEach((key) => {
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
  "android": {
    "package": "com.anonymous.reporeactnativeoidc"
  },
  "ios": {
    "bundleIdentifier": "com.anonymous.reporeactnativeoidc"
  },
  scheme: "com.oktapreview.jperreault-test",
  intentFilters: [
    {
      action: "VIEW",
      autoVerify: true,
      data: [
        {
          scheme: "com.oktapreview.jperreault-test"
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