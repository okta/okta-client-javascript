#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

create_log_group "E2E Setup"

setup_service java 1.8.222
setup_service google-chrome-stable 121.0.6167.85-1

export ISSUER=https://jperreault-test.okta.com
export SPA_CLIENT_ID=0oa134a119yTnBMUl1t8
export DPOP_CLIENT_ID=0oa134a2ztzXFBDZU1t8
export USERNAME=mary@acme.com
get_terminus_secret "/" PASSWORD PASSWORD

if ! yarn build:sdks; then
  echo "build failed! Exiting..."
  exit ${FAILED_SETUP}
fi

finish_log_group $?
