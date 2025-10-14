#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup-e2e.sh

create_log_group "E2E: Browser OIDC"

  export TEST_NAME="redirect-model"

  start_e2e_runner

finish_log_group $?


create_log_group "E2E: NodeJS OIDC"

  export TEST_NAME="express-oidc"

  start_e2e_runner

finish_log_group $?



exit ${SUCCESS}
