#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

create_log_group "E2E Setup"

setup_service java 1.8.222
setup_service google-chrome-stable 121.0.6167.85-1

export E2E_LOG_DIR=/tmp/e2e-logs

export ISSUER=https://jperreault-test.okta.com
export SPA_CLIENT_ID=0oa134a119yTnBMUl1t8
export DPOP_CLIENT_ID=0oa134a2ztzXFBDZU1t8
export USERNAME=mary@acme.com
get_terminus_secret "/" PASSWORD PASSWORD

start_e2e_runner () {
  if ! yarn workspace @repo/wdio-e2e start; then
    echo "e2e tests failed! Exiting..."
    log_extra_dir_as_zip ${E2E_LOG_DIR} "e2e-logs.zip"
    exit ${TEST_FAILURE}
  fi
}

if [[ -z "${PASSWORD}" ]]; then
  echo "No PASSWORD has been set! Exiting..."
  exit ${TEST_FAILURE}
fi

if ! yarn build:sdks; then
  echo "build failed! Exiting..."
  exit ${FAILED_SETUP}
fi

finish_log_group $?
