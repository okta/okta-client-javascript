#!/bin/bash

source $(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)/../utils/verify_package_versions.sh

cd ${OKTA_HOME}/${REPO}

# This suite parses the .releng.yml file and evaluates the provided promotion branch regular expressions
# to determine if the current branch is a promotion branch. If it is, additional verification is done
# to prevent flawed builds from being promoted. Otherwise the suite passes to unblock bacon

IS_PROMO=0

echo "Evaluating Branch: $BRANCH"

for key in $(yq -r '.promotion | keys | .[]' .releng.yml); do

  if [[ $key = "default" ]]; then
    continue
  fi

  # removes all non-capture groups from regex (replaces with regular group)
  regex=${key//"(?:"/"("}
  # strips substrings '\(' and ')/' from the beginning and end of the yml key (they caused regex not to evaluate)
  regex=${regex#"/("}
  regex=${regex%")/"}

  if echo "$BRANCH" | grep -Eq $regex; then
    # on promotion branch, perform additional verification....
    IS_PROMO=1

    # confirms all SDK versions align within the repo-level version
    echo "On Promotion Branch, verifying consistent package versions..."
    if ! verify_package_versions; then
      echo "Inconsistent versions detected, exiting..."
      exit ${FAILED_SETUP}
    fi
  fi

done

if [[ $IS_PROMO -eq 0 ]]; then
  echo "'$BRANCH' is a feature branch, nothing to do"
fi
