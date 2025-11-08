/**
 * E2E: Concurrency (并发)
 * 将原 02 用例中的并发测试拆分为独立文件
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
  assertStandardResponse,
} from './helpers/test-setup.helper';
import { APIFactory, ReceiverAPI } from './helpers/api-request.helper';

describe('E2E: Concurrency (并发)', () => {
  let context: TestAppContext;
  let httpServer: any;
  let receiverAPI: ReceiverAPI;

  beforeAll(async () => {
    context = await createTestApp();
    httpServer = context.httpServer;

    await registerUser(httpServer, TEST_USERS.USER);
    const tokens = await loginUser(httpServer, TEST_USERS.USER.username, TEST_USERS.USER.password);
    const apiKey = await createApiKey(httpServer, tokens.accessToken);

    const apiFactory = new APIFactory(httpServer, tokens.accessToken, apiKey);
    receiverAPI = apiFactory.createReceiverAPI();
  });

  afterAll(async () => {
    await cleanupTestApp(context);
  });

  it('应该正确处理100个并发请求', async () => {
    const symbol = TEST_SYMBOLS.HK[1]; // 09988.HK

    const requests = Array(100)
      .fill(null)
      .map(() =>
        receiverAPI.receiveData({
          dataSource: 'longport',
          symbols: [symbol],
          market: TEST_MARKETS.HK,
        }),
      );

    const responses = await Promise.all(requests);

    responses.forEach((response) => {
      expect(response.status).toBe(200);
      assertStandardResponse(response);
    });
  }, 30000);
});

