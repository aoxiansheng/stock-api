import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import Redis from "ioredis";

import {
  BasicCacheService,
  CACHE_REDIS_CLIENT_TOKEN,
} from "@core/05-caching/module/basic-cache";
import { createLogger } from "@common/logging/index";

export interface ChartIntradayOwnerContext {
  ownerIdentity: string;
}

export interface ChartIntradayUpstreamContext {
  symbol: string;
  market: string;
  provider: string;
  wsCapabilityType: string;
  clientId: string;
}

export interface ChartIntradaySessionRecord
  extends ChartIntradayUpstreamContext,
    ChartIntradayOwnerContext {
  sessionId: string;
  upstreamKey: string;
  createdAt: number;
  lastSeenAt: number;
  runtimeOwnerId: string | null;
  boundClientIds: Set<string>;
}

export interface ReleasedChartIntradaySessionRecord
  extends ChartIntradaySessionRecord {
  releasedAt: number;
}

export interface ChartIntradayUpstreamReleaseState {
  upstreamKey: string;
  state: "scheduled" | "released";
  graceExpiresAt: string | null;
  updatedAt: number;
}

export interface ChartIntradayUpstreamRecord
  extends ChartIntradayUpstreamContext {
  upstreamKey: string;
  activeSessionCount: number;
}

interface SerializedChartIntradaySessionRecord
  extends ChartIntradayUpstreamContext,
    ChartIntradayOwnerContext {
  sessionId: string;
  upstreamKey: string;
  createdAt: number;
  lastSeenAt: number;
  runtimeOwnerId: string | null;
  boundClientIds: string[];
}

interface SerializedReleasedChartIntradaySessionRecord
  extends SerializedChartIntradaySessionRecord {
  releasedAt: number;
}

interface SerializedChartIntradayUpstreamReleaseState
  extends ChartIntradayUpstreamReleaseState {}

interface SerializedChartIntradayUpstreamRecord
  extends ChartIntradayUpstreamContext {
  upstreamKey: string;
}

export interface CreateChartIntradaySessionResult {
  session: ChartIntradaySessionRecord;
  upstream: ChartIntradayUpstreamRecord;
  upstreamCreated: boolean;
}

export interface TouchChartIntradaySessionResult {
  session: ChartIntradaySessionRecord;
  upstream: ChartIntradayUpstreamRecord;
}

export interface ReleaseChartIntradaySessionResult {
  releasedSession: ReleasedChartIntradaySessionRecord;
  upstream: ChartIntradayUpstreamRecord;
  activeSessionCount: number;
  releaseState: "released" | "already_released";
}

export interface ExpiredChartIntradaySessionResult {
  expiredSessions: ChartIntradaySessionRecord[];
  idleUpstreamKeys: string[];
}

export interface UnbindChartIntradayClientSessionsParams {
  clientId: string;
  symbols: string[];
}

export interface ChartIntradayWsSessionContext
  extends ChartIntradayOwnerContext {
  sessionId: string;
  symbol: string;
  provider?: string;
  market?: string;
  runtimeOwnerId?: string;
}

export function buildChartIntradayOwnerIdentity(subject?: {
  appKey?: string;
  userId?: string;
  id?: string;
}): string {
  const userId = String(subject?.userId || subject?.id || "").trim();
  if (userId) {
    return `user:${userId}`;
  }

  const appKey = String(subject?.appKey || "").trim();
  if (appKey) {
    return `appkey:${appKey}`;
  }

  return "anonymous:chart-intraday";
}

