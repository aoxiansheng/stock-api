jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { DataMapperCacheStandardizedService } from "@core/05-caching/module/data-mapper-cache/services/data-mapper-cache-standardized.service";
import { FlexibleMappingRuleResponseDto } from "@core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto";

describe("DataMapperCacheStandardizedService best-rule cache key", () => {
  function createRedisMock(store: Map<string, string>) {
    const escapeRegex = (input: string): string =>
      input.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

    const globToRegExp = (pattern: string): RegExp => {
      let regex = "^";
      for (let index = 0; index < pattern.length; index += 1) {
        const currentChar = pattern[index];

        if (currentChar === "\\") {
          const nextChar = pattern[index + 1];
          if (nextChar !== undefined) {
            regex += escapeRegex(nextChar);
            index += 1;
          } else {
            regex += "\\\\";
          }
          continue;
        }

        if (currentChar === "*") {
          regex += ".*";
          continue;
        }
        if (currentChar === "?") {
          regex += ".";
          continue;
        }

        regex += escapeRegex(currentChar);
      }

      return new RegExp(`${regex}$`);
    };

    const matchPattern = (input: string, pattern: string): boolean => {
      const regex = globToRegExp(pattern);
      return regex.test(input);
    };

    return {
      setex: jest.fn(async (key: string, _ttl: number, value: string) => {
        store.set(key, value);
        return "OK";
      }),
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      del: jest.fn(async (...keys: string[]) => {
        let deleted = 0;
        for (const key of keys) {
          if (store.delete(key)) {
            deleted += 1;
          }
        }
        return deleted;
      }),
      scan: jest.fn(
        async (_cursor: string, _match: string, pattern: string) => {
          const keys = Array.from(store.keys()).filter((key) =>
            matchPattern(key, pattern),
          );
          return ["0", keys] as [string, string[]];
        },
      ),
      exists: jest.fn(async () => 0),
      ttl: jest.fn(async () => -1),
      mget: jest.fn(async () => []),
      ping: jest.fn(async () => "PONG"),
    };
  }

  function createRule(id: string): FlexibleMappingRuleResponseDto {
    const now = new Date("2026-01-01T00:00:00.000Z");
    return {
      id,
      name: `rule-${id}`,
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      marketType: "*",
      sourceTemplateId: "",
      fieldMappings: [],
      isActive: true,
      isDefault: false,
      version: "1.0.0",
      overallConfidence: 1,
      usageCount: 0,
      successfulTransformations: 0,
      failedTransformations: 0,
      createdAt: now,
      updatedAt: now,
    } as FlexibleMappingRuleResponseDto;
  }

  it("strictWildcardOnly=true 与默认查询模式不共享缓存键", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);

    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    await service.cacheBestMatchingRule(
      "longport",
      "rest",
      "quote_fields",
      "*",
      createRule("rule-default"),
    );
    await service.cacheBestMatchingRule(
      "longport",
      "rest",
      "quote_fields",
      "*",
      createRule("rule-strict"),
      { strictWildcardOnly: true },
    );

    const defaultRule = await service.getCachedBestMatchingRule(
      "longport",
      "rest",
      "quote_fields",
      "*",
    );
    const strictRule = await service.getCachedBestMatchingRule(
      "longport",
      "rest",
      "quote_fields",
      "*",
      { strictWildcardOnly: true },
    );

    expect(defaultRule?.id).toBe("rule-default");
    expect(strictRule?.id).toBe("rule-strict");

    const setKeys = redis.setex.mock.calls.map((call) => String(call[0]));
    const getKeys = redis.get.mock.calls.map((call) => String(call[0]));
    expect(setKeys[0]).not.toBe(setKeys[1]);
    expect(getKeys[0]).not.toBe(getKeys[1]);
    expect(setKeys[0]).toContain(":default");
    expect(setKeys[1]).toContain(":strict_wildcard_only");
  });

  it("invalidateRuleCache 会清理 rule:id 与同维度 best_rule 缓存", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    const rule = createRule("rule-1");
    const otherRule = createRule("rule-2");
    const ruleApiType = rule.apiType as "stream" | "rest";
    const otherRuleApiType = otherRule.apiType as "stream" | "rest";
    otherRule.provider = "infoway";

    await service.cacheRuleById(rule);
    await service.cacheBestMatchingRule(
      rule.provider,
      ruleApiType,
      rule.transDataRuleListType,
      "US",
      rule,
    );
    await service.cacheBestMatchingRule(
      rule.provider,
      ruleApiType,
      rule.transDataRuleListType,
      "US",
      rule,
      { strictWildcardOnly: true },
    );
    await service.cacheBestMatchingRule(
      otherRule.provider,
      otherRuleApiType,
      otherRule.transDataRuleListType,
      "US",
      otherRule,
    );

    await service.invalidateRuleCache(rule.id, rule);

    await expect(service.getCachedRuleById(rule.id)).resolves.toBeNull();
    await expect(
      service.getCachedBestMatchingRule(
        rule.provider,
        ruleApiType,
        rule.transDataRuleListType,
        "US",
      ),
    ).resolves.toBeNull();
    await expect(
      service.getCachedBestMatchingRule(
        rule.provider,
        ruleApiType,
        rule.transDataRuleListType,
        "US",
        { strictWildcardOnly: true },
      ),
    ).resolves.toBeNull();
    await expect(
      service.getCachedBestMatchingRule(
        otherRule.provider,
        otherRuleApiType,
        otherRule.transDataRuleListType,
        "US",
      ),
    ).resolves.not.toBeNull();
  });

  it("invalidateRuleCache 构造 scan pattern 时会转义 provider 特殊字符", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    const rule = createRule("rule-special-pattern");
    rule.provider = "lp*pro?vider[hk]\\";
    await service.cacheBestMatchingRule(
      rule.provider,
      "rest",
      "quote_fields",
      "US",
      rule,
    );

    await service.invalidateRuleCache(rule.id, rule);

    const scanPatterns = redis.scan.mock.calls.map((call) => String(call[2]));
    expect(scanPatterns).toContain(
      "best_rule:lp\\*pro\\?vider\\[hk\\]\\\\:rest:quote_fields:*",
    );
  });

  it("best_rule 构键在写入与查询链路统一 trim+lower", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    const rule = createRule("rule-normalized");
    await service.cacheBestMatchingRule(
      "  LongPort  ",
      "REST" as any,
      "  QUOTE_FIELDS  " as any,
      "us",
      rule,
    );

    const cached = await service.getCachedBestMatchingRule(
      "longport",
      "rest",
      "quote_fields",
      "US",
    );

    expect(cached?.id).toBe("rule-normalized");
    expect(redis.setex.mock.calls[0][0]).toBe(
      "best_rule:longport:rest:quote_fields:US:default",
    );
    expect(redis.get.mock.calls[0][0]).toBe(
      "best_rule:longport:rest:quote_fields:US:default",
    );
  });

  it("invalidateProviderCache 使用统一 provider 规范清理 provider 维度缓存", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    const rule = createRule("rule-provider");
    await service.cacheProviderRules("  LongPort  ", "REST" as any, [rule]);
    await service.cacheBestMatchingRule(
      "LongPort",
      "REST" as any,
      "QUOTE_FIELDS" as any,
      "US",
      rule,
    );

    await service.invalidateProviderCache(" longport ");

    await expect(
      service.getCachedProviderRules("longport", "rest"),
    ).resolves.toBeNull();
    await expect(
      service.getCachedBestMatchingRule(
        "longport",
        "rest",
        "quote_fields",
        "US",
      ),
    ).resolves.toBeNull();
  });

  it("invalidateProviderCache 在 provider 含 * 时不会误删其他 provider", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    const literalProviderRule = createRule("rule-literal-provider");
    literalProviderRule.provider = "lp*pro";
    const otherProviderRule = createRule("rule-other-provider");
    otherProviderRule.provider = "lpxxpro";

    await service.cacheProviderRules(literalProviderRule.provider, "rest", [
      literalProviderRule,
    ]);
    await service.cacheProviderRules(otherProviderRule.provider, "rest", [
      otherProviderRule,
    ]);
    await service.cacheBestMatchingRule(
      literalProviderRule.provider,
      "rest",
      literalProviderRule.transDataRuleListType,
      "US",
      literalProviderRule,
    );
    await service.cacheBestMatchingRule(
      otherProviderRule.provider,
      "rest",
      otherProviderRule.transDataRuleListType,
      "US",
      otherProviderRule,
    );

    await service.invalidateProviderCache(literalProviderRule.provider);

    await expect(
      service.getCachedProviderRules(literalProviderRule.provider, "rest"),
    ).resolves.toBeNull();
    await expect(
      service.getCachedBestMatchingRule(
        literalProviderRule.provider,
        "rest",
        literalProviderRule.transDataRuleListType,
        "US",
      ),
    ).resolves.toBeNull();

    await expect(
      service.getCachedProviderRules(otherProviderRule.provider, "rest"),
    ).resolves.not.toBeNull();
    await expect(
      service.getCachedBestMatchingRule(
        otherProviderRule.provider,
        "rest",
        otherProviderRule.transDataRuleListType,
        "US",
      ),
    ).resolves.not.toBeNull();

    const scanPatterns = redis.scan.mock.calls.map((call) => String(call[2]));
    expect(scanPatterns).toContain("best_rule:lp\\*pro:*");
    expect(scanPatterns).toContain("rules:provider:lp\\*pro:*");
  });

  it("apiType 非法值时抛出 DATA_VALIDATION_FAILED，并附带 operation/context", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    await expect(
      service.cacheProviderRules("longport", "grpc" as any, []),
    ).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: "DATA_VALIDATION_FAILED",
      operation: "cacheProviderRules",
      context: expect.objectContaining({
        apiType: "grpc",
        dataMapperErrorCode: "DATA_MAPPER_VALIDATION_003",
      }),
    });

    expect(redis.setex).not.toHaveBeenCalled();
  });

  it("ruleListType 非法值时抛出 DATA_VALIDATION_FAILED，并附带 operation/context", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );
    const rule = createRule("rule-invalid-rule-list-type");

    await expect(
      service.cacheBestMatchingRule(
        "longport",
        "rest",
        "invalid_rule_list_type" as any,
        "US",
        rule,
      ),
    ).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: "DATA_VALIDATION_FAILED",
      operation: "buildBestRuleCacheKey",
      context: expect.objectContaining({
        transDataRuleListType: "invalid_rule_list_type",
        dataMapperErrorCode: "DATA_MAPPER_VALIDATION_003",
      }),
    });

    expect(redis.setex).not.toHaveBeenCalled();
  });

  it("provider 归一化为空时会拒绝 best_rule 写入与读取，且不会生成污染 key", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    const rule = createRule("rule-empty-provider");
    await expect(
      service.cacheBestMatchingRule(
        "   ",
        "rest",
        "quote_fields",
        "US",
        rule,
      ),
    ).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: "DATA_VALIDATION_FAILED",
    });

    await expect(
      service.getCachedBestMatchingRule(
        " ",
        "rest",
        "quote_fields",
        "US",
      ),
    ).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: "DATA_VALIDATION_FAILED",
    });

    const setKeys = redis.setex.mock.calls.map((call) => String(call[0]));
    const getKeys = redis.get.mock.calls.map((call) => String(call[0]));
    expect(setKeys.some((key) => key.includes("best_rule::"))).toBe(false);
    expect(getKeys.some((key) => key.includes("best_rule::"))).toBe(false);
  });

  it("provider 归一化为空时会拒绝 provider 维度缓存 key", async () => {
    const store = new Map<string, string>();
    const redis = createRedisMock(store);
    const service = new DataMapperCacheStandardizedService(
      redis as any,
      { defaultTtlSeconds: 60 } as any,
    );

    await expect(
      service.cacheProviderRules("   ", "rest", []),
    ).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: "DATA_VALIDATION_FAILED",
    });
    await expect(
      service.getCachedProviderRules(" ", "rest"),
    ).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: "DATA_VALIDATION_FAILED",
    });
    await expect(
      service.invalidateProviderCache(" "),
    ).rejects.toMatchObject({
      name: "BusinessException",
      errorCode: "DATA_VALIDATION_FAILED",
    });

    const setKeys = redis.setex.mock.calls.map((call) => String(call[0]));
    const getKeys = redis.get.mock.calls.map((call) => String(call[0]));
    const scanPatterns = redis.scan.mock.calls.map((call) => String(call[2]));
    expect(setKeys.some((key) => key.includes("rules:provider::"))).toBe(false);
    expect(getKeys.some((key) => key.includes("rules:provider::"))).toBe(false);
    expect(scanPatterns.some((pattern) => pattern.includes("best_rule::"))).toBe(
      false,
    );
  });
});
