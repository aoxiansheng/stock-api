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
  randomString,
} from './helpers/test-setup.helper';
import {
  APIFactory,
  SymbolMapperAPI,
  DataMapperAPI,
  TransformerAPI,
  StorageAPI,
} from './helpers/api-request.helper';

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

    // 初始化API工厂
    adminAPIFactory = new APIFactory(httpServer, adminTokens.accessToken);
    developerAPIFactory = new APIFactory(httpServer, developerTokens.accessToken);

    symbolMapperAPI = adminAPIFactory.createSymbolMapperAPI();
    dataMapperAPI = adminAPIFactory.createDataMapperAPI();
    transformerAPI = developerAPIFactory.createTransformerAPI();
    storageAPI = developerAPIFactory.createStorageAPI();
    adminStorageAPI = adminAPIFactory.createStorageAPI();
  });

  afterAll(async () => {
    await cleanupTestApp(context);
  });

  describe('1. 符号映射 (Symbol Mapper)', () => {
    describe('1.1 预设规则与缓存：标准 → 提供商', () => {
      it('单个映射：输入与输出一致（标准格式对外一致性）', async () => {
        const res = await symbolMapperAPI.mapSymbol({
          symbol: '00700.HK',
          fromProvider: 'standard',
          toProvider: 'longport',
        });
        expect([200, 201]).toContain(res.status);
        assertStandardResponse(res);
        // 设计要求：对外输出保持系统标准格式一致
        expect(res.body.data).toHaveProperty('mappedSymbol', '00700.HK');
      });

      it('批量映射：US/HK/CN 多市场（对外一致性）', async () => {
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
        expect(map['00700.HK']).toBe('00700.HK');
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
        const res = await dataMapperAPI.createFlexibleRule({
          name: `quote_rule_${randomString()}`,
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
        createdRuleId = res.body.data.id || res.body.data.ruleId || res.body.data?.id; // 兼容不同响应结构
        expect(createdRuleId).toBeTruthy();
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
      });
    });
  });

  describe('3. 数据转换 (Data Transformer)', () => {
    let ruleId: string;

    beforeAll(async () => {
      // 创建并保留一个映射规则供转换使用
      const res = await dataMapperAPI.createFlexibleRule({
        name: `tx_rule_${randomString()}`,
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        fieldMappings: [
          { sourceFieldPath: 'last_done', targetField: 'lastPrice' },
          { sourceFieldPath: 'volume', targetField: 'volume' },
        ],
      });
      ruleId = res.body.data.id || res.body.data.ruleId || res.body.data?.id;
    });

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
      // 设计要求：对外输出保持系统标准格式一致
      expect(providerSymbol).toBe(symbol);

      // 创建转换规则
      const ruleRes = await dataMapperAPI.createFlexibleRule({
        name: `pipe_rule_${randomString()}`,
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        fieldMappings: [
          { sourceFieldPath: 'last_done', targetField: 'lastPrice' },
          { sourceFieldPath: 'volume', targetField: 'volume' },
        ],
      });
      const ruleId = ruleRes.body.data.id || ruleRes.body.data.ruleId;

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
