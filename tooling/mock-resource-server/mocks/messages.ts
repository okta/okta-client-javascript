import { Router } from 'express';
import { faker } from '@faker-js/faker';

export const messagesRouter = Router();

let acrCounter = 0;
const acrError = [
  'DPoP error="insufficient_user_authentication"',
  'error_description="A different authentication level is required"',
  'acr_values="urn:okta:loa:1fa:any"',
  'max_age=5'
].join(', ');

messagesRouter.get('/messages', (req, res) => {
  // mocks "insufficient_user_authentication" errors
  if (req.query?.acr) {
    acrCounter += 1;
    if (acrCounter > 1 && acrCounter % 2) {
      res.setHeader('www-authenticate', acrError);
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }
  }

  const numOfMsg = faker.number.int({ min: 4, max: 12 });
  const messages = Array.from({ length: numOfMsg }, () => faker.word.words({ count: { min: 4, max: 8 } }));

  res.json(messages);
});
