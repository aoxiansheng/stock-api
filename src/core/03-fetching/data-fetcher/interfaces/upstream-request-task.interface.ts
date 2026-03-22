export type UpstreamSymbolExtractor = (row: unknown) => string;
export type UpstreamMergeMode =
  | "merge_by_request_signature"
  | "single_symbol_only";

export interface UpstreamScheduleRequest {
  provider: string;
  capability: string;
  symbols: string[];
  mergeMode?: UpstreamMergeMode;
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
  mergeMode: UpstreamMergeMode;
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
  dispatchScopeKey: string;
  mergeKey: string;
  capability: string;
  provider: string;
  mergeMode: UpstreamMergeMode;
  tasks: UpstreamScheduledTask[];
  symbols: string[];
  symbolExtractor?: UpstreamSymbolExtractor;
}

export interface UpstreamMergeBucket {
  mergeKey: string;
  queueKey: string;
  dispatchScopeKey: string;
  provider: string;
  capability: string;
  mergeMode: UpstreamMergeMode;
  symbols: Set<string>;
  tasks: UpstreamScheduledTask[];
  timer: NodeJS.Timeout | null;
  symbolExtractor?: UpstreamSymbolExtractor;
}

export interface UpstreamQueueState {
  /** 共享调度域键，多个 capability 可能共享同一个 */
  dispatchScopeKey: string;
  pending: UpstreamDispatchEntry[];
  active: boolean;
  lastDispatchAt: number;
  cooldownUntil: number;
}
