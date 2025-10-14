import express from 'express';
import passport from 'passport';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import envModule from '@repo/env';
import { OIDCStrategy } from './strategy.mjs';


// load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
envModule.setEnvironmentVarsFromTestEnv(__dirname);

// define express app
const app = express();

const tokenStore = new Map();

// enable cookie-based sessions (bff architecture)
app.use(cookieParser());
app.use(express.json());
app.use(session({ secret: 'shhhh', resave: false, saveUninitialized: false }));

// enable passport
app.use(passport.initialize());
app.use(passport.authenticate('session'));

// utility middleware to ensure user is authenticated before accessing a route
function requireAuth (req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.redirect('/login');
  }
  next();
}

// TODO: consider storing accessToken as well
// configures passport; adds OIDC strategy
passport.use(new OIDCStrategy({}, (token, verified) => {
  const claims = token.idToken.claims;
  tokenStore.set(claims.sub, token.idToken);  // stores idToken in cache to be used for logout
  verified(null, claims);
}));
passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  return cb(null, user);
});


// Defines routes
app.get('/', (req, res) => {
  res.send('<h1>NodeJS OIDC Test App</h1>');
});

// Defines UI routes (auth required)
const uiRouter = express.Router();
uiRouter.get('/', (req, res) => {
  res.send('<h1>Success!</h1>');
});

// Defines OIDC routes
app.get('/login', passport.authenticate('oidc'));
app.get('/login/callback', passport.authenticate('oidc'), (req, res) => res.redirect('/app'));
app.get('/logout', async (req, res) => {
  const idToken = tokenStore.get(req.user.sub);
  const oidcSignOutURL = await OIDCStrategy.logout(idToken.rawValue);

  req.logout(() => {
    res.redirect(oidcSignOutURL.href);
  });
});

// Mounts UI router
app.use('/app', requireAuth, uiRouter);

app.listen(8080);
