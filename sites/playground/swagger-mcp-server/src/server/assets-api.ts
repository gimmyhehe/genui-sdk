import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express, Request, Response } from 'express';

const ASSETS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../assests');

function resolveSafeAssetPath(filename: string): string | null {
  const normalized = decodeURIComponent(filename).replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    return null;
  }

  const fullPath = resolve(ASSETS_DIR, normalized);
  const rel = relative(ASSETS_DIR, fullPath);
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

/** 注册 assests 目录 API：列表与读取文件 */
export function registerAssetsApi(app: Express, basePath = '/api/assets'): void {
  app.get(basePath, async (_req: Request, res: Response) => {
    try {
      const entries = await readdir(ASSETS_DIR, { withFileTypes: true });
      const files = await Promise.all(
        entries
          .filter((e) => e.isFile())
          .map(async (e) => {
            const filePath = resolve(ASSETS_DIR, e.name);
            const info = await stat(filePath);
            return { name: e.name, size: info.size };
          }),
      );

      res.json({ directory: ASSETS_DIR, files });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  app.get(`${basePath}/:filename`, async (req: Request, res: Response) => {
    const filePath = resolveSafeAssetPath(req.params.filename);
    if (!filePath) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      res.type(contentTypeByFilename(req.params.filename)).send(content);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });
}