@Injectable()
export class ChartIntradaySessionService implements OnModuleDestroy {
  private static readonly SESSION_CACHE_KEY_PREFIX =
    "chart-intraday:session:v1:";
  private static readonly RELEASED_SESSION_CACHE_KEY_PREFIX =
    "chart-intraday:released-session:v1:";
  private static readonly RELEASE_LOCK_CACHE_KEY_PREFIX =
    "chart-intraday:release-lock:v1:";
  private static readonly UPSTREAM_CACHE_KEY_PREFIX =
    "chart-intraday:upstream:v1:";
  private static readonly UPSTREAM_COUNT_CACHE_KEY_PREFIX =
    "chart-intraday:upstream-count:v1:";
  private static readonly UPSTREAM_RELEASE_STATE_CACHE_KEY_PREFIX =
    "chart-intraday:upstream-release-state:v1:";
  private static readonly RELEASE_LOCK_COMPARE_AND_DELETE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;
private static readonly RELEASE_SESSION_COMMIT_SCRIPT = `
if redis.call("GET", KEYS[1]) ~= ARGV[1] then
  return {0, 0}
end
local deleted = redis.call("DEL", KEYS[2])
if deleted ~= 1 then
  return {2, 0}
end
local next = redis.call("INCRBY", KEYS[3], -1)
if next < 0 then
  next = 0
  redis.call("SET", KEYS[3], "0")
end
local countTtl = tonumber(ARGV[3])
if countTtl and countTtl > 0 then
  redis.call("EXPIRE", KEYS[3], countTtl)
end
redis.call("SETEX", KEYS[4], tonumber(ARGV[2]), ARGV[4])
return {1, next}
`;

  private readonly logger = createLogger(ChartIntradaySessionService.name);
  private readonly recordTtlSeconds = this.parseInteger(
    process.env.CHART_INTRADAY_SESSION_RECORD_TTL_SECONDS,
    6 * 60 * 60,
    60,
  );
  private readonly releaseLockTtlSeconds = this.parseInteger(
    process.env.CHART_INTRADAY_RELEASE_LOCK_TTL_SECONDS,
    5,
    1,
  );
  private readonly releaseLockWaitMs = this.parseInteger(
    process.env.CHART_INTRADAY_RELEASE_LOCK_WAIT_MS,
    500,
    50,
  );
  private readonly releaseLockPollMs = this.parseInteger(
    process.env.CHART_INTRADAY_RELEASE_LOCK_POLL_MS,
    25,
    5,
  );
  private readonly localClientToSessionIds = new Map<string, Set<string>>();
  private readonly localReleaseGates = new Map<string, Promise<void>>();

  constructor(
    private readonly basicCacheService: BasicCacheService,
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redis?: Redis,
  ) {}

  onModuleDestroy(): void {
    this.localClientToSessionIds.clear();
    this.localReleaseGates.clear();
  }

  async createSession(
    params: ChartIntradayUpstreamContext &
      ChartIntradayOwnerContext & { runtimeOwnerId?: string },
  ): Promise<CreateChartIntradaySessionResult> {
    const upstreamKey = this.buildUpstreamKey(params);
    const now = Date.now();
    const sessionId = `chart_session_${randomUUID().replace(/-/g, "")}`;
    const session: ChartIntradaySessionRecord = {
      ...params,
      sessionId,
      upstreamKey,
      createdAt: now,
      lastSeenAt: now,
      runtimeOwnerId: String(params.runtimeOwnerId || "").trim() || null,
      boundClientIds: new Set<string>(),
    };

    await this.writeSession(session);
    const activeSessionCount = await this.incrementUpstreamActiveCount(
      upstreamKey,
      1,
    );
    await this.writeUpstream({
      ...params,
      upstreamKey,
      activeSessionCount,
    });
    await this.refreshUpstreamTtl(upstreamKey);
    await this.clearUpstreamReleaseState(upstreamKey);

    return {
      session,
      upstream: {
        ...params,
        upstreamKey,
        activeSessionCount,
      },
      upstreamCreated: activeSessionCount === 1,
    };
  }

  async touchSession(
    params: ChartIntradayWsSessionContext,
  ): Promise<TouchChartIntradaySessionResult> {
    const session = await this.getRequiredSession(params.sessionId);
    this.assertSessionMatches(session, params);
    session.lastSeenAt = Date.now();
    const runtimeOwnerId = String(params.runtimeOwnerId || "").trim();
    if (runtimeOwnerId) {
      session.runtimeOwnerId = runtimeOwnerId;
    }
    await this.writeSession(session);
    await this.refreshUpstreamTtl(session.upstreamKey);

    return {
      session,
      upstream: await this.getRequiredUpstream(session.upstreamKey, session),
    };
  }

