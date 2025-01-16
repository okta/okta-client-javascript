import { MockHandler } from 'vite-plugin-mock-server';
import { faker } from '@faker-js/faker';

const mocks: MockHandler[] = [
  {
    pattern: '/api/messages',
    handle: (req, res) => {
      const numOfMsg = faker.number.int({ min: 4, max: 12 });
      const messages = Array(numOfMsg).fill(1).map(() => faker.word.words({ count: { min: 4, max: 8 } }));

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(messages));
    },
  }
];

export default mocks;
