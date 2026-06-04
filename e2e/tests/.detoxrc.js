/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      '$0': 'wdio',
      config: 'detox/wdio.conf.js'
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: '../apps/react-native-oidc/ios/build/Build/Products/Debug-iphonesimulator/reporeactnativeoidc.app',
      build: 'xcodebuild -workspace ../apps/react-native-oidc/ios/reporeactnativeoidc.xcworkspace -scheme reporeactnativeoidc -configuration Debug -sdk iphonesimulator -derivedDataPath ../apps/react-native-oidc/ios/build'
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: '../apps/react-native-oidc/ios/build/Build/Products/Release-iphonesimulator/reporeactnativeoidc.app',
      build: 'xcodebuild -workspace ../apps/react-native-oidc/ios/reporeactnativeoidc.xcworkspace -scheme reporeactnativeoidc -configuration Release -sdk iphonesimulator -derivedDataPath ../apps/react-native-oidc/ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: '../apps/react-native-oidc/android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd ../apps/react-native-oidc/android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      reversePorts: [
        8081
      ]
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: '../apps/react-native-oidc/android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd ../apps/react-native-oidc/android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_3a_API_30_x86'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release'
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug'
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release'
    }
  }
};
