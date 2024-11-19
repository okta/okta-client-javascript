# Website

This website is built using [Docusaurus 2](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

To deploy to docs page https://spa-cred.netlify.app

1. Make Netlify account via __public__ okta github account (https://app.netlify.com/signup)
    * jared.perreault@okta.com may need to add you to a Netlify Team
2. Install `netlify` cli via `npm i netlify-cli -g`  (uses node18) ([docs](https://docs.netlify.com/cli/get-started/#installation))
3. run `netlify login`
4. run docs build via `yarn build:docs`
5. To deploy, follow instructions at https://docs.netlify.com/cli/get-started/#manual-deploys
    * From repo dir: `netlify deploy --dir=docs/build`
    * add `--prod` to the above command once demo is verified