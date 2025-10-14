import { MockHandler } from 'vite-plugin-mock-server';
import { faker } from '@faker-js/faker';

let arcCounter = 0;
const acrError = `DPoP ${[
  'error="insufficient_user_authentication"',
  'error_description="A different authentication level is required"',
  'acr_values="urn:okta:loa:1fa:any"',
  'max_age=5'
].join(', ')}`;

function mockMessages (req, res) {
  const numOfMsg = faker.number.int({ min: 4, max: 12 });
  const messages = Array(numOfMsg).fill(1).map(() => faker.word.words({ count: { min: 4, max: 8 } }));

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(messages));
}

const mocks: MockHandler[] = [
  {
    pattern: '/api/messages',
    handle: (req, res) => {
      // mocks "insufficient_user_authentication" errors
      if (req.query?.acr) {
        arcCounter += 1;
        if (arcCounter > 1 && arcCounter % 2) {
          // send acr_values error
          res.setHeader('www-authenticate', acrError);

          res.statusCode = 401;
          return res.end('Unauthorized');
        }
      }

      return mockMessages(req, res);
    },
  }
];

export default mocks;
