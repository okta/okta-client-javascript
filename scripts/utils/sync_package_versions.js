#!/usr/bin/env node
//
// Run before publishing:
//  1. Verifies every package under `packages/*` is at the same version as the root package.json
//  2. Rewrites in-repo dependency ranges (dependencies/peerDependencies/optionalDependencies)
//     that point at other `packages/*` packages to `~<major>.<minor>.*`, tracking the release
//
// Usage: node scripts/utils/sync_package_versions.js
// Env:
//   DRY_RUN=1  report what would change without writing any files

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies'];
const DRY_RUN = process.env.DRY_RUN === '1';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  const original = fs.readFileSync(file, 'utf8');
  const hadTrailingNewline = original.endsWith('\n');
  const serialized = JSON.stringify(data, null, 2) + (hadTrailingNewline ? '\n' : '');
  fs.writeFileSync(file, serialized);
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(version).trim());
  if (!match) return null;
  const [, major, minor, patch, prerelease] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch), prerelease, raw: version };
}

// ignores `prerelease`, consistent with how `targetRange` below is derived from major.minor only
function compareSemver(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function findPackages() {
  return fs
    .readdirSync(PACKAGES_DIR)
    .map((name) => path.join(PACKAGES_DIR, name))
    .filter((pkgDir) => fs.statSync(pkgDir).isDirectory() && fs.existsSync(path.join(pkgDir, 'package.json')))
    .map((pkgDir) => {
      const file = path.join(pkgDir, 'package.json');
      return { dir: pkgDir, file, json: readJson(file) };
    });
}

function main() {
  const rootJson = readJson(path.join(ROOT, 'package.json'));
  const release = parseSemver(rootJson.version);

  if (!release) {
    console.error(`Root package.json has an invalid version: "${rootJson.version}"`);
    process.exit(1);
  }

  const targetRange = `~${release.major}.${release.minor}.*`;
  const packages = findPackages();
  const packageNames = new Set(packages.map((pkg) => pkg.json.name));

  console.log(`Releasing ${rootJson.version} (in-repo dependency range: ${targetRange})`);

  // 1. every published package must share the root's major.minor, and may be ahead on patch only
  //    (an out-of-band patch release of just that package) -- never behind patch, and never a
  //    different major.minor
  const mismatches = packages
    .filter((pkg) => {
      const pkgVersion = parseSemver(pkg.json.version);
      if (!pkgVersion) return true;
      return pkgVersion.major !== release.major || pkgVersion.minor !== release.minor || compareSemver(pkgVersion, release) < 0;
    })
    .map((pkg) => `${pkg.json.name} is at ${pkg.json.version}, expected ${release.major}.${release.minor}.x (patch >= ${release.patch})`);

  if (mismatches.length) {
    console.error('\nVersion mismatch detected:');
    mismatches.forEach((msg) => console.error(`  - ${msg}`));
    console.error('\nEvery package under packages/* must share the root package.json major.minor (patch may be ahead) before publishing.');
    process.exit(1);
  }

  // 2. point in-repo dependencies at the version being released instead of a loose range
  let changedFiles = 0;
  for (const pkg of packages) {
    let changed = false;
    for (const field of DEP_FIELDS) {
      const deps = pkg.json[field];
      if (!deps) continue;
      for (const depName of Object.keys(deps)) {
        if (depName === pkg.json.name || !packageNames.has(depName)) continue;
        if (deps[depName] !== targetRange) {
          console.log(`  ${pkg.json.name}: ${field}["${depName}"] ${deps[depName]} -> ${targetRange}`);
          deps[depName] = targetRange;
          changed = true;
        }
      }
    }
    if (changed) {
      changedFiles += 1;
      if (!DRY_RUN) writeJson(pkg.file, pkg.json);
    }
  }
  console.log(`${DRY_RUN ? 'Would sync' : 'Synced'} in-repo dependency ranges in ${changedFiles} package(s).`);
}

main();
