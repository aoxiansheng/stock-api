import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  UPSTREAM_SCHEDULER_CAPABILITIES,
  UPSTREAM_SCHEDULER_DEFAULT_ALLOWLIST,
  UPSTREAM_SCHEDULER_DEFAULTS,
} from "../constants/upstream-scheduler.constants";
import type {
  UpstreamDispatchEntry,
  UpstreamMergeBucket,
  UpstreamQueueState,
  UpstreamScheduleRequest,
  UpstreamScheduledTask,
  UpstreamSymbolExtractor,
} from "../interfaces/upstream-request-task.interface";
import {
  buildUpstreamMergeKey,
  buildUpstreamQueueKey,
  stableStringify,
} from "../utils/upstream-request-key.util";

@Injectable()
export class UpstreamRequestSchedulerService {
  private readonly logger = createLogger(UpstreamRequestSchedulerService.name);
  private readonly queues = new Map<string, UpstreamQueueState>();
  private readonly mergeBuckets = new Map<string, UpstreamMergeBucket>();
  private readonly activeEntries = new Map<string, UpstreamDispatchEntry>();
  private readonly taskSequence = { current: 0 };
  private readonly enabled = this.parseBoolean(
    process.env.UPSTREAM_SCHEDULER_ENABLED,
    UPSTREAM_SCHEDULER_DEFAULTS.ENABLED,
  );
  private readonly allowlist = this.parseAllowlist(
    process.env.UPSTREAM_SCHEDULER_ALLOWLIST,
  );
  private readonly defaultRps = this.parseInteger(
    process.env.UPSTREAM_SCHEDULER_DEFAULT_RPS,
    UPSTREAM_SCHEDULER_DEFAULTS.DEFAULT_RPS,
    1,
  );
  private readonly minIntervalMs = Math.max(1, Math.floor(1000 / this.defaultRps));
  private readonly maxQueueSize = this.parseInteger(
    process.env.UPSTREAM_SCHEDULER_MAX_QUEUE_SIZE,
    UPSTREAM_SCHEDULER_DEFAULTS.MAX_QUEUE_SIZE,
    1,
  );
  private readonly cooldownMsOn429 = this.parseInteger(
    process.env.UPSTREAM_SCHEDULER_429_COOLDOWN_MS,
    UPSTREAM_SCHEDULER_DEFAULTS.COOLDOWN_MS_ON_429,
    0,
  );
  private readonly quoteMergeWindowMs = this.parseInteger(
    process.env.UPSTREAM_SCHEDULER_QUOTE_MERGE_WINDOW_MS,
    UPSTREAM_SCHEDULER_DEFAULTS.QUOTE_MERGE_WINDOW_MS,
    0,
  );
  private readonly basicInfoMergeWindowMs = this.parseInteger(
    process.env.UPSTREAM_SCHEDULER_BASIC_INFO_MERGE_WINDOW_MS,
    UPSTREAM_SCHEDULER_DEFAULTS.BASIC_INFO_MERGE_WINDOW_MS,
    0,
  );
  private readonly stats = {
    mergedTasks: 0,
    dispatchedTasks: 0,
    cooldownHits: 0,
    maxQueueDepth: 0,
  };

  shouldSchedule(provider: string, capability: string, apiType: "rest" | "stream"): boolean {
    if (!this.enabled || apiType !== "rest") {
      return false;
    }

    const allowlistKey = this.buildAllowlistKey(provider, capability);
    return this.allowlist.has(allowlistKey);
  }

  async schedule(request: UpstreamScheduleRequest): Promise<unknown> {
    const provider = String(request.provider || "").trim().toLowerCase();
    const capability = String(request.capability || "").trim().toLowerCase();
    const queueKey = buildUpstreamQueueKey(provider, capability);
    const normalizedSymbols = this.normalizeSymbols(request.symbols);
    const mergeKey = this.buildMergeKey(provider, capability, request.options || {}, normalizedSymbols);
    const taskId = `${queueKey}:${++this.taskSequence.current}`;

    return await new Promise<unknown>((resolve, reject) => {
      const task: UpstreamScheduledTask = {
        taskId,
        provider,
        capability,
        queueKey,
        mergeKey,
        symbols: normalizedSymbols,
        requestId: request.requestId,
        options: request.options,
        execute: request.execute,
        symbolExtractor: request.symbolExtractor,
        resolve,
        reject,
      };

      this.attachTask(task);
    });
  }

