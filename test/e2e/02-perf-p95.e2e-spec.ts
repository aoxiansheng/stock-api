/**
 * E2E: Performance (P95)
 * 将原 02 用例中的性能基准测试拆分为独立文件
 */
import {
  createTestApp,
  cleanupTestApp,
  TestAppContext,
  TEST_USERS,
  TEST_SYMBOLS,
  TEST_MARKETS,
  registerUser,
  loginUser,
  createApiKey,
  wait,
} from './helpers/test-setup.helper';
import { APIFactory, ReceiverAPI, QueryAPI } from './helpers/api-request.helper';

describe('E2E: Performance (P95)', () => {
  // 为了降低短TTL对观测的影响，同时更贴近文档“强时效1-5秒”的范围，测试环境下放宽为5秒
  beforeAll(() => {
    process.env.SMARTCACHE_USE_REDIS = process.env.SMARTCACHE_USE_REDIS ?? 'true';
    process.env.SMART_CACHE_TTL_STRONG_S = process.env.SMART_CACHE_TTL_STRONG_S ?? '5';
  });
  let context: TestAppContext;
  let httpServer: any;
  let receiverAPI: ReceiverAPI;
  let queryAPI: QueryAPI;

  beforeAll(async () => {
    context = await createTestApp();
    httpServer = context.httpServer;

    await registerUser(httpServer, TEST_USERS.USER);
    const tokens = await loginUser(httpServer, TEST_USERS.USER.username, TEST_USERS.USER.password);
    const apiKey = await createApiKey(httpServer, tokens.accessToken);

    const apiFactory = new APIFactory(httpServer, tokens.accessToken, apiKey);
    receiverAPI = apiFactory.createReceiverAPI();
    queryAPI = apiFactory.createQueryAPI();
  });

  afterAll(async () => {
    await cleanupTestApp(context);
  });

  it('强时效接口P95响应时间应该 < 2000ms', async () => {
    const iterations = 20;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await receiverAPI.receiveData({
        dataSource: 'longport',
        symbols: [TEST_SYMBOLS.US[0]],
        market: TEST_MARKETS.US,
      });
      durations.push(Date.now() - start);
      await wait(100);
    }

    durations.sort((a, b) => a - b);
    // 使用更合理的P95计算：排除顶部5%最大值（20次中排除最后1个最大值）
    const idx = Math.max(0, Math.floor(iterations * 0.95) - 1);
    const p95 = durations[idx];
    console.log(`强时效接口P95: ${p95}ms`);
    expect(p95).toBeLessThan(2000);
  }, 60000);

  it('弱时效接口P95响应时间应该 < 3000ms', async () => {
    const iterations = 20;
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await queryAPI.execute({
        type: 'BY_SYMBOLS',
        symbols: [TEST_SYMBOLS.US[1]],
      });
      durations.push(Date.now() - start);
      await wait(100);
    }

    durations.sort((a, b) => a - b);
    const idx = Math.max(0, Math.floor(iterations * 0.95) - 1);
    const p95 = durations[idx];
    console.log(`弱时效接口P95: ${p95}ms`);
    expect(p95).toBeLessThan(3000);
  }, 60000);
});
