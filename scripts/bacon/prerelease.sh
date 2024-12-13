#!/bin/bash

source $(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)/../utils/verify_package_versions.sh

# This suite parses the .releng.yml file and evaluates the provided promotion branch regular expressions
# to determine if the current branch is a promotion branch. If it is, additional verification is done
# to prevent flawed builds from being promoted. Otherwise the suite passes to unblock bacon

for key in $(yq '.promotion | keys | .[0,1]' .releng.yml); do

  # strips substrings '\(' and ')/' from the beginning and end of the yml key (they caused regex not to evaluate)
  regex="${key#\/(}"
  regex="${regex%)\/}"

  if echo "$BRANCH" | grep -Eq $regex; then
    # on promotion branch, perform additional verification....

    # confirms all SDK versions align within the repo-level version
    echo "On Promotion Branch, verifying consistent package versions..."
    if ! verify_package_versions; then
      exit ${FAILED_SETUP}
    fi

  fi
done
