#!/bin/bash -e

create_log_group "Setup"

if ! setup_service node v22.13.1 ; then
  echo "Failed to install node"
  exit ${FAILED_SETUP}
fi

if ! npm install -g yarn@1.22.22; then
  echo "Failed to install yarn"
  exit ${FAILED_SETUP}
fi

export PATH="$PATH:$(npm config get prefix)/bin"

cd ${OKTA_HOME}/${REPO}

if ! yarn install --frozen-lockfile --ignore-scripts; then
  echo "yarn install failed! Exiting..."
  exit ${FAILED_SETUP}
fi

export CI=true
finish_log_group $?
