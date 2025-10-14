// this is required to test on lower versions of Node
if (!global.crypto) {
  const crypto = require('node:crypto');
  global.crypto = crypto;
}

// "stores" platform (node environment's) fetch implementation, in case it's needed
global.platformFetch = fetch;
// by default, don't allow network requests to be made
global.fetch = () => {
  throw new Error(`
ERROR: FETCH CALL MADE TO OUTSIDE RESOURCE!
The test most likely has flawed logic, like a
missing resource request mock
  `);
}
