#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WORKSPACE_PROTOCOL = /^workspace:/;
const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * 已从 npm 发布、发布其他包时需从 registry 同步版本的内部包名（白名单）。
 * 仅白名单内的 workspace:* 依赖会被替换为 npm 版本；未列入的保留 workspace 协议。
 */
const SYNC_PUBLISH_PACKAGES = [
  '@opentiny/genui-sdk-core',
  '@opentiny/genui-sdk-materials-vue-opentiny-vue',
  '@opentiny/genui-sdk-materials-angular-opentiny-ng',
  '@opentiny/genui-sdk-chat-completions',
  '@opentiny/genui-sdk-vue',
  '@opentiny/genui-sdk-server',
  '@opentiny/genui-sdk-angular',
];

/**
 * 解析 CLI 参数。
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{
 *   pkgPath: string,
 *   tag: string,
 *   registry: string,
 *   dryRun: boolean,
 *   includeDev: boolean,
 *   packages: string[] | null
 * }}
 */
function parseArgs(argv) {
  if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
    printUsage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  let pkgPath = '';
  let tag = 'latest';
  let registry = resolveDefaultRegistry();
  let dryRun = false;
  let includeDev = false;
  let packages = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    if (arg === '--include-dev') {
      includeDev = true;
      continue;
    }

    if (arg === '--tag') {
      tag = argv[i + 1];
      if (!tag) {
        console.error('Missing value for --tag');
        process.exit(1);
      }
      i += 1;
      continue;
    }

    if (arg === '--registry') {
      registry = argv[i + 1];
      if (!registry) {
        console.error('Missing value for --registry');
        process.exit(1);
      }
      i += 1;
      continue;
    }

    if (arg === '--packages') {
      const value = argv[i + 1];
      if (!value) {
        console.error('Missing value for --packages');
        process.exit(1);
      }
      packages = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }

    if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      printUsage();
      process.exit(1);
    }

    if (!pkgPath) {
      pkgPath = arg;
      continue;
    }

    console.error(`Unexpected argument: ${arg}`);
    printUsage();
    process.exit(1);
  }

  if (!pkgPath) {
    printUsage();
    process.exit(1);
  }

  return { pkgPath, tag, registry, dryRun, includeDev, packages };
}

/**
 * 从仓库或用户目录的 .npmrc 读取 registry，未配置则回退 npmjs 官方源。
 *
 * @returns {string}
 */
function resolveDefaultRegistry() {
  const npmrcPaths = [
    path.join(REPO_ROOT, '.npmrc'),
    path.join(process.cwd(), '.npmrc'),
    path.join(process.env.HOME || '', '.npmrc'),
  ];

  for (const npmrcPath of npmrcPaths) {
    if (!fs.existsSync(npmrcPath)) {
      continue;
    }

    const match = fs.readFileSync(npmrcPath, 'utf8').match(/^registry\s*=\s*(.+)\s*$/m);
    if (match) {
      return match[1].trim();
    }
  }

  return DEFAULT_REGISTRY;
}

/**
 * 从内联白名单或 CLI 参数解析「需从 npm 同步版本」的内部包名列表。
 *
 * @param {{ packages: string[] | null }} options
 * @returns {Set<string>}
 */
function resolveSyncPackageNames(options) {
  const names =
    options.packages && options.packages.length > 0 ? options.packages : SYNC_PUBLISH_PACKAGES;

  return new Set(names);
}

/**
 * 打印脚本用法说明。
 */
function printUsage() {
  console.error(`Usage:
  node scripts/sync-publish-deps-from-npm.js <package.json path> [options]

Options:
  --packages <names>     逗号分隔的包名，覆盖脚本内 SYNC_PUBLISH_PACKAGES 白名单
  --tag <dist-tag>       npm dist-tag，默认 latest
  --registry <url>       npm registry，默认读取 .npmrc，否则 ${DEFAULT_REGISTRY}
  --dry-run              仅打印变更，不写回 package.json
  --include-dev          同时处理 devDependencies

仅 SYNC_PUBLISH_PACKAGES / --packages 白名单内的 workspace:* 依赖会从 npm 同步版本。
`);
}

/**
 * 判断依赖版本是否为 pnpm workspace 协议。
 *
 * @param {string | undefined} versionRange - package.json 中的版本字段
 * @returns {boolean}
 */
function isWorkspaceProtocol(versionRange) {
  return typeof versionRange === 'string' && WORKSPACE_PROTOCOL.test(versionRange);
}

/**
 * 通过 npm CLI 从 registry 读取指定包的 dist-tag 版本号（兼容 .npmrc / 代理环境）。
 *
 * @param {string} packageName - npm 包名
 * @param {string} tag - dist-tag，如 latest / beta
 * @param {string} registry - registry 根 URL
 * @returns {string} semver 版本号
 */
