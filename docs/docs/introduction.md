---
slug: /
id: "intro"
title: "Ecosystem Introduction"
sidebar_label: "Introduction"
custom_edit_url: null
toc_max_heading_level: 4
---

## Design Goals
Auth is hard. OAuth can be even harder; both to understand as well as implement. The goal of this ecosystem of SDKs is to enable developers to seemlessly integrate OAuth into their Web Apps without the need to comprehensively understand all the intricacies of the spec

## Package Overview

#### Foundational SDK
* `@okta/auth-foundation` -  Foundational library on which all other SDKs are built

#### Token Acquisition SDKs
  * `@okta/spa-oauth2-flows` - Implementations of OAuth2 flows designed for Browser-based environments (emphasising SPA-based architectures)
  * `@okta/direct-auth`- *COMING SOON!*
  * `@okta/spa-idx` - *COMING SOON!*

#### Token Management / Platform SDKs
  * `@okta/spa-platform` - Provides utilities for mangaging token lifecycles, storing tokens, synchronizing browser tabs, and requesting protected resources; designed for Browser-based environments (emphasising SPA-based architectures)
