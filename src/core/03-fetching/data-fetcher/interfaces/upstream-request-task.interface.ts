export type UpstreamSymbolExtractor = (row: unknown) => string;

export interface UpstreamScheduleRequest {
  provider: string;
  capability: string;
  symbols: string[];
  requestId?: string;
  options?: Record<string, unknown>;
  execute: (symbolsOverride: string[]) => Promise<unknown>;
  symbolExtractor?: UpstreamSymbolExtractor;
}

export interface UpstreamScheduledTask {
  taskId: string;
  provider: string;
  capability: string;
  queueKey: string;
  mergeKey: string;
  symbols: string[];
  requestId?: string;
  options?: Record<string, unknown>;
  execute: (symbolsOverride: string[]) => Promise<unknown>;
  symbolExtractor?: UpstreamSymbolExtractor;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

export interface UpstreamDispatchEntry {
  taskId: string;
  queueKey: string;
  mergeKey: string;
  capability: string;
  provider: string;
  tasks: UpstreamScheduledTask[];
  symbols: string[];
  symbolExtractor?: UpstreamSymbolExtractor;
}

export interface UpstreamMergeBucket {
  mergeKey: string;
  queueKey: string;
  provider: string;
  capability: string;
  symbols: Set<string>;
  tasks: UpstreamScheduledTask[];
  timer: NodeJS.Timeout | null;
  symbolExtractor?: UpstreamSymbolExtractor;
}

export interface UpstreamQueueState {
  queueKey: string;
  pending: UpstreamDispatchEntry[];
  active: boolean;
  lastDispatchAt: number;
  cooldownUntil: number;
}
