type Listener = (...args: unknown[]) => void;

export class TemplateStreamEvents {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: Listener) {
    this.listeners.get(event)?.delete(listener);
  }

  once(event: string, listener: Listener) {
    const wrapper: Listener = (...args) => {
      this.off(event, wrapper);
      listener(...args);
    };
    this.on(event, wrapper);
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((listener) => listener(...args));
  }
}

let streamEvents: TemplateStreamEvents | null = null;

export function getTemplateStreamEvents(): TemplateStreamEvents {
  if (!streamEvents) {
    streamEvents = new TemplateStreamEvents();
  }
  return streamEvents;
}
