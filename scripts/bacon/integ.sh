#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

create_log_group "E2E Setup"

  export ISSUER=https://client-js-sdk.okta.com
  export SPA_CLIENT_ID=0oa134a119yTnBMUl1t8
  export DPOP_CLIENT_ID=0oa134a2ztzXFBDZU1t8
  export NATIVE_CLIENT_ID=0oa1cwih5wuban8wC1t8
  export USERNAME=mary@acme.com
  get_terminus_secret "/" PASSWORD PASSWORD

finish_log_group $?

create_log_group "Integration Tests"
  if ! yarn test:integ; then
    echo "jest tests failed! Exiting..."
    exit ${TEST_FAILURE}
  fi
finish_log_group $?

exit ${SUCCESS}
