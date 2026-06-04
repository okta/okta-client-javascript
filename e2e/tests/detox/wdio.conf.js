/*!
 * Copyright (c) 2015-present, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * 
 * See the License for the specific language governing permissions and limitations under the License.
 */

require('@repo/env').setEnvironmentVarsFromTestEnv(__dirname);
// require('@babel/register'); // Allows use of import module syntax
// require('regenerator-runtime'); // Allows use of async/await

const DEBUG = process.env.DEBUG;
const CI = process.env.CI === 'true' || process.env.CI === true;
const defaultTimeoutInterval = DEBUG ? (24 * 60 * 60 * 1000) : 120000;
const logLevel = CI ? 'warn' : 'info';

exports.config = {
  jasmineOpts: {
    defaultTimeoutInterval,
    stopSpecOnExpectationFailure: false
  },
  runner: 'local',
  specs: [
    '**/*.spec.js'
  ],
  
  maxInstances: 1,
  
  capabilities: [{
    platformName: 'iOS',
    'appium:app': process.env.APP_PATH || '../../apps/react-native-oidc/ios/build/Build/Products/Debug-iphonesimulator/reporeactnativeoidc.app',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': process.env.DEVICE_NAME || 'iPhone 15',
    'appium:platformVersion': process.env.PLATFORM_VERSION || '17.2',
  }],
  
  logLevel,
  bail: 0,
  waitforTimeout: 10000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,
  
  services: [
    ['detox', {
      device: {
        type: 'ios.simulator',
        device: {
          type: process.env.DEVICE_NAME || 'iPhone 15'
        }
      },
      app: 'ios.debug',
      configuration: process.env.DETOX_CONFIG || 'ios.sim.debug'
    }]
  ],
  
  framework: 'jasmine',
  
  reporters: [
    'spec',
    ['junit', {
      outputDir: '../../build/reports/e2e/react-native-oidc',
      outputFileFormat: function() {
        return 'junit-results.xml';
      }
    }]
  ],
};
