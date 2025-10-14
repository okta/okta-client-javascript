# Running Test Apps

> Make sure you have already followed the instructions in [Getting Started](../../README.md#getting-started-with-this-repo)

## Setup

1. [Set up an App with our Okta Org](#set-up-a-app-with-our-okta-org)
2. [Add a `testenv` file](#add-a-testenv-file)
3. [Run the test app](#run-the-test-app)

> Some test apps will require additional setup specific to that test app


## Set up a App in our Okta Org

1. Sign into the Okta Admin Console of your test org
2. Select "Applications > Applications > Create App Integration"
3. In the wizard, entry the following values
    * Sign-in method: `OIDC`
    * Application type: `Single-Page Application` (aka SPA)
    * Enable Grant Types: `Authorization Code` and `Refresh Token`
    * Sign-in redirect URIS: `http://localhost:8080/login/callback`
    * Logout redirect URIS: `http://localhost:8080/logout`

> It may be worth creating 2 apps, one with DPoP and one without


## Add a `testenv` file

Add a file named `testenv` at top-level of this repo (same directory as `turbo.json`)

In this file, put the following values found in your Okta Application:
```
# testenv
ISSUER="https://{org-id}.okta(preview)?.com/"

# Non-DPoP samples
SPA_CLIENT_ID="somestringvalue"

# For DPoP samples
DPOP_CLIENT_ID="someotherstringvalue"

```


## Run the test app
Lastly, run the test app
```bash
cd ./{sample-app}
yarn dev
```