  async bindClientToSession(
    params: ChartIntradayWsSessionContext & { clientId: string },
  ): Promise<TouchChartIntradaySessionResult> {
    const session = await this.getRequiredSession(params.sessionId);
    this.assertSessionMatches(session, params);
    session.lastSeenAt = Date.now();
    const runtimeOwnerId = String(params.runtimeOwnerId || "").trim();
    if (runtimeOwnerId) {
      session.runtimeOwnerId = runtimeOwnerId;
    }
    if (!session.boundClientIds.has(params.clientId)) {
      session.boundClientIds.add(params.clientId);
    }
    await this.writeSession(session);
    await this.refreshUpstreamTtl(session.upstreamKey);
    this.addLocalClientBinding(params.clientId, session.sessionId);

    return {
      session,
      upstream: await this.getRequiredUpstream(session.upstreamKey, session),
    };
  }

  async releaseSession(
    params: ChartIntradayWsSessionContext,
  ): Promise<ReleaseChartIntradaySessionResult> {
    return this.withLocalReleaseGate(params.sessionId, async () => {
      const deadline = Date.now() + this.resolveReleaseLockWaitMs();
      const releaseLockKey = this.buildReleaseLockCacheKey(params.sessionId);

      while (true) {
        const releasedSession = await this.getReleasedSession(params.sessionId);
        if (releasedSession) {
          return this.buildAlreadyReleasedResult(releasedSession, params);
        }

        const lockToken = `release-lock:${randomUUID()}`;
        const claimed = await this.tryAcquireReleaseLock(releaseLockKey, lockToken);
        if (claimed) {
          try {
            const reloadedReleasedSession = await this.getReleasedSession(
              params.sessionId,
            );
            if (reloadedReleasedSession) {
              return this.buildAlreadyReleasedResult(
                reloadedReleasedSession,
                params,
              );
            }

            const session = await this.getSession(params.sessionId);
            if (!session) {
              const pendingReleasedSession =
                await this.waitForReleasedSessionUntil(params.sessionId, deadline);
              if (pendingReleasedSession) {
                return this.buildAlreadyReleasedResult(
                  pendingReleasedSession,
                  params,
                );
              }
              continue;
            }
            this.assertSessionMatches(session, params);

            const upstream = await this.getRequiredUpstream(
              session.upstreamKey,
              session,
            );

            const persistedReleasedSession: ReleasedChartIntradaySessionRecord = {
              ...session,
              releasedAt: Date.now(),
            };
            const commitResult = await this.commitReleasedSession({
              lockKey: releaseLockKey,
              lockToken,
              session: persistedReleasedSession,
            });
            if (commitResult.status !== "committed") {
              if (commitResult.status === "session_missing") {
                const missingReleasedSession =
                  await this.waitForReleasedSessionUntil(params.sessionId, deadline);
                if (missingReleasedSession) {
                  return this.buildAlreadyReleasedResult(
                    missingReleasedSession,
                    params,
                  );
                }
              }
              continue;
            }
            const activeSessionCount = commitResult.activeSessionCount;
            await this.refreshUpstreamTtl(session.upstreamKey);

            for (const clientId of session.boundClientIds) {
              this.removeLocalClientBinding(clientId, session.sessionId);
            }

            if (activeSessionCount > 0) {
              await this.clearUpstreamReleaseState(session.upstreamKey);
            }

            return {
              releasedSession: persistedReleasedSession,
              upstream: {
                ...upstream,
                activeSessionCount,
              },
              activeSessionCount,
              releaseState: "released",
            };
          } finally {
            await this.releaseReleaseLock(releaseLockKey, lockToken);
          }
        }

        if (Date.now() >= deadline) {
          const releasedSession = await this.getReleasedSession(params.sessionId);
          if (releasedSession) {
            return this.buildAlreadyReleasedResult(releasedSession, params);
          }
          throw new Error("SESSION_RELEASE_IN_PROGRESS");
        }

        await this.sleep(this.releaseLockPollMs);
      }
    });
  }

