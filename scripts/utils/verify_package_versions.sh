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
    # packages must share the repo's major.minor, but may be ahead on patch (an out-of-band
    # patch release of just that package) -- never behind patch, and never a different major.minor
    if ! node -e "
      const semver = (v) => v.split('.').map(Number);
      const [rM, rm, rp] = semver(process.argv[1]);
      const [pM, pm, pp] = semver(process.argv[2]);
      process.exit(pM === rM && pm === rm && pp >= rp ? 0 : 1);
    " "$repo_version" "$version"; then
      local pkg="${name}@${version}"
      echo "SDK Version Mismatch Detected: $pkg (expected same major.minor as ${repo_version}, patch >= ${repo_version##*.})"
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
