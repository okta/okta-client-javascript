// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.oceanicNext;

const groupOrder = [
  'Initializer', 'Constructors', 'Factory Methods', 'Static Accessors', 'Static Methods', 
  'Events', 'Properties', 'Accessors', 'Methods', 'OAuth2 Methods', 'Helper Methods', '*'
];

const typedocBase = {
  tsconfig: './tsconfig.json',
  groupOrder,
  sort: ['static-first', 'source-order'],
  excludeInternal: true,
  disableSources: true,
  useTsLinkResolution: false,
  watch: true,
  // skipErrorChecking: true
};

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'JS OAuth Client SDKs',
  tagline: 'Credential Manager for OAuth2/OIDC SPA Applications',
  favicon: 'img/favicon.ico?foo',

  // Set the production url of your site here
  url: 'https://atko-eng.github.io',   // TODO: update this once repo is migrated
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'atko-eng', // TODO: update this once repo is migrated
  projectName: 'JS OAuth Client SDKs', // Usually your repo name.
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        ...typedocBase,
        id: 'auth-foundation',
        entryPoints: [
          '../packages/auth-foundation/src/index.ts',
          '../packages/auth-foundation/src/client.ts',
        ],
        out: 'docs/api/auth-foundation',
      }
    ],
    [
      'docusaurus-plugin-typedoc',
      {
        ...typedocBase,
        id: 'spa-oauth2-flows',
        entryPoints: [
          '../packages/spa-oauth2-flows/src/index.ts',
        ],
        out: 'docs/api/spa-oauth2-flows',
      }
    ],
    [
      'docusaurus-plugin-typedoc',
      {
        ...typedocBase,
        id: 'spa-platform',
        entryPoints: [
          '../packages/spa-platform/src/index.ts',
        ],
        out: 'docs/api/spa-platform',
      }
    ],
    [
      '@docusaurus/theme-classic',
      ({
        customCss: require.resolve('./src/css/custom.css'),
      })
    ],
    [
      '@docusaurus/plugin-content-docs',
      ({
        routeBasePath: '/',
        sidebarPath: require.resolve('./sidebars.js'),
      })
    ]
  ],

  themeConfig:
    ({
      // Replace with your project's social card
      // image: 'img/docusaurus-social-card.jpg',
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true
      },
      navbar: {
        title: 'JS OAuth Client SDKs',
        logo: {
          alt: 'Okta Logo',
          src: 'img/logo-lightmode.svg',
          srcDark: 'img/logo-darkmode.svg'
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'apiSidebar',
            position: 'right',
            label: 'API Docs',
          },
          {
            href: 'https://github.com/facebook/docusaurus',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Docs',
                to: '/',
              },
              {
                label: 'Developer Docs',
                to: 'https://developer.okta.com/'
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Okta Forum',
                href: 'https://devforum.okta.com/',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Support',
                to: 'https://support.okta.com',
              },
              {
                label: 'GitHub',
                // TODO: update link
                href: 'https://github.com/atko-eng/spa-credential-manager',
              },
            ],
          },
        ],
        // copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