function fetchNpmVersion(packageName, tag, registry) {
  const spec = tag === 'latest' ? packageName : `${packageName}@${tag}`;

  try {
    const output = execFileSync('npm', ['view', spec, 'version', '--registry', registry], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();

    const version = output.split('\n').pop().trim().replace(/^"|"$/g, '');

    if (!version) {
      throw new Error('npm view 未返回 version');
    }

    return version;
  } catch (error) {
    const stderr = error.stderr?.toString?.() || '';
    const stdout = error.stdout?.toString?.() || '';
    const detail = (stderr || stdout || error.message || String(error)).trim();

    if (/404|E404|Not Found|is not in this registry/i.test(detail)) {
      throw new Error(`npm 上未找到 ${packageName}@${tag}（registry: ${registry}）`);
    }

    if (/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|network/i.test(detail)) {
      throw new Error(
        `无法连接 npm registry（${registry}）：${detail}。请检查网络、代理，或在 .npmrc 配置 registry 后重试`,
      );
    }

    throw new Error(`无法从 npm 读取 ${packageName}@${tag}：${detail}`);
  }
}

/**
 * 收集 package.json 中需要同步的 workspace 内部依赖字段。
 *
 * @param {Record<string, any>} pkg - package.json 对象
 * @param {boolean} includeDev - 是否包含 devDependencies
 * @returns {Array<'dependencies' | 'peerDependencies' | 'devDependencies'>}
 */
function getDependencyFields(pkg, includeDev) {
  const fields = ['dependencies', 'peerDependencies'];

  if (includeDev && pkg.devDependencies) {
    fields.push('devDependencies');
  }

  return fields.filter((field) => pkg[field] && typeof pkg[field] === 'object');
}

/**
 * 将单个 package.json 中的 workspace 内部依赖替换为 npm 上的指定 dist-tag 版本。
 *
 * @param {string} pkgPathArg - package.json 路径（相对或绝对）
 * @param {{
 *   tag: string,
 *   registry: string,
 *   dryRun: boolean,
 *   includeDev: boolean,
 *   packages: string[] | null
 * }} options
 * @returns {Array<{ depName: string, field: string, from: string, to: string }>}
 */
function syncPublishDepsFromNpm(pkgPathArg, options) {
  const pkgPath = path.resolve(process.cwd(), pkgPathArg);

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`File not found: ${pkgPath}`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const syncNames = resolveSyncPackageNames(options);
  const fields = getDependencyFields(pkg, options.includeDev);
  const updates = [];
  const skipped = [];

  for (const field of fields) {
    const deps = pkg[field];

    for (const [depName, versionRange] of Object.entries(deps)) {
      if (!isWorkspaceProtocol(versionRange)) {
        continue;
      }

      if (!syncNames.has(depName)) {
        skipped.push({ depName, field, versionRange });
        continue;
      }

      const npmVersion = fetchNpmVersion(depName, options.tag, options.registry);
      updates.push({
        depName,
        field,
        from: versionRange,
        to: npmVersion,
      });
      deps[depName] = npmVersion;
    }
  }

  for (const item of skipped) {
    console.log(
      `跳过 ${item.depName} (${item.field}: ${item.versionRange})：未在白名单中，保留 workspace 协议`,
    );
  }

  if (updates.length === 0) {
    if (skipped.length > 0) {
      console.log(`${pkgPathArg}：无依赖被同步（${skipped.length} 个不在白名单）`);
    } else {
      console.log(`${pkgPathArg}：未发现需同步的 workspace 内部依赖`);
    }
    return updates;
  }

  for (const item of updates) {
    console.log(
      `${item.depName}: ${item.from} -> ${item.to} (${options.tag} @ ${options.registry})`,
    );
  }

  if (!options.dryRun) {
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    console.log(`Updated ${pkgPathArg}`);
  } else {
    console.log('Dry run: package.json was not modified');
  }

  return updates;
}

/**
 * CLI 入口：单包发布前，将 package.json 内 workspace 内部依赖同步为 npm 上的版本。
 *
 * @example
 * # 发布 vue（白名单见脚本内 SYNC_PUBLISH_PACKAGES）
 * node scripts/update-package-version.js packages/frameworks/vue/package.json 1.0.1
 * node scripts/sync-publish-deps-from-npm.js packages/frameworks/vue/package.json
 * pnpm -F @opentiny/genui-sdk-vue build:lib:npm
 * pnpm publish --dir packages/frameworks/vue --access public
 *
 * @example
 * # materials 尚未发布时，仅同步 core
 * node scripts/sync-publish-deps-from-npm.js packages/chat-completions/package.json \\
 *   --packages @opentiny/genui-sdk-core --dry-run
 *
 * @example
 * # 使用 npm beta 通道
 * node scripts/sync-publish-deps-from-npm.js packages/frameworks/vue/package.json --tag beta
 */
function main() {
  const options = parseArgs(process.argv.slice(2));

  try {
    syncPublishDepsFromNpm(options.pkgPath, options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
