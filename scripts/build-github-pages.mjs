/**
 * 构建 homepage、文档（VitePress）、playground-web，合并到仓库根目录 _site/，供 GitHub Pages 上传。
 *
 * 用法（仓库根目录）：
 *   GITHUB_PAGES_REPO_NAME=genui-sdk pnpm build:github-pages
 * CI 中设置 GITHUB_REPOSITORY=owner/repo 即可（工作流已注入）。
 *
 * 本地调试：
 *   node scripts/build-github-pages.mjs
 *   node --inspect-brk scripts/build-github-pages.mjs
 */
import { spawnSync } from 'node:child_process'
import { copyFile, cp, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function repoSlug() {
  if (process.env.GITHUB_PAGES_REPO_NAME) return process.env.GITHUB_PAGES_REPO_NAME
  const gh = process.env.GITHUB_REPOSITORY
  if (gh) return gh.split('/').pop() || 'genui-sdk'
  return 'genui-sdk'
}

function withTrailingSlash(s) {
  return s.endsWith('/') ? s : `${s}/`
}

function run(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
    ...options,
  })
  if (r.error) throw r.error
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function runPnpm(args, options = {}) {
  run('pnpm', args, options)
}

async function main() {
  const repo = repoSlug()
  const siteBase = withTrailingSlash(`/${repo}`)
  process.env.VITEPRESS_BASE = withTrailingSlash(`${siteBase}docs`)
  const playgroundBase = withTrailingSlash(`${siteBase}playground`)

  console.log(`GitHub Pages site base: ${siteBase}`)
  console.log(`VITEPRESS_BASE=${process.env.VITEPRESS_BASE}`)
  console.log(`playground vite --base=${playgroundBase}`)

  console.log('>>> build:homepage')
  runPnpm(['run', 'build:homepage'])

  console.log('>>> build:docs (VitePress)')
  runPnpm(['run', 'build:docs'])

  console.log('>>> prebuild:playground + playground-web (vite)')
  runPnpm(['run', 'prebuild:playground'])
  runPnpm(['exec', 'vite', 'build', `--base=${playgroundBase}`], {
    cwd: path.join(ROOT, 'sites/playground/web'),
  })

  const pgDist = path.join(ROOT, 'sites/playground/web/dist')
  await copyFile(path.join(pgDist, 'index.html'), path.join(pgDist, '404.html'))

  console.log('>>> assemble _site')
  const out = path.join(ROOT, '_site')
  await rm(out, { recursive: true, force: true })
  // 目标不存在时 cp 会把 dist 整棵拷成 _site，等价于 bash 的 dist/. → _site/
  await cp(path.join(ROOT, 'sites/homepage/web/dist'), out, { recursive: true })
  await cp(path.join(ROOT, 'docs/.vitepress/dist'), path.join(out, 'docs'), { recursive: true })
  await cp(path.join(ROOT, 'sites/playground/web/dist'), path.join(out, 'playground'), {
    recursive: true,
  })

  console.log(`Done. Output: ${out}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
