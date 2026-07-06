#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage:');
  console.error('  node update-package-version.js <package.json path> <version>');
  console.error('  node update-package-version.js --all <version>');
  process.exit(1);
}

const publishablePackages = [
  'packages/core/package.json',
  'packages/materials/vue-opentiny-vue/package.json',
  'packages/materials/angular-opentiny-ng/package.json',
  'packages/chat-completions/package.json',
  'packages/frameworks/vue/package.json',
  'packages/server/package.json',
  'packages/frameworks/angular/package.json',
];

/**
 * 将指定 package.json 的 version 字段更新为目标版本。
 *
 * @param {string} pkgPathArg - package.json 相对或绝对路径
 * @param {string} version - 目标 semver
 */
function updatePackageVersion(pkgPathArg, version) {
  const pkgPath = path.resolve(process.cwd(), pkgPathArg);

  if (!fs.existsSync(pkgPath)) {
    console.error(`File not found: ${pkgPath}`);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Updated ${pkgPathArg} -> ${version}`);
}

if (args[0] === '--all') {
  const version = args[1];
  if (!version) {
    console.error('Missing version for --all');
    process.exit(1);
  }
  publishablePackages.forEach((pkgPath) => updatePackageVersion(pkgPath, version));
} else {
  updatePackageVersion(args[0], args[1]);
}
