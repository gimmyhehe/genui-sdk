import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

type SessionEntry = {
  transport: StreamableHTTPServerTransport;
  lastActivityAt: number;
};

export type McpSessionRegistryOptions = {
  maxSessions: number;
  idleTtlMs: number;
  /** 空闲清理间隔，默认 idleTtlMs / 2 */
  cleanupIntervalMs?: number;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadMcpSessionRegistryOptionsFromEnv(): McpSessionRegistryOptions {
  const maxSessions = parsePositiveInt(process.env.MCP_MAX_SESSIONS, 64);
  const idleTtlMs = parsePositiveInt(process.env.MCP_SESSION_IDLE_MS, 30 * 60 * 1000);
  return {
    maxSessions,
    idleTtlMs,
    cleanupIntervalMs: Math.max(30_000, Math.floor(idleTtlMs / 2)),
  };
}

/** 有界 MCP HTTP 会话表：限制并发、空闲过期、防止 transports 无限增长 */
export class McpSessionRegistry {
  private readonly sessions = new Map<string, SessionEntry>();
  /** 正在创建、尚未 register 的会话占位，与 size 合计参与容量判断 */
  private pendingCreations = 0;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private readonly options: McpSessionRegistryOptions) {
    const interval = options.cleanupIntervalMs ?? Math.max(30_000, Math.floor(options.idleTtlMs / 2));
    this.cleanupTimer = setInterval(() => this.evictIdle(), interval);
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  get size(): number {
    return this.sessions.size;
  }

  get(sessionId: string): StreamableHTTPServerTransport | undefined {
    const entry = this.sessions.get(sessionId);
    if (!entry) return undefined;
    entry.lastActivityAt = Date.now();
    return entry.transport;
  }

  private occupiedSessionSlots(): number {
    return this.sessions.size + this.pendingCreations;
  }

  /** 是否可创建新会话（会先清理空闲/最久未用会话） */
  canAcceptSession(): boolean {
    this.evictIdle();
    if (this.occupiedSessionSlots() < this.options.maxSessions) {
      return true;
    }
    this.evictOldest(1);
    return this.occupiedSessionSlots() < this.options.maxSessions;
  }

  /**
   * 原子预留一个会话槽（在 register 或 releaseSessionReservation 之前计入容量）。
   * 用于并发 initialize 时避免多个请求同时通过 canAcceptSession 后超限。
   */
  tryReserveSession(): boolean {
    this.evictIdle();
    if (this.occupiedSessionSlots() >= this.options.maxSessions) {
      this.evictOldest(1);
      if (this.occupiedSessionSlots() >= this.options.maxSessions) {
        return false;
      }
    }
    this.pendingCreations += 1;
    return true;
  }

  /** 会话创建失败且未 register 时释放 tryReserveSession 预留的槽位 */
  releaseSessionReservation(): void {
    if (this.pendingCreations > 0) {
      this.pendingCreations -= 1;
    }
  }

  register(sessionId: string, transport: StreamableHTTPServerTransport): void {
    if (this.pendingCreations > 0) {
      this.pendingCreations -= 1;
    }
    this.sessions.set(sessionId, {
      transport,
      lastActivityAt: Date.now(),
    });
  }

  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
    for (const entry of this.sessions.values()) {
      void this.closeTransport(entry.transport);
    }
    this.sessions.clear();
    this.pendingCreations = 0;
  }

  private evictIdle(): void {
    const cutoff = Date.now() - this.options.idleTtlMs;
    for (const [sessionId, entry] of this.sessions) {
      if (entry.lastActivityAt < cutoff) {
        this.removeSession(sessionId, entry);
      }
    }
  }

  private evictOldest(count: number): void {
    if (count <= 0 || this.sessions.size === 0) return;

    const victims = [...this.sessions.entries()]
      .sort((a, b) => a[1].lastActivityAt - b[1].lastActivityAt)
      .slice(0, count);

    for (const [sessionId, entry] of victims) {
      this.removeSession(sessionId, entry);
    }
  }

  private removeSession(sessionId: string, entry: SessionEntry): void {
    this.sessions.delete(sessionId);
    void this.closeTransport(entry.transport);
  }

  private closeTransport(transport: StreamableHTTPServerTransport): void {
    const close = (transport as StreamableHTTPServerTransport & { close?: () => Promise<void> }).close;
    if (typeof close === 'function') {
      void close.call(transport).catch((error: unknown) => {
        console.error('[mcp-session-registry] Failed to close transport:', error);
      });
    }
  }
}
