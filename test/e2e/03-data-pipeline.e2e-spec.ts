/**
 * E2E测试: 数据流管道
 * 测试场景:
 * 1. 符号映射 (Symbol Mapper Cache + 预设规则)
 * 2. 数据映射 (Flexible Mapping Rules)
 * 3. 数据转换 (Data Transformer)
 * 4. 数据存储 (Persistent Storage)
 * 5. 管道串联（映射 → 转换 → 存储 → 检索）
 */
import request from 'supertest';
import {
  createTestApp,
  cleanupTestApp,
  TestAppContext,
  TEST_USERS,
  TEST_SYMBOLS,
  registerUser,
  loginUser,
  assertStandardResponse,
  assertErrorResponse,
  randomString,
  E2E_TEST_TIMEOUT_MS,
} from './helpers/test-setup.helper';
import {
  APIFactory,
  SymbolMapperAPI,
  DataMapperAPI,
  TransformerAPI,
  StorageAPI,
} from './helpers/api-request.helper';

const DATA_PIPELINE_HOOK_TIMEOUT_MS = E2E_TEST_TIMEOUT_MS;
const PIPE_RULE_NAME_PREFIX = 'pipe_rule_';
const TX_RULE_NAME_PREFIX = 'tx_rule_';
const TX_CHANGE_PERCENT_RULE_NAME_PREFIX = 'tx_change_percent_';
const TX_FALLBACK_RULE_NAME_PREFIX = 'tx_fallback_';
const QUOTE_RULE_NAME_PREFIX = 'quote_rule_';
const TRACKED_TEST_RULE_PREFIXES = [
  PIPE_RULE_NAME_PREFIX,
  TX_RULE_NAME_PREFIX,
  TX_CHANGE_PERCENT_RULE_NAME_PREFIX,
  TX_FALLBACK_RULE_NAME_PREFIX,
  QUOTE_RULE_NAME_PREFIX,
] as const;
type CleanupPhase = 'afterEach' | 'afterAll';
type TrackedRuleMeta = {
  name?: string;
  cleanupPhase: CleanupPhase;
};

