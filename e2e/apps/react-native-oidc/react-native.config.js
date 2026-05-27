const path = require('path');

module.exports = {
  dependencies: {
    '@okta/react-native-webcrypto-bridge': {
      root: path.resolve(__dirname, '../../packages/react-native-webcrypto-bridge'),
    },
    '@okta/react-native-platform': {
      root: path.resolve(__dirname, '../../packages/react-native-platform'),
    },
  },
};
