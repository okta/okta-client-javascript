import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-mermaid-viewer';
import authFoundationSidebar from './typedoc-configs/auth-foundation-sidebar.json';
import oauth2FlowsSiderbar from './typedoc-configs/oauth2-flow-sidebar.json';
import spaPlatformSidebar from './typedoc-configs/spa-platform-sidebar.json';
import RNPlatformSidebar from './typedoc-configs/react-native-platform-sidebar.json';


import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const pkg = require('../../package.json');
const minorVersion = pkg.version.split('.').slice(0, -1).join('.');


// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: "Okta Client JavaScript",
    titleTemplate: 'Okta Client JS',
    description: "",
    cleanUrls: true,
    ignoreDeadLinks: true,
    head: [
      ['link', { rel: 'icon', href: '/favicon.ico' }]
    ],
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      siteTitle: `Okta Client JS (v${minorVersion}-beta)`,
      outline: {
        level: [2, 3]
      },
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Docs', link: '/docs' },
        { text: 'API', link: '/api' },
        // { text: 'Blog', link: '/blog' },
        {
          text: `v${minorVersion} (beta)`,
          items: [
            { text: 'Changelog', link: 'https://github.com/okta/okta-client-javascript/blob/master/CHANGELOG.md' }
          ]
        }
      ],

      sidebar: {
        '/docs/': [
          {
            text: 'Getting Started',
            link: '/docs/index.md'
          },
          {
            text: 'Project Structure',
            link: '/docs/structure.md'
          },
          {
            text: 'Installation',
            link: '/docs/installation.md'
          },
          {
            text: 'Concepts',
            items: [
              {
                text: 'OAuth2',
                link: '/docs/concepts/oauth2.md'
              },
              {
                text: 'Sessions',
                link: '/docs/concepts/sessions.md'
              },
            ]
          },
          {
            text: 'Guides',
            items: [
              {
                text: 'Managing User Credentials',
                link: '/docs/guides/Credential.md'
              },
              {
                text: 'Consuming Tokens Within an Application',
                link: '/docs/guides/TokenOrchestrator.md'
              },
              {
                text: 'Making Authenticated Requests',
                link: '/docs/guides/FetchClient.md'
              },
              // {
              //   text: 'Testing',
              //   link: '/docs/testing/',
              //   items: [

              //   ]
              // }
            ]
          },
          {
            text: 'References',
            items: [
              {
                text: 'Authorization Code Flow',
                link: '/docs/references/authorization_code_flow.md'
              },
            ]
          },
        ],
        '/api/': [
          {
            text: 'auth-foundation',
            link: '/api/auth-foundation/',
            items: authFoundationSidebar
          },
          {
            text: 'oauth2-flows',
            link: '/api/oauth2-flows/',
            items: oauth2FlowsSiderbar
          },
          {
            text: 'spa-platform',
            link: '/api/spa-platform/',
            items: spaPlatformSidebar
          },
          {
            text: 'react-native-platform',
            link: '/api/react-native-platform',
            items: RNPlatformSidebar
          }
        ],
      },

      socialLinks: [
        { icon: 'github', link: 'https://github.com/okta/okta-client-javascript' }
      ]
    },
    mermaid: {
      download: false,
      downloadPng: false
    }
  })
);
