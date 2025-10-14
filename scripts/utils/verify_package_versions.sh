#!/bin/bash

source $(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd)/foreach_workspace.sh

# determine if script is being invoked or sourced
(return 0 2>/dev/null) && sourced=1 || sourced=0

# project directory
pdir=$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )/../.." &> /dev/null && pwd)

declare -a bad_pkgs=()

get_sdk_version () {
  local repo_version=$1
  local name=$(jq '.name' ./package.json | tr -d \'\")
  local version=$(jq '.version' ./package.json | tr -d \'\")

  if [[ $name == \@okta\/* ]]; then
    if [[ "$version" != "$repo_version" ]]; then
      local pkg="${name}@${version}"
      echo "SDK Version Mismatch Detected: $pkg"
      bad_pkgs+=(${pkg})
    fi
  fi
}

verify_package_versions () {
  pushd ${OKTA_HOME}/${REPO} > /dev/null
  local repo_version=$(jq '.version' ./package.json | tr -d \'\")
  foreach_workspace get_sdk_version $repo_version
  popd  > /dev/null

  if [[ -n "$bad_pkgs" ]]; then
    echo ""
    echo "Mismatched Packages:"
    printf '%s\n' "${bad_pkgs[@]}"
    echo ""
    echo "Mismatched versions found, exiting..."
    exit 1
  fi
}

if [ $sourced -ne 1 ]; then
  verify_package_versions "$@"
fi
