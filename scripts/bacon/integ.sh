#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

create_log_group "Integration Tests"
  if ! yarn test:integ; then
    echo "jest tests failed! Exiting..."
    exit ${TEST_FAILURE}
  fi
finish_log_group $?

exit ${SUCCESS}
