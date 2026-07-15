import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, '../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const replaceOutputPath = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.replace('output/', '');
  }
  if (Array.isArray(value)) {
    return value.map(replaceOutputPath);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, replaceOutputPath(val)]),
    );
  }
  return value;
};

const outputPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  author: packageJson.author,
  license: packageJson.license,
  homepage: packageJson.homepage,
  repository: packageJson.repository,
  bugs: packageJson.bugs,
  keywords: packageJson.keywords,
  main: packageJson.main.replace('output/', ''),
  types: packageJson.types.replace('output/', ''),
  type: packageJson.type,
  files: packageJson.files,
  dependencies: { ...packageJson.dependencies },
  exports: replaceOutputPath(packageJson.exports),
  bin: replaceOutputPath(packageJson.bin),
};

const outputDir = join(__dirname, '../output');

writeFileSync(
  join(outputDir, 'package.json'),
  `${JSON.stringify(outputPackageJson, null, 2)}\n`,
  'utf-8',
);
copyFileSync(join(__dirname, '../README.md'), join(outputDir, 'README.md'));
