---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Okta Client JavaScript"
  text: "Secure Your JavaScript Apps"
  tagline: Okta's Client SDK for JavaScript/TypeScript projects
  image:
    light: logo-lightmode.svg
    dark: logo-darkmode.svg
    alt: Okta
  actions:
    - theme: brand
      text: Getting Started
      link: /docs
    - theme: alt
      text: API Docs
      link: /api

features:
  - title: Developer Experience
    details: All primary developer scenarios should be accomplished simply with one line of code.<br><br>Composable and sensible classes that follow rational naming conventions allow you to "discover" APIs without the need for documentation, but with inline API documentation when you need it.
  - title: Security & Defaults OOTB
    details: All features "Do The Right Thing" out of the box, with sensible defaults, security-first approaches, and default implementations of all overridable interfaces pre-assigned.<br><br>All core business logic uses interfaces to support customization or replacement without requiring the code to be forked.
  - title: Modular Ecosystem
    details: SDK components are modularized, allowing developers to pull in just the features they need.<br><br>SDK libraries can be extended, with higher-order abstractions or capabilities added over time.
---

## Easily Make Authenticated Resources Requests
```typescript
// ###### auth.ts ######
export const client = new OAuth2Client(...);
const flow = new AuthorizationCodeFlow(client, {
  redirectUri: `${window.location.origin}/login/callback`,
});

export const orchestrator = new AuthorizationCodeFlowOrchestrator(flow);

// ###### resourceClient.ts ######
import { orchestrator } from './auth';

export const fetchClient = new FetchClient(orchestrator);

// ###### components/messages.tsx ######
import { fetchClient } from '../auth';

async function fetchMessages () {
  const response = await fetchClient.fetch('/api/messages');
  return response.json();
};

export function Messages () {
  // render messages
}
```