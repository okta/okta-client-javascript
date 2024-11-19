#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

# Install required dependencies
yarn global add @okta/ci-append-sha
yarn global add @okta/ci-pkginfo

export PATH="${PATH}:$(yarn global bin)"
export TEST_SUITE_TYPE="build"

REGISTRY="${ARTIFACTORY_URL}/api/npm/npm-topic"
npm config set @okta:registry ${REGISTRY}

PACKAGES_PUBLISHED=""

echo "Publishing packages..."
for pkg in ./packages/*
do
  pushd $pkg
    # cut removes `@okta/` prefix, which seems to cause problems with logging functions
    pkg_name=$(jq -r '.name' package.json | cut -c7-)
    create_log_group "Publishing $pkg_name"
    echo "Publishing $pkg_name..."

    # Build
    if ! yarn build; then
      echo "build failed! Exiting..."
      exit ${TEST_FAILURE}
    fi

    # Append a SHA to the version in package.json 
    if ! ci-append-sha; then
      echo "ci-append-sha failed! Exiting..."
      exit $FAILED_SETUP
    fi

    echo $(jq -r 'del(.private)' package.json) > package.json

    if ! npm publish; then
      echo "npm publish failed! Exiting..."
      exit $PUBLISH_ARTIFACTORY_FAILURE
    fi

    artifact_version="$(ci-pkginfo -t pkgname)@$(ci-pkginfo -t pkgsemver)"
    PACKAGES_PUBLISHED="$PACKAGES_PUBLISHED$artifact_version\n"

    msg_key="Published ${pkg_name} Version"
    msg_version="$(ci-pkginfo -t pkgsemver)"
    log_custom_message "${msg_key}" "${msg_version}"

    finish_log_group $?
  popd
done

create_log_group "Result"
echo -e $PACKAGES_PUBLISHED
log_custom_message "All Published Packages" "$(echo -e $PACKAGES_PUBLISHED)"

if upload_job_data global publish_receipt ${PACKAGES_PUBLISHED}; then
  echo "Upload okta-auth-js job data publish_receipt=${PACKAGES_PUBLISHED} to s3!"
else
  # only echo the info since the upload is not crucial
  echo "Fail to upload okta-auth-js job data publish_receipt=${PACKAGES_PUBLISHED} to s3!" >&2
fi
finish_log_group $?
