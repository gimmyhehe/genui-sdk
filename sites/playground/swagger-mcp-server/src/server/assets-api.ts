import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, Request, Response } from 'express';

const DEFAULT_ASSETS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../assets');

/** 仅允许访问 assets 根目录下的单层文件名（拒绝路径分隔符与 ..） */
function normalizeAssetFilename(filename: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    return null;
  }

  const base = basename(decoded.replace(/^\/+/, ''));
  if (!base || base === '.' || base === '..' || base.includes('..')) {
    return null;
  }
  if (base.includes('/') || base.includes('\\') || base.includes('\0')) {
    return null;
  }

  return base;
}

function resolveSafeAssetPath(assetsDir: string, filename: string): string | null {
  const safeName = normalizeAssetFilename(filename);
  if (!safeName) {
    return null;
  }

  const fullPath = resolve(assetsDir, safeName);
  const rel = relative(assetsDir, fullPath);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return null;
  }

  return fullPath;
}

function contentTypeByFilename(filename: string): string {
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'application/yaml';
  return 'text/plain';
}

export type RegisterAssetsApiOptions = {
  basePath?: string;
  assetsDir?: string;
};

/** 注册 assets 目录 API：列表与读取文件 */
export function registerAssetsApi(
  app: Express,
  { basePath = '/api/assets', assetsDir = DEFAULT_ASSETS_DIR }: RegisterAssetsApiOptions = {},
): void {
  app.get(basePath, async (_req: Request, res: Response) => {
    try {
      const entries = await readdir(assetsDir, { withFileTypes: true });
      const files: Array<{ name: string; size: number }> = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const safeName = normalizeAssetFilename(entry.name);
        if (!safeName || safeName !== entry.name) {
          console.warn('[assets-api] Skipping unsafe entry name:', entry.name);
          continue;
        }

        try {
          const info = await stat(resolve(assetsDir, safeName));
          files.push({ name: safeName, size: info.size });
        } catch (error) {
          console.error('[assets-api] Failed to stat asset:', safeName, error);
        }
      }

      res.json({ files });
    } catch (error) {
      console.error('[assets-api] Failed to list assets:', error);
      res.status(500).json({ error: 'Failed to list assets' });
    }
  });

  app.get(`${basePath}/:filename`, async (req: Request, res: Response) => {
    const safeName = normalizeAssetFilename(req.params.filename);
    if (!safeName) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const filePath = resolveSafeAssetPath(assetsDir, safeName);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      res.type(contentTypeByFilename(safeName)).send(content);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      console.error('[assets-api] Failed to read asset:', safeName, error);
      res.status(500).json({ error: 'Failed to read asset' });
    }
  });
}
