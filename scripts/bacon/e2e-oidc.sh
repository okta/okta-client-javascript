#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup-e2e.sh

create_log_group "E2E OIDC"

export TEST_NAME="redirect-model"

if ! yarn workspace @repo/wdio-e2e start; then
  echo "e2e tests failed! Exiting..."
  log_extra_dir_as_zip ${E2E_LOG_DIR} "e2e-logs.zip"
  exit ${TEST_FAILURE}
fi

finish_log_group $?

exit ${SUCCESS}