  async expireSessions(
    sessionTtlMs: number,
  ): Promise<ExpiredChartIntradaySessionResult> {
    const now = Date.now();
    const expiredSessions: ChartIntradaySessionRecord[] = [];
    const idleUpstreamKeys = new Set<string>();
    const sessions = await this.listSessions();

    for (const session of sessions) {
      if (now - session.lastSeenAt < sessionTtlMs) {
        continue;
      }

      const result = await this.releaseSession({
        sessionId: session.sessionId,
        symbol: session.symbol,
        market: session.market,
        provider: session.provider,
        ownerIdentity: session.ownerIdentity,
      });
      expiredSessions.push(result.releasedSession);
      if (result.activeSessionCount === 0) {
        idleUpstreamKeys.add(result.upstream.upstreamKey);
      }
    }

    return {
      expiredSessions,
      idleUpstreamKeys: Array.from(idleUpstreamKeys),
    };
  }

  touchBoundSessions(clientId: string): number {
    const sessionIds = this.localClientToSessionIds.get(clientId);
    if (!sessionIds || sessionIds.size === 0) {
      return 0;
    }

    const targetSessionIds = Array.from(sessionIds);
    void this.touchBoundSessionsAsync(clientId, targetSessionIds);
    return targetSessionIds.length;
  }

  unbindClient(clientId: string): void {
    const localSessionIds = Array.from(
      this.localClientToSessionIds.get(clientId) || [],
    );
    this.localClientToSessionIds.delete(clientId);
    void this.unbindClientAsync(clientId, localSessionIds);
  }

  async unbindClientSessions(
    params: UnbindChartIntradayClientSessionsParams,
  ): Promise<number> {
    const normalizedSymbols = new Set(
      params.symbols
        .map((symbol) => String(symbol || "").trim().toUpperCase())
        .filter(Boolean),
    );
    if (normalizedSymbols.size === 0) {
      return 0;
    }

    const targetSessionIds = Array.from(
      this.localClientToSessionIds.get(params.clientId) || [],
    );
    if (targetSessionIds.length === 0) {
      return 0;
    }

    const sessions = (
      await Promise.all(targetSessionIds.map((sessionId) => this.getSession(sessionId)))
    ).filter((session): session is ChartIntradaySessionRecord => !!session);

    const targetCountBySymbol = new Map<string, number>();
    for (const session of sessions) {
      if (!normalizedSymbols.has(session.symbol)) {
        continue;
      }
      targetCountBySymbol.set(
        session.symbol,
        (targetCountBySymbol.get(session.symbol) || 0) + 1,
      );
    }

    if (targetCountBySymbol.size === 0) {
      return 0;
    }

    let unboundCount = 0;
    for (const session of sessions) {
      const symbolCount = targetCountBySymbol.get(session.symbol) || 0;
      if (!normalizedSymbols.has(session.symbol) || symbolCount !== 1) {
        continue;
      }

      session.boundClientIds.delete(params.clientId);
      await this.writeSession(session);
      this.removeLocalClientBinding(params.clientId, session.sessionId);
      unboundCount += 1;
    }

    return unboundCount;
  }

  async getSession(
    sessionId: string,
  ): Promise<ChartIntradaySessionRecord | null> {
    const normalizedSessionId = String(sessionId || "").trim();
    if (!normalizedSessionId) {
      return null;
    }
    return this.readSession(normalizedSessionId);
  }

