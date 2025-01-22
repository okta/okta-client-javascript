#!/bin/bash

source $OKTA_HOME/$REPO/scripts/bacon/setup.sh

# Install required dependencies
yarn global add @okta/ci-append-sha
yarn global add @okta/ci-pkginfo

export PATH="${PATH}:$(yarn global bin)"
export TEST_SUITE_TYPE="build"

REGISTRY="${ARTIFACTORY_URL}/api/npm/npm-topic"
npm config set @okta:registry ${REGISTRY}

PUBLISHED_PACKAGES=""
PROMOTABLE_VERSIONS=""

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

    # record the artifact version before the SHA is appended
    artifact_version="$(ci-pkginfo -t pkgname)@$(ci-pkginfo -t pkgsemver)"

    # Append a SHA to the version in package.json 
    if ! ci-append-sha; then
      echo "ci-append-sha failed! Exiting..."
      exit $FAILED_SETUP
    fi

    artifact_version_with_sha="$(ci-pkginfo -t pkgname)@$(ci-pkginfo -t pkgsemver)"

    echo $(jq -r 'del(.private)' package.json) > package.json

    if ! npm publish; then
      echo "npm publish failed! Exiting..."
      exit $PUBLISH_ARTIFACTORY_FAILURE
    fi

    PUBLISHED_PACKAGES="$PUBLISHED_PACKAGES$artifact_version_with_sha\n"
    PROMOTABLE_VERSIONS="$PROMOTABLE_VERSIONS$artifact_version\n"

    msg_key="Published ${pkg_name} Version"
    msg_version="$(ci-pkginfo -t pkgsemver)"
    log_custom_message "${msg_key}" "${msg_version}"

    finish_log_group $?
  popd
done

create_log_group "Result"
PROMOTABLE_VERSIONS=$(echo -e $PROMOTABLE_VERSIONS)

echo -e $PUBLISHED_PACKAGES
log_custom_message "All Published Packages" "$(echo -e $PUBLISHED_PACKAGES)"
# log_custom_message "Promotion Preview" "$(echo -e $PROMOTABLE_VERSIONS)"
log_custom_message "Promotion Preview" "$PROMOTABLE_VERSIONS"

# uploads a publish receipt which contains all packages and versions to be included in a release promotion
if upload_job_data global publish_receipt "${PROMOTABLE_VERSIONS}"; then
  echo "Upload okta-client-javascript publish_receipt=${PROMOTABLE_VERSIONS} to s3!"
else
  # only echo the info since the upload is not crucial
  echo "Fail to upload okta-client-javascript publish_receipt=${PROMOTABLE_VERSIONS} to s3!" >&2
fi
finish_log_group $?
