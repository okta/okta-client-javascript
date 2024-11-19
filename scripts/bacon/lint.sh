#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

create_log_group "Linter"

if ! yarn lint; then
  echo "linter failed! Exiting..."
  exit ${TEST_FAILURE}
fi

finish_log_group $?

exit ${SUCCESS}
