const detox = require("detox");
const config = require("../detox.config.js");

beforeAll(async () => {
  await detox.init(config);
});

afterAll(async () => {
  await detox.cleanup();
});
