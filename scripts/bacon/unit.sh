#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

create_log_group "Unit Tests"
  # build is handled by turborepo
  # this will run on node22
  echo "Running browser AND node unit tests on $(node --version)"
  if ! yarn test:unit; then
    echo "jest tests failed! Exiting..."
    exit ${TEST_FAILURE}
  fi
finish_log_group $?

create_log_group "Node 20"
  nvm install 20
  echo "Running node unit tests on $(node --version)"
  if ! yarn test:node; then
    echo "jest tests failed! Exiting..."
    exit ${TEST_FAILURE}
  fi
finish_log_group $?

exit ${SUCCESS}
