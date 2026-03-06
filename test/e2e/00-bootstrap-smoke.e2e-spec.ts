/**
 * E2E Smoke: 启停检查
 * 用于 open-handle 诊断模式下快速验证应用可正常启动并释放资源
 */
import {
  createTestApp,
  cleanupTestApp,
  E2E_TEST_TIMEOUT_MS,
  TestAppContext,
} from './helpers/test-setup.helper';

describe('E2E: Bootstrap Smoke (启停冒烟)', () => {
  let context: TestAppContext;

  beforeAll(async () => {
    context = await createTestApp();
  }, E2E_TEST_TIMEOUT_MS);

  afterAll(async () => {
    await cleanupTestApp(context);
  }, E2E_TEST_TIMEOUT_MS);

  it('应用应成功完成启动并提供 http server', () => {
    expect(context).toBeDefined();
    expect(context.httpServer).toBeDefined();
  });
});