  private attachTask(task: UpstreamScheduledTask): void {
    const mergeWindowMs = this.getMergeWindowMs(task.capability);
    const existingBucket = this.mergeBuckets.get(task.mergeKey);
    if (existingBucket) {
      this.mergeTaskIntoBucket(existingBucket, task);
      this.stats.mergedTasks += 1;
      return;
    }

    if (this.tryMergeIntoPendingEntry(task)) {
      this.stats.mergedTasks += 1;
      return;
    }

    if (this.tryJoinActiveEntry(task)) {
      this.stats.mergedTasks += 1;
      return;
    }

    const bucket: UpstreamMergeBucket = {
      mergeKey: task.mergeKey,
      queueKey: task.queueKey,
      provider: task.provider,
      capability: task.capability,
      symbols: new Set(task.symbols),
      tasks: [task],
      timer: null,
      symbolExtractor: task.symbolExtractor,
    };
    this.mergeBuckets.set(task.mergeKey, bucket);

    if (mergeWindowMs > 0) {
      bucket.timer = setTimeout(() => this.flushMergeBucket(task.mergeKey), mergeWindowMs);
      return;
    }

    bucket.timer = setTimeout(() => this.flushMergeBucket(task.mergeKey), 0);
  }

  private mergeTaskIntoBucket(bucket: UpstreamMergeBucket, task: UpstreamScheduledTask): void {
    bucket.tasks.push(task);
    if (!bucket.symbolExtractor && task.symbolExtractor) {
      bucket.symbolExtractor = task.symbolExtractor;
    }
    for (const symbol of task.symbols) {
      bucket.symbols.add(symbol);
    }
  }

  private tryMergeIntoPendingEntry(task: UpstreamScheduledTask): boolean {
    const queue = this.queues.get(task.queueKey);
    if (!queue || queue.pending.length === 0) {
      return false;
    }

    for (let index = queue.pending.length - 1; index >= 0; index -= 1) {
      const entry = queue.pending[index];
      if (!entry || entry.mergeKey !== task.mergeKey) {
        continue;
      }

      entry.tasks.push(task);
      if (!entry.symbolExtractor && task.symbolExtractor) {
        entry.symbolExtractor = task.symbolExtractor;
      }
      entry.symbols = Array.from(new Set([...entry.symbols, ...task.symbols]));
      return true;
    }

    return false;
  }

  private tryJoinActiveEntry(task: UpstreamScheduledTask): boolean {
    const entry = this.activeEntries.get(task.mergeKey);
    if (!entry) {
      return false;
    }

    const entrySymbols = new Set(entry.symbols);
    const canJoin = task.symbols.every((symbol) => entrySymbols.has(symbol));
    if (!canJoin) {
      return false;
    }

    entry.tasks.push(task);
    if (!entry.symbolExtractor && task.symbolExtractor) {
      entry.symbolExtractor = task.symbolExtractor;
    }
    return true;
  }

  private flushMergeBucket(mergeKey: string): void {
    const bucket = this.mergeBuckets.get(mergeKey);
    if (!bucket) {
      return;
    }

    if (bucket.timer) {
      clearTimeout(bucket.timer);
    }

    this.mergeBuckets.delete(mergeKey);
    const queue = this.getOrCreateQueue(bucket.queueKey);
    if (queue.pending.length >= this.maxQueueSize) {
      const error = new Error(`Upstream scheduler queue overflow: ${bucket.queueKey}`);
      bucket.tasks.forEach((task) => task.reject(error));
      return;
    }

    const entry: UpstreamDispatchEntry = {
      taskId: bucket.tasks.map((task) => task.taskId).join(","),
      queueKey: bucket.queueKey,
      mergeKey: bucket.mergeKey,
      capability: bucket.capability,
      provider: bucket.provider,
      tasks: bucket.tasks,
      symbols: Array.from(bucket.symbols),
      symbolExtractor: bucket.symbolExtractor,
    };

    queue.pending.push(entry);
    this.stats.maxQueueDepth = Math.max(this.stats.maxQueueDepth, queue.pending.length);
    this.logger.debug("上游调度任务入队", {
      queueKey: bucket.queueKey,
      mergeKey: bucket.mergeKey,
      queueDepth: queue.pending.length,
      tasks: bucket.tasks.length,
      symbols: entry.symbols.length,
    });
    void this.processQueue(bucket.queueKey);
  }

