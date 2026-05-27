import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

type SessionEntry = {
  transport: StreamableHTTPServerTransport;
  lastActivityAt: number;
};

export type McpSessionRegistryOptions = {
  maxSessions: number;
  idleTtlMs: number;
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

export class McpSessionRegistry {
  private readonly sessions = new Map<string, SessionEntry>();
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

  canAcceptSession(): boolean {
    this.evictIdle();
    if (this.occupiedSessionSlots() < this.options.maxSessions) {
      return true;
    }
    this.evictOldest(1);
    return this.occupiedSessionSlots() < this.options.maxSessions;
  }

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
