#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

create_log_group "Lint: Packages"
if ! yarn lint; then
  echo "linter failed! Exiting..."
  exit ${TEST_FAILURE}
fi
finish_log_group $?

create_log_group "Lint: Lockfile"
if ! yarn lint:lockfile; then
  echo "linter failed! Exiting..."
  exit ${TEST_FAILURE}
fi
finish_log_group $?

create_log_group "Lint: e2e Type Check"
if ! yarn type-check; then
  echo "type-check failed! Exiting..."
  exit ${TEST_FAILURE}
fi
finish_log_group $?

exit ${SUCCESS}
