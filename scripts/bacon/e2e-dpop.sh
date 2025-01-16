#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup-e2e.sh

create_log_group "E2E DPoP"

export TEST_NAME="redirect-model"
export USE_DPOP="true"

if ! yarn workspace @repo/wdio-e2e start; then
  echo "e2e tests failed! Exiting..."
  exit ${TEST_FAILURE}
fi

finish_log_group $?

exit ${SUCCESS}
