#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup-e2e.sh

create_log_group "E2E DPoP"

export TEST_NAME="redirect-model"
export USE_DPOP="true"

start_e2e_runner

finish_log_group $?

exit ${SUCCESS}
