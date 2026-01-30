const path = require("path");

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: "jest",
  runnerConfig: path.join(__dirname, "e2e", "jest.config.js"),

  specs: "e2e/*.test.js",
  artifacts: {
    rootDir: "e2e/artifacts",
    plugins: {
      log: { enabled: true },
      screenshot: { enabled: true },
      video: { enabled: true },
      instruments: { enabled: false },
      timeline: { enabled: false },
    },
  },

  apps: {
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build: "cd android && ./gradlew assembleDebug",
    },
    "ios.debug": {
      type: "ios.app",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/reporeactnativeoidc.app",
      build:
        "xcodebuild -workspace ios/reporeactnativeoidc.xcworkspace " +
        "-scheme reporeactnativeoidc " +
        "-configuration Debug " +
        "-sdk iphonesimulator " +
        "-derivedDataPath ios/build",
    },
  },

  devices: {
    emulator: {
      type: "android.emulator",
      device: {
        avdName: "Pixel_5_API_3.1",
      },
    },
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 16e",
      },
    },
  },

  configurations: {
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug",
    },
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
  },
};