  async getRequiredSession(sessionId: string): Promise<ChartIntradaySessionRecord> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }
    return session;
  }

  async getRequiredUpstream(
    upstreamKey: string,
    sessionFallback?: ChartIntradaySessionRecord,
  ): Promise<ChartIntradayUpstreamRecord> {
    const upstream = await this.readUpstream(upstreamKey);
    if (upstream) {
      return upstream;
    }

    if (sessionFallback) {
      return {
        upstreamKey,
        symbol: sessionFallback.symbol,
        market: sessionFallback.market,
        provider: sessionFallback.provider,
        wsCapabilityType: sessionFallback.wsCapabilityType,
        clientId: sessionFallback.clientId,
        activeSessionCount: await this.getUpstreamActiveCount(upstreamKey),
      };
    }

    throw new Error("UPSTREAM_NOT_FOUND");
  }

  async hasActiveSessions(upstreamKey: string): Promise<boolean> {
    return (await this.getUpstreamActiveCount(upstreamKey)) > 0;
  }

  async getReleasedSession(
    sessionId: string,
  ): Promise<ReleasedChartIntradaySessionRecord | null> {
    const normalizedSessionId = String(sessionId || "").trim();
    if (!normalizedSessionId) {
      return null;
    }

    const row =
      await this.basicCacheService.get<SerializedReleasedChartIntradaySessionRecord>(
        this.buildReleasedSessionCacheKey(normalizedSessionId),
      );
    return row ? this.hydrateReleasedSession(row) : null;
  }

  async getUpstreamActiveSessionCount(upstreamKey: string): Promise<number> {
    return this.getUpstreamActiveCount(upstreamKey);
  }

  async getUpstreamReleaseState(
    upstreamKey: string,
  ): Promise<ChartIntradayUpstreamReleaseState | null> {
    const row =
      await this.basicCacheService.get<SerializedChartIntradayUpstreamReleaseState>(
        this.buildUpstreamReleaseStateCacheKey(upstreamKey),
      );
    return row ? { ...row } : null;
  }

  async markUpstreamReleaseScheduled(
    upstreamKey: string,
    graceExpiresAt: string,
  ): Promise<void> {
    await this.basicCacheService.set(
      this.buildUpstreamReleaseStateCacheKey(upstreamKey),
      {
        upstreamKey,
        state: "scheduled",
        graceExpiresAt,
        updatedAt: Date.now(),
      },
      { ttlSeconds: this.recordTtlSeconds },
    );
  }

  async markUpstreamReleased(upstreamKey: string): Promise<void> {
    await this.basicCacheService.set(
      this.buildUpstreamReleaseStateCacheKey(upstreamKey),
      {
        upstreamKey,
        state: "released",
        graceExpiresAt: null,
        updatedAt: Date.now(),
      },
      { ttlSeconds: this.recordTtlSeconds },
    );
  }

  async clearUpstreamReleaseState(upstreamKey: string): Promise<void> {
    await this.basicCacheService.del(
      this.buildUpstreamReleaseStateCacheKey(upstreamKey),
    );
  }

  async deleteUpstream(upstreamKey: string): Promise<void> {
    await Promise.all([
      this.basicCacheService.del(this.buildUpstreamCacheKey(upstreamKey)),
      this.basicCacheService.del(this.buildUpstreamCountCacheKey(upstreamKey)),
    ]);
  }

  async listUpstreams(): Promise<ChartIntradayUpstreamRecord[]> {
    const upstreams = await this.readAllUpstreams();
    return upstreams.filter((upstream) => upstream.activeSessionCount > 0);
  }

  async listIdleUpstreamKeys(): Promise<string[]> {
    const upstreams = await this.readAllUpstreams();
    return upstreams
      .filter((upstream) => upstream.activeSessionCount === 0)
      .map((upstream) => upstream.upstreamKey);
  }

  private async touchBoundSessionsAsync(
    clientId: string,
    sessionIds: string[],
  ): Promise<void> {
    for (const sessionId of sessionIds) {
      const session = await this.readSession(sessionId);
      if (!session) {
        this.removeLocalClientBinding(clientId, sessionId);
        continue;
      }

      session.lastSeenAt = Date.now();
      await this.writeSession(session);
      await this.refreshUpstreamTtl(session.upstreamKey);
    }
  }

  private async unbindClientAsync(
    clientId: string,
    sessionIds: string[],
  ): Promise<void> {
    for (const sessionId of sessionIds) {
      const session = await this.readSession(sessionId);
      if (!session) {
        this.removeLocalClientBinding(clientId, sessionId);
        continue;
      }
      session.boundClientIds.delete(clientId);
      await this.writeSession(session);
      this.removeLocalClientBinding(clientId, sessionId);
    }
  }

  private async listSessions(): Promise<ChartIntradaySessionRecord[]> {
    const keys = await this.scanKeys(
      `${ChartIntradaySessionService.SESSION_CACHE_KEY_PREFIX}*`,
    );
    if (keys.length === 0) {
      return [];
    }

    const rows =
      await this.basicCacheService.mget<SerializedChartIntradaySessionRecord>(
        keys,
      );

    return rows
      .filter(
        (
          session,
        ): session is SerializedChartIntradaySessionRecord => !!session,
      )
      .map((session) => this.hydrateSession(session));
  }

  private async readAllUpstreams(): Promise<ChartIntradayUpstreamRecord[]> {
    const keys = await this.scanKeys(
      `${ChartIntradaySessionService.UPSTREAM_CACHE_KEY_PREFIX}*`,
    );
    if (keys.length === 0) {
      return [];
    }

    const rows =
      await this.basicCacheService.mget<SerializedChartIntradayUpstreamRecord>(
        keys,
      );

    const metas = rows.filter(
      (
        upstream,
      ): upstream is SerializedChartIntradayUpstreamRecord => !!upstream,
    );

    return Promise.all(
      metas.map(async (upstream) => ({
        ...upstream,
        activeSessionCount: await this.getUpstreamActiveCount(upstream.upstreamKey),
      })),
    );
  }

  private addLocalClientBinding(clientId: string, sessionId: string): void {
    let sessionIds = this.localClientToSessionIds.get(clientId);
    if (!sessionIds) {
      sessionIds = new Set<string>();
      this.localClientToSessionIds.set(clientId, sessionIds);
    }
    sessionIds.add(sessionId);
  }

  private removeLocalClientBinding(clientId: string, sessionId: string): void {
    const sessionIds = this.localClientToSessionIds.get(clientId);
    if (!sessionIds) {
      return;
    }

    sessionIds.delete(sessionId);
    if (sessionIds.size === 0) {
      this.localClientToSessionIds.delete(clientId);
    }
  }

  private async readSession(
    sessionId: string,
  ): Promise<ChartIntradaySessionRecord | null> {
    const row =
      await this.basicCacheService.get<SerializedChartIntradaySessionRecord>(
        this.buildSessionCacheKey(sessionId),
      );
    return row ? this.hydrateSession(row) : null;
  }

  private async writeSession(session: ChartIntradaySessionRecord): Promise<void> {
    await this.basicCacheService.set(
      this.buildSessionCacheKey(session.sessionId),
      this.serializeSession(session),
      { ttlSeconds: this.recordTtlSeconds },
    );
  }

  private async deleteSession(sessionId: string): Promise<void> {
    await this.basicCacheService.del(this.buildSessionCacheKey(sessionId));
  }

  private async writeReleasedSession(
    session: ReleasedChartIntradaySessionRecord,
  ): Promise<void> {
    await this.basicCacheService.set(
      this.buildReleasedSessionCacheKey(session.sessionId),
      this.serializeReleasedSession(session),
      { ttlSeconds: this.recordTtlSeconds },
    );
  }

  private async readUpstream(
    upstreamKey: string,
  ): Promise<ChartIntradayUpstreamRecord | null> {
    const row =
      await this.basicCacheService.get<SerializedChartIntradayUpstreamRecord>(
        this.buildUpstreamCacheKey(upstreamKey),
      );
    if (!row) {
      return null;
    }

    return {
      ...row,
      activeSessionCount: await this.getUpstreamActiveCount(upstreamKey),
    };
  }

  private async writeUpstream(
    upstream: ChartIntradayUpstreamRecord,
  ): Promise<void> {
    await this.basicCacheService.set(
      this.buildUpstreamCacheKey(upstream.upstreamKey),
      this.serializeUpstream(upstream),
      { ttlSeconds: this.recordTtlSeconds },
    );
  }

  private async getUpstreamActiveCount(upstreamKey: string): Promise<number> {
    const value = await this.basicCacheService.get<number>(
      this.buildUpstreamCountCacheKey(upstreamKey),
    );
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.floor(value));
  }

  private async incrementUpstreamActiveCount(
    upstreamKey: string,
    delta: number,
  ): Promise<number> {
    if (delta === 0) {
      return this.getUpstreamActiveCount(upstreamKey);
    }

    const next = await this.basicCacheService.incr(
      this.buildUpstreamCountCacheKey(upstreamKey),
      delta,
    );
    const normalized = Math.max(0, Math.floor(next));

    if (normalized !== next) {
      await this.basicCacheService.set(
        this.buildUpstreamCountCacheKey(upstreamKey),
        normalized,
        { ttlSeconds: this.recordTtlSeconds },
      );
      return normalized;
    }

    await this.basicCacheService.expire(
      this.buildUpstreamCountCacheKey(upstreamKey),
      this.recordTtlSeconds,
    );
    return normalized;
  }

  private async refreshUpstreamTtl(upstreamKey: string): Promise<void> {
    await Promise.allSettled([
      this.basicCacheService.expire(
        this.buildUpstreamCacheKey(upstreamKey),
        this.recordTtlSeconds,
      ),
      this.basicCacheService.expire(
        this.buildUpstreamCountCacheKey(upstreamKey),
        this.recordTtlSeconds,
      ),
    ]);
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    if (!this.redis) {
      return [];
    }

    const keys: string[] = [];
    let cursor = "0";

    do {
      const [nextCursor, batch] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        200,
      );
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== "0");

    return keys;
  }

  private serializeSession(
    session: ChartIntradaySessionRecord,
  ): SerializedChartIntradaySessionRecord {
    return {
      ...session,
      boundClientIds: Array.from(session.boundClientIds),
    };
  }

  private serializeReleasedSession(
    session: ReleasedChartIntradaySessionRecord,
  ): SerializedReleasedChartIntradaySessionRecord {
    return {
      ...this.serializeSession(session),
      releasedAt: session.releasedAt,
    };
  }

  private hydrateSession(
    session: SerializedChartIntradaySessionRecord,
  ): ChartIntradaySessionRecord {
    return {
      ...session,
      boundClientIds: new Set(session.boundClientIds),
    };
  }

  private hydrateReleasedSession(
    session: SerializedReleasedChartIntradaySessionRecord,
  ): ReleasedChartIntradaySessionRecord {
    return {
      ...this.hydrateSession(session),
      releasedAt: session.releasedAt,
    };
  }

  private serializeUpstream(
    upstream: ChartIntradayUpstreamRecord,
  ): SerializedChartIntradayUpstreamRecord {
    return {
      upstreamKey: upstream.upstreamKey,
      symbol: upstream.symbol,
      market: upstream.market,
      provider: upstream.provider,
      wsCapabilityType: upstream.wsCapabilityType,
      clientId: upstream.clientId,
    };
  }

  private buildSessionCacheKey(sessionId: string): string {
    return `${ChartIntradaySessionService.SESSION_CACHE_KEY_PREFIX}${sessionId}`;
  }

  private buildReleasedSessionCacheKey(sessionId: string): string {
    return `${ChartIntradaySessionService.RELEASED_SESSION_CACHE_KEY_PREFIX}${sessionId}`;
  }

  private buildReleaseLockCacheKey(sessionId: string): string {
    return `${ChartIntradaySessionService.RELEASE_LOCK_CACHE_KEY_PREFIX}${sessionId}`;
  }

  private buildUpstreamCacheKey(upstreamKey: string): string {
    return `${ChartIntradaySessionService.UPSTREAM_CACHE_KEY_PREFIX}${upstreamKey}`;
  }

  private buildUpstreamCountCacheKey(upstreamKey: string): string {
    return `${ChartIntradaySessionService.UPSTREAM_COUNT_CACHE_KEY_PREFIX}${upstreamKey}`;
  }

  private buildUpstreamReleaseStateCacheKey(upstreamKey: string): string {
    return `${ChartIntradaySessionService.UPSTREAM_RELEASE_STATE_CACHE_KEY_PREFIX}${upstreamKey}`;
  }

  private buildUpstreamKey(params: {
    provider: string;
    wsCapabilityType: string;
    symbol: string;
  }): string {
    return `${params.provider}:${params.wsCapabilityType}:${params.symbol}`;
  }

  private async withLocalReleaseGate<T>(
    sessionId: string,
    handler: () => Promise<T>,
  ): Promise<T> {
    const normalizedSessionId = String(sessionId || "").trim();
    if (!normalizedSessionId) {
      return handler();
    }

    const previous = this.localReleaseGates.get(normalizedSessionId);
    let releaseGate!: () => void;
    const waitGate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    const current = (previous || Promise.resolve()).then(() => waitGate);
    this.localReleaseGates.set(normalizedSessionId, current);

    if (previous) {
      await previous;
    }

    try {
      return await handler();
    } finally {
      releaseGate();
      if (this.localReleaseGates.get(normalizedSessionId) === current) {
        this.localReleaseGates.delete(normalizedSessionId);
      }
    }
  }

  private async tryAcquireReleaseLock(
    lockKey: string,
    lockToken: string,
  ): Promise<boolean> {
    if (!this.redis) {
      return true;
    }

    const result = await this.redis.set(
      lockKey,
      lockToken,
      "EX",
      this.releaseLockTtlSeconds,
      "NX",
    );
    return result === "OK";
  }

  private async releaseReleaseLock(
    lockKey: string,
    lockToken: string,
  ): Promise<void> {
    if (!this.redis) {
      return;
    }
    await this.redis.eval(
      ChartIntradaySessionService.RELEASE_LOCK_COMPARE_AND_DELETE_SCRIPT,
      1,
      lockKey,
      lockToken,
    );
  }

  private async commitReleasedSession(params: {
    lockKey: string;
    lockToken: string;
    session: ReleasedChartIntradaySessionRecord;
  }): Promise<
    | { status: "committed"; activeSessionCount: number }
    | { status: "lock_lost" | "session_missing" }
  > {
    if (!this.redis) {
      await this.deleteSession(params.session.sessionId);
      const activeSessionCount = await this.incrementUpstreamActiveCount(
        params.session.upstreamKey,
        -1,
      );
      await this.writeReleasedSession(params.session);
      return {
        status: "committed",
        activeSessionCount,
      };
    }

    const result = await this.redis.eval(
      ChartIntradaySessionService.RELEASE_SESSION_COMMIT_SCRIPT,
      4,
      params.lockKey,
      this.buildSessionCacheKey(params.session.sessionId),
      this.buildUpstreamCountCacheKey(params.session.upstreamKey),
      this.buildReleasedSessionCacheKey(params.session.sessionId),
      params.lockToken,
      String(this.recordTtlSeconds),
      String(this.recordTtlSeconds),
      JSON.stringify(this.serializeReleasedSession(params.session)),
    );

    const [committed, activeCount] = Array.isArray(result) ? result : [0, 0];
    if (Number(committed) === 1) {
      return {
        status: "committed",
        activeSessionCount: Math.max(0, Math.floor(Number(activeCount) || 0)),
      };
    }
    if (Number(committed) === 2) {
      return {
        status: "session_missing",
      };
    }
    return {
      status: "lock_lost",
    };
  }

  private buildAlreadyReleasedResult(
    releasedSession: ReleasedChartIntradaySessionRecord,
    params: ChartIntradayWsSessionContext,
  ): Promise<ReleaseChartIntradaySessionResult> {
    this.assertSessionMatches(releasedSession, params);
    return this.getRequiredUpstream(
      releasedSession.upstreamKey,
      releasedSession,
    ).then((upstream) => ({
      releasedSession,
      upstream,
      activeSessionCount: upstream.activeSessionCount,
      releaseState: "already_released" as const,
    }));
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForReleasedSessionUntil(
    sessionId: string,
    deadline: number,
  ): Promise<ReleasedChartIntradaySessionRecord | null> {
    while (Date.now() < deadline) {
      const releasedSession = await this.getReleasedSession(sessionId);
      if (releasedSession) {
        return releasedSession;
      }
      await this.sleep(this.releaseLockPollMs);
    }

    return this.getReleasedSession(sessionId);
  }

  private resolveReleaseLockWaitMs(): number {
    return Math.max(
      this.releaseLockWaitMs,
      this.releaseLockTtlSeconds * 1000 + this.releaseLockWaitMs,
    );
  }

  private assertSessionMatches(
    session: ChartIntradaySessionRecord,
    params: ChartIntradayWsSessionContext,
  ): void {
    if (session.ownerIdentity !== params.ownerIdentity) {
      this.logger.warn("分时会话 owner 校验失败", {
        sessionId: session.sessionId,
        expectedOwner: session.ownerIdentity,
        actualOwner: params.ownerIdentity,
      });
      throw new Error("SESSION_OWNER_MISMATCH");
    }

    if (session.symbol !== params.symbol) {
      throw new Error("SESSION_SYMBOL_MISMATCH");
    }

    if (params.market && session.market !== params.market) {
      throw new Error("SESSION_MARKET_MISMATCH");
    }

    if (params.provider && session.provider !== params.provider) {
      throw new Error("SESSION_PROVIDER_MISMATCH");
    }
  }

  private parseInteger(
    rawValue: string | undefined,
    fallback: number,
    min: number,
  ): number {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.max(min, Math.floor(parsed));
  }
}