  private async processQueue(queueKey: string): Promise<void> {
    const queue = this.getOrCreateQueue(queueKey);
    if (queue.active) {
      return;
    }

    queue.active = true;
    try {
      while (queue.pending.length > 0) {
        await this.waitForDispatchWindow(queue);
        const entry = queue.pending.shift();
        if (!entry) {
          continue;
        }

        queue.lastDispatchAt = Date.now();
        try {
          await this.dispatchEntry(entry);
        } catch (error) {
          if (this.isTooManyRequestsError(error)) {
            queue.cooldownUntil = Date.now() + this.cooldownMsOn429;
            this.stats.cooldownHits += 1;
            this.logger.warn("上游请求触发 429 冷却", {
              queueKey,
              cooldownMs: this.cooldownMsOn429,
              tasks: entry.tasks.length,
            });
          }
        }
      }
    } finally {
      queue.active = false;
    }
  }

  private async dispatchEntry(entry: UpstreamDispatchEntry): Promise<void> {
    const leader = entry.tasks[0];
    if (!leader) {
      return;
    }

    this.activeEntries.set(entry.mergeKey, entry);
    try {
      this.logger.debug("上游调度任务发车", {
        queueKey: entry.queueKey,
        mergeKey: entry.mergeKey,
        tasks: entry.tasks.length,
        symbols: entry.symbols.length,
      });
      const rawResult = await leader.execute(entry.symbols);
      this.stats.dispatchedTasks += 1;
      if (
        this.shouldResolveTasksBySymbol(entry.capability) &&
        entry.tasks.length > 1
      ) {
        this.resolveTasksBySymbol(entry, rawResult);
        return;
      }

      entry.tasks.forEach((task) => task.resolve(rawResult));
    } catch (error) {
      entry.tasks.forEach((task) => task.reject(error));
      throw error;
    } finally {
      this.activeEntries.delete(entry.mergeKey);
    }
  }

  private resolveTasksBySymbol(entry: UpstreamDispatchEntry, rawResult: unknown): void {
    const rows = this.extractRows(rawResult);
    const rowsBySymbol = new Map<string, unknown[]>();

    for (const row of rows) {
      const normalizedSymbol = this.extractNormalizedSymbol(
        row,
        entry.symbolExtractor,
      );
      if (!normalizedSymbol) {
        continue;
      }
      if (!rowsBySymbol.has(normalizedSymbol)) {
        rowsBySymbol.set(normalizedSymbol, []);
      }
      rowsBySymbol.get(normalizedSymbol)!.push(row);
    }

    entry.tasks.forEach((task) => {
      const filteredRows = task.symbols.flatMap(
        (symbol) => rowsBySymbol.get(symbol) || [],
      );
      task.resolve({ data: filteredRows });
    });
  }

  private shouldResolveTasksBySymbol(capability: string): boolean {
    return (
      capability === UPSTREAM_SCHEDULER_CAPABILITIES.GET_STOCK_QUOTE ||
      capability === UPSTREAM_SCHEDULER_CAPABILITIES.GET_STOCK_BASIC_INFO
    );
  }

  getStats(): {
    mergedTasks: number;
    dispatchedTasks: number;
    cooldownHits: number;
    maxQueueDepth: number;
  } {
    return { ...this.stats };
  }

  private extractRows(rawResult: unknown): any[] {
    if (Array.isArray(rawResult)) {
      return rawResult;
    }

    if (
      rawResult &&
      typeof rawResult === "object" &&
      Array.isArray((rawResult as { data?: unknown[] }).data)
    ) {
      return (rawResult as { data: unknown[] }).data as any[];
    }

    return [];
  }

  private extractNormalizedSymbol(
    row: unknown,
    symbolExtractor?: UpstreamSymbolExtractor,
  ): string {
    if (symbolExtractor) {
      try {
        const extracted = symbolExtractor(row);
        const normalizedExtracted = String(extracted || "").trim().toUpperCase();
        if (normalizedExtracted) {
          return normalizedExtracted;
        }
      } catch (error) {
        this.logger.warn("上游分流 symbol 提取器执行失败，回退默认字段", {
          reason: (error as Error).message,
        });
      }
    }

    if (!row || typeof row !== "object") {
      return "";
    }
    const symbol = (row as Record<string, unknown>).symbol;
    return String(symbol || "").trim().toUpperCase();
  }