describe('E2E: Data Pipeline (数据流管道)', () => {
  let context: TestAppContext;
  let httpServer: any;
  let adminAPIFactory: APIFactory;
  let developerAPIFactory: APIFactory;
  let symbolMapperAPI: SymbolMapperAPI;
  let dataMapperAPI: DataMapperAPI;
  let transformerAPI: TransformerAPI;
  let storageAPI: StorageAPI; // developer scope (仅用于非管理员端点)
  let adminStorageAPI: StorageAPI; // 管理员端点使用
  const trackedRuleRegistry = new Map<string, TrackedRuleMeta>();

  const trackRuleId = (
    ruleId?: string,
    ruleName?: string,
    cleanupPhase: CleanupPhase = 'afterEach',
  ): void => {
    if (!ruleId) {
      return;
    }
    trackedRuleRegistry.set(ruleId, {
      name: ruleName,
      cleanupPhase,
    });
  };

  const untrackRuleId = (ruleId?: string): void => {
    if (!ruleId) {
      return;
    }
    trackedRuleRegistry.delete(ruleId);
  };

  const extractRuleId = (response: any): string | undefined =>
    response?.body?.data?.id || response?.body?.data?.ruleId;

  const mustExtractRuleId = (response: any, scenario: string): string => {
    const ruleId = extractRuleId(response) || '';
    expect(ruleId).toBeTruthy();
    if (!ruleId) {
      throw new Error(`[e2e/data-pipeline] ${scenario} 未返回 ruleId`);
    }
    return ruleId;
  };

  const isTrackedTestRuleName = (ruleName: unknown): boolean =>
    typeof ruleName === 'string' &&
    TRACKED_TEST_RULE_PREFIXES.some((prefix) => ruleName.startsWith(prefix));

  const deleteRuleSafely = async (ruleId: string, scenario: string): Promise<void> => {
    if (!dataMapperAPI || !ruleId) {
      return;
    }
    try {
      const res = await dataMapperAPI.deleteRule(ruleId);
      if (![200, 404].includes(res.status)) {
        console.warn('[e2e/data-pipeline] 规则清理返回非预期状态', {
          scenario,
          ruleId,
          status: res.status,
        });
      }
    } catch (error: any) {
      const message = error?.message || String(error);
      if (!message.includes('404')) {
        console.warn('[e2e/data-pipeline] 规则清理异常(忽略)', {
          scenario,
          ruleId,
          message,
        });
      }
    }
  };

  const cleanupTrackedRules = async (phase: CleanupPhase): Promise<void> => {
    if (!dataMapperAPI || trackedRuleRegistry.size === 0) {
      return;
    }

    for (const [ruleId, meta] of Array.from(trackedRuleRegistry.entries())) {
      if (phase === 'afterEach' && meta.cleanupPhase === 'afterAll') {
        continue;
      }
      try {
        await deleteRuleSafely(ruleId, meta.name || phase);
      } finally {
        trackedRuleRegistry.delete(ruleId);
      }
    }
  };

  const extractRuleList = (response: any): any[] => {
    const data = response?.body?.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (Array.isArray(data?.items)) {
      return data.items;
    }
    if (Array.isArray(data?.data)) {
      return data.data;
    }
    if (Array.isArray(data?.list)) {
      return data.list;
    }
    return [];
  };

  const assertNoResidualTrackedRules = async (): Promise<void> => {
    if (!dataMapperAPI) {
      console.warn('[e2e/data-pipeline] 跳过残留规则断言：DataMapperAPI 未初始化');
      return;
    }
    const res = await dataMapperAPI.getRules();
    expect(res.status).toBe(200);
    assertStandardResponse(res);
    const rules = extractRuleList(res);
    const residualRules = rules.filter((rule) =>
      isTrackedTestRuleName(rule?.name),
    );
    if (residualRules.length > 0) {
      console.warn('[e2e/data-pipeline] 检测到残留测试规则', {
        count: residualRules.length,
        ruleNames: residualRules.map((rule: any) => rule?.name),
        ruleIds: residualRules.map((rule: any) => rule?.id || rule?._id),
      });
    }
    expect(residualRules).toHaveLength(0);
  };

  beforeAll(async () => {
    context = await createTestApp();
    httpServer = context.httpServer;

    // 注册并登录ADMIN用户
    await registerUser(httpServer, TEST_USERS.ADMIN);
    const adminTokens = await loginUser(
      httpServer,
      TEST_USERS.ADMIN.username,
      TEST_USERS.ADMIN.password,
    );

    // 注册并登录DEVELOPER用户
    await registerUser(httpServer, TEST_USERS.DEVELOPER);
    const developerTokens = await loginUser(
      httpServer,
      TEST_USERS.DEVELOPER.username,
      TEST_USERS.DEVELOPER.password,
    );
    // I10: 显式注册 USER（幂等）
    await registerUser(httpServer, TEST_USERS.USER);

    // 初始化API工厂
    adminAPIFactory = new APIFactory(httpServer, adminTokens.accessToken);
    developerAPIFactory = new APIFactory(httpServer, developerTokens.accessToken);

    symbolMapperAPI = adminAPIFactory.createSymbolMapperAPI();
    dataMapperAPI = adminAPIFactory.createDataMapperAPI();
    transformerAPI = developerAPIFactory.createTransformerAPI();
    storageAPI = developerAPIFactory.createStorageAPI();
    adminStorageAPI = adminAPIFactory.createStorageAPI();
  }, DATA_PIPELINE_HOOK_TIMEOUT_MS);

  afterEach(async () => {
    await cleanupTrackedRules('afterEach');
  });

  afterAll(async () => {
    await cleanupTrackedRules('afterAll');
    await assertNoResidualTrackedRules();
    await cleanupTestApp(context);
  }, DATA_PIPELINE_HOOK_TIMEOUT_MS);

  describe('1. 符号映射 (Symbol Mapper)', () => {
    describe('1.1 预设规则与缓存：标准 → 提供商', () => {
      it('单个映射：标准符号应转换为 provider 符号', async () => {
        const res = await symbolMapperAPI.mapSymbol({
          symbol: '00700.HK',
          fromProvider: 'standard',
          toProvider: 'longport',
        });
        expect([200, 201]).toContain(res.status);
        assertStandardResponse(res);
        expect(res.body.data).toHaveProperty('mappedSymbol', '700.HK');
      });

      it('批量映射：US/HK/CN 多市场（标准 → provider）', async () => {
        const symbols = ['AAPL.US', '00700.HK', '600519.SH'];
        const res = await symbolMapperAPI.transformSymbols({
          dataSourceName: 'longport',
          symbols,
        });
        expect([200, 201]).toContain(res.status);
        assertStandardResponse(res);
        expect(res.body.data).toHaveProperty('transformedSymbols');
        const map = res.body.data.transformedSymbols;
        expect(map['AAPL.US']).toBe('AAPL.US');
        expect(map['00700.HK']).toBe('700.HK');
        expect(map['600519.SH']).toBe('600519.SH');
      });
    });

    describe('1.2 映射规则管理（管理员）', () => {
      it('可追加自定义映射规则', async () => {
        const unique = `E2E_${randomString()}`;
        const res = await symbolMapperAPI.addRule({
          dataSourceName: 'longport',
          symbolMappingRule: {
            standardSymbol: `${unique}.US`,
            sdkSymbol: `${unique}.US`,
            market: 'US',
            symbolType: 'stock',
          },
        });
        expect([200, 201]).toContain(res.status);
        assertStandardResponse(res);
      });

      it('普通用户无权新增映射规则', async () => {
        const userTokens = await loginUser(
          httpServer,
          TEST_USERS.USER.username,
          TEST_USERS.USER.password,
        );
        const userAPI = new APIFactory(httpServer, userTokens.accessToken);
        const userSymbolMapperAPI = userAPI.createSymbolMapperAPI();
        const r = await userSymbolMapperAPI.addRule({
          dataSourceName: 'longport',
          symbolMappingRule: {
            standardSymbol: 'DENY_TEST.US',
            sdkSymbol: 'DENY_TEST.US',
          },
        });
        expect(r.status).toBe(403);
      });
    });
  });

  describe('2. 数据映射 (Data Mapper)', () => {
    describe('2.1 灵活映射规则 CRUD', () => {
      let createdRuleId: string;

      it('创建规则：last_done → lastPrice, volume → volume', async () => {
        const ruleName = `${QUOTE_RULE_NAME_PREFIX}${randomString()}`;
        const res = await dataMapperAPI.createFlexibleRule({
          name: ruleName,
          description: 'E2E generated rule',
          provider: 'longport',
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          fieldMappings: [
            { sourceFieldPath: 'last_done', targetField: 'lastPrice' },
            { sourceFieldPath: 'volume', targetField: 'volume' },
          ],
          isDefault: false,
        });
        expect(res.status).toBe(201);
        assertStandardResponse(res);
        createdRuleId = mustExtractRuleId(res, '2.1 创建规则');
        trackRuleId(createdRuleId, ruleName);
      });

      it('查询规则（分页）', async () => {
        const res = await dataMapperAPI.getRules();
        expect(res.status).toBe(200);
        assertStandardResponse(res);
      });

      it('更新规则描述', async () => {
        const res = await dataMapperAPI.updateRule(createdRuleId, { description: 'updated by E2E' });
        expect([200]).toContain(res.status);
        assertStandardResponse(res);
      });

      it('删除规则', async () => {
        const res = await dataMapperAPI.deleteRule(createdRuleId);
        expect([200]).toContain(res.status);
        assertStandardResponse(res);
        untrackRuleId(createdRuleId);
      });
    });
  });

  describe('3. 数据转换 (Data Transformer)', () => {
    let ruleId: string;

    beforeAll(async () => {
      // 创建并保留一个映射规则供转换使用
      const ruleName = `${TX_RULE_NAME_PREFIX}${randomString()}`;
      const res = await dataMapperAPI.createFlexibleRule({
        name: ruleName,
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        fieldMappings: [
          { sourceFieldPath: 'last_done', targetField: 'lastPrice' },
          { sourceFieldPath: 'volume', targetField: 'volume' },
        ],
      });
      expect(res.status).toBe(201);
      assertStandardResponse(res);
      ruleId = mustExtractRuleId(res, '3 beforeAll 创建转换规则');
      trackRuleId(ruleId, ruleName, 'afterAll');
    }, DATA_PIPELINE_HOOK_TIMEOUT_MS);

    afterAll(async () => {
      await cleanupTrackedRules('afterAll');
    }, DATA_PIPELINE_HOOK_TIMEOUT_MS);

    it('使用指定规则进行转换并返回元数据', async () => {
      const rawData = { symbol: 'AAPL.US', last_done: 150.5, volume: 1000000 };
      const res = await transformerAPI.transform({
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        mappingOutRuleId: ruleId,
        rawData,
        options: { includeMetadata: true },
      });
      expect([200, 201]).toContain(res.status);
      assertStandardResponse(res);
      expect(res.body.data).toHaveProperty('transformedData');
      expect(res.body.data).toHaveProperty('metadata');
      expect(res.body.data.metadata).toHaveProperty('ruleId', ruleId);
      expect(res.body.data.transformedData).toHaveProperty('lastPrice', 150.5);
    });

    it('批量转换（2条）', async () => {
      const payload = [
        {
          provider: 'longport',
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          mappingOutRuleId: ruleId,
          rawData: { symbol: 'TSLA.US', last_done: 250.75, volume: 5000000 },
        },
        {
          provider: 'longport',
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          mappingOutRuleId: ruleId,
          rawData: { symbol: 'MSFT.US', last_done: 400.12, volume: 800000 },
        },
      ];
      const res = await transformerAPI.transformBatch(payload);
      expect([200, 201]).toContain(res.status);
      assertStandardResponse(res);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].transformedData).toHaveProperty('lastPrice', 250.75);
      expect(res.body.data[1].transformedData).toHaveProperty('lastPrice', 400.12);
    });

    it('changePercent 契约：pc=0.72 时保持 0.72（不做 *100）', async () => {
      const ruleName = `${TX_CHANGE_PERCENT_RULE_NAME_PREFIX}${randomString()}`;
      const createRes = await dataMapperAPI.createFlexibleRule({
        name: ruleName,
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        fieldMappings: [{ sourceFieldPath: 'pc', targetField: 'changePercent' }],
      });
      expect(createRes.status).toBe(201);

      const percentRuleId = mustExtractRuleId(
        createRes,
        '3 changePercent 创建规则',
      );
      trackRuleId(percentRuleId, ruleName);

      const res = await transformerAPI.transform({
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        mappingOutRuleId: percentRuleId,
        rawData: { symbol: 'AAPL.US', pc: 0.72 },
      });

      expect([200, 201]).toContain(res.status);
      assertStandardResponse(res);
      expect(res.body.data.transformedData).toHaveProperty('changePercent', 0.72);
      expect(res.body.data.transformedData.changePercent).not.toBe(72);
    });

    describe('3.1 strictWildcardOnly 降级链路', () => {
      async function createTransformRule(payload: {
        provider: string;
        marketType?: string;
        sourceFieldPath?: string;
      }): Promise<string> {
        const ruleName = `${TX_FALLBACK_RULE_NAME_PREFIX}${randomString()}`;
        const createRes = await dataMapperAPI.createFlexibleRule({
          name: ruleName,
          provider: payload.provider,
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          marketType: payload.marketType,
          fieldMappings: [
            {
              sourceFieldPath: payload.sourceFieldPath || 'last_done',
              targetField: 'lastPrice',
            },
          ],
        });
        expect(createRes.status).toBe(201);
        const createdRuleId = mustExtractRuleId(
          createRes,
          '3.1 strictWildcardOnly 创建规则',
        );
        trackRuleId(createdRuleId, ruleName);
        return createdRuleId;
      }

      it('US 未命中且无 wildcard 规则时返回无匹配错误', async () => {
        const provider = `fallback-${randomString()}`;
        await createTransformRule({
          provider,
          marketType: 'CN',
        });

        const res = await transformerAPI.transform({
          provider,
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          marketType: 'US',
          rawData: { symbol: 'AAPL.US', last_done: 123.45 },
          options: { includeMetadata: true },
        });

        expect(res.status).toBe(404);
        assertErrorResponse(res);
        expect(res.body.error.code).toBe('DATA_NOT_FOUND');
        expect(String(res.body.message || '')).toContain('No mapping rule found');
      });

      it("marketType='*' 时不触发 strictWildcardOnly 降级", async () => {
        const provider = `fallback-${randomString()}`;
        const wildcardRuleId = await createTransformRule({
          provider,
          marketType: '*',
        });

        const res = await transformerAPI.transform({
          provider,
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          marketType: '*',
          rawData: { symbol: 'AAPL.US', last_done: 135.79 },
          options: { includeMetadata: true },
        });

        expect([200, 201]).toContain(res.status);
        assertStandardResponse(res);
        expect(res.body.data.metadata).toHaveProperty('ruleId', wildcardRuleId);
        expect(res.body.data.transformedData).toHaveProperty('lastPrice', 135.79);
      });

      it('US 未命中后可降级命中 wildcard 规则并返回命中规则ID', async () => {
        const provider = `fallback-${randomString()}`;
        const wildcardRuleId = await createTransformRule({
          provider,
          marketType: '*',
        });

        const res = await transformerAPI.transform({
          provider,
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          marketType: 'US',
          rawData: { symbol: 'AAPL.US', last_done: 246.8 },
          options: { includeMetadata: true },
        });

        expect([200, 201]).toContain(res.status);
        assertStandardResponse(res);
        expect(res.body.data.metadata).toHaveProperty('ruleId', wildcardRuleId);
        expect(res.body.data.transformedData).toHaveProperty('lastPrice', 246.8);
      });
    });
  });

  describe('4. 数据存储 (Storage - 持久化)', () => {
    it('存储并检索单条数据', async () => {
      const key = `stock:${randomString()}:quote`;
      const store = await adminStorageAPI.store({
        key,
        data: { symbol: 'AMZN.US', lastPrice: 123.45 },
        storageType: 'persistent',
        storageClassification: 'stock_quote',
        provider: 'longport',
        market: 'US',
        options: { compress: false },
      });
      expect([200, 201]).toContain(store.status);
      assertStandardResponse(store);

      const retrieve = await adminStorageAPI.retrieve({ key });
      expect([200, 201]).toContain(retrieve.status);
      assertStandardResponse(retrieve);
      expect(retrieve.body.data).toHaveProperty('data');
      expect(retrieve.body.data.data).toHaveProperty('lastPrice', 123.45);
    });

    it('获取存储统计信息', async () => {
      const res = await adminStorageAPI.getStats();
      expect(res.status).toBe(200);
      assertStandardResponse(res);
    });
  });

  describe('5. 管道串联：映射 → 转换 → 存储 → 检索', () => {
    it('应完成端到端：标准符号 → provider 符号 → 字段转换 → 持久化 → 读取', async () => {
      // 符号映射
      const symbol = '00700.HK';
      const mapRes = await symbolMapperAPI.transformSymbols({ dataSourceName: 'longport', symbols: [symbol] });
      expect([200, 201]).toContain(mapRes.status);
      const providerSymbol = mapRes.body.data.transformedSymbols[symbol];
      expect(providerSymbol).toBe('700.HK');

      // 创建转换规则
      const ruleName = `${PIPE_RULE_NAME_PREFIX}${randomString()}`;
      const ruleRes = await dataMapperAPI.createFlexibleRule({
        name: ruleName,
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        fieldMappings: [
          { sourceFieldPath: 'symbol', targetField: 'symbol' },
          { sourceFieldPath: 'last_done', targetField: 'lastPrice' },
          { sourceFieldPath: 'volume', targetField: 'volume' },
        ],
      });
      expect(ruleRes.status).toBe(201);
      const ruleId = mustExtractRuleId(ruleRes, '5 管道串联创建规则');
      trackRuleId(ruleId, ruleName);

      // 执行转换（使用指定规则）
      const rawData = { symbol: providerSymbol, last_done: 385.6, volume: 1234567 };
      const txRes = await transformerAPI.transform({
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        mappingOutRuleId: ruleId,
        rawData,
      });
      expect([200, 201]).toContain(txRes.status);
      const transformed = txRes.body.data.transformedData;
      expect(transformed).toHaveProperty('symbol', symbol);
      expect(transformed).toHaveProperty('lastPrice', 385.6);

      // 持久化
      const key = `stock:${symbol}:quote`;
      const storeRes = await adminStorageAPI.store({
        key,
        data: transformed,
        storageType: 'persistent',
        storageClassification: 'stock_quote',
        provider: 'longport',
        market: 'HK',
      });
      expect([200, 201]).toContain(storeRes.status);

      // 检索
      const getRes = await adminStorageAPI.retrieve({ key });
      expect([200, 201]).toContain(getRes.status);
      expect(getRes.body.data.data).toHaveProperty('lastPrice', 385.6);
    });
  });
});
