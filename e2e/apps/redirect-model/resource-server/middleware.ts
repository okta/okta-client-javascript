import { MockLayer } from 'vite-plugin-mock-server';

export const requireBearerToken: MockLayer = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const bearerToken = authHeader.replace('Bearer ', '');
    // TODO: perform real check on token
    if (bearerToken.length > 10) {
      return next();
    }
  }

  res.statusCode = 401;
  res.end('Unauthorized');
};