  private async waitForDispatchWindow(queue: UpstreamQueueState): Promise<void> {
    const now = Date.now();
    if (queue.cooldownUntil > now) {
      await this.sleep(queue.cooldownUntil - now);
    }

    const elapsed = Date.now() - queue.lastDispatchAt;
    if (queue.lastDispatchAt > 0 && elapsed < this.minIntervalMs) {
      await this.sleep(this.minIntervalMs - elapsed);
    }
  }

  private getOrCreateQueue(queueKey: string): UpstreamQueueState {
    const existing = this.queues.get(queueKey);
    if (existing) {
      return existing;
    }

    const queue: UpstreamQueueState = {
      queueKey,
      pending: [],
      active: false,
      lastDispatchAt: 0,
      cooldownUntil: 0,
    };
    this.queues.set(queueKey, queue);
    return queue;
  }

  private getMergeWindowMs(capability: string): number {
    if (capability === UPSTREAM_SCHEDULER_CAPABILITIES.GET_STOCK_QUOTE) {
      return this.quoteMergeWindowMs;
    }
    if (capability === UPSTREAM_SCHEDULER_CAPABILITIES.GET_STOCK_BASIC_INFO) {
      return this.basicInfoMergeWindowMs;
    }
    return 0;
  }

  private buildMergeKey(
    provider: string,
    capability: string,
    options: Record<string, unknown>,
    symbols: string[],
  ): string {
    const market = String(options.market || "").trim().toUpperCase();

    if (capability === UPSTREAM_SCHEDULER_CAPABILITIES.GET_STOCK_QUOTE) {
      return buildUpstreamMergeKey(provider, capability, {
        market,
        realtime: Boolean(options.realtime),
      });
    }

    if (capability === UPSTREAM_SCHEDULER_CAPABILITIES.GET_MARKET_STATUS) {
      return buildUpstreamMergeKey(provider, capability, {
        market,
        signature: stableStringify({
          market,
          symbols,
        }),
      });
    }

    if (capability === UPSTREAM_SCHEDULER_CAPABILITIES.GET_STOCK_BASIC_INFO) {
      return buildUpstreamMergeKey(provider, capability, {
        market,
        signature: stableStringify({
          market,
          options,
        }),
      });
    }

    return buildUpstreamMergeKey(provider, capability, options);
  }

  private buildAllowlistKey(provider: string, capability: string): string {
    return `${String(provider || "").trim().toLowerCase()}:${String(capability || "").trim().toLowerCase()}`;
  }

  private parseAllowlist(rawValue?: string): Set<string> {
    const values = String(rawValue || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const [provider, capability] = item.split(":");
        return this.buildAllowlistKey(provider, capability);
      })
      .filter((item) => item !== ":");

    const fallback = values.length > 0 ? values : [...UPSTREAM_SCHEDULER_DEFAULT_ALLOWLIST];
    return new Set(fallback);
  }

  private parseBoolean(rawValue: string | undefined, fallback: boolean): boolean {
    if (rawValue == null || rawValue.trim() === "") {
      return fallback;
    }
    return rawValue.trim().toLowerCase() !== "false";
  }

  private parseInteger(rawValue: string | undefined, fallback: number, min: number): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.floor(parsed));
  }

  private normalizeSymbols(symbols: string[]): string[] {
    return Array.from(
      new Set(
        (symbols || [])
          .map((symbol) => String(symbol || "").trim().toUpperCase())
          .filter(Boolean),
      ),
    );
  }

  private isTooManyRequestsError(error: unknown): boolean {
    const anyError = error as {
      status?: number;
      response?: { status?: number };
      getStatus?: () => number;
      message?: string;
    };

    const status =
      anyError?.status ||
      anyError?.response?.status ||
      (typeof anyError?.getStatus === "function" ? anyError.getStatus() : undefined);
    if (status === 429) {
      return true;
    }

    const message = String(anyError?.message || "").toLowerCase();
    return message.includes("429") || message.includes("too many requests");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
