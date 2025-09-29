import { TestingModule } from '@nestjs/testing';
import { AuthModule } from '@auth/module/auth.module';
import { CacheModule } from '@cache/module/cache.module';
import { UnitTestSetup } from '@test/testbasic/setup/unit-test-setup';
import { TestCacheModule } from '@test/testbasic/modules/test-cache.module';

// Services
import { AuthFacadeService } from '@auth/services/facade/auth-facade.service';
import { UserAuthenticationService } from '@auth/services/domain/user-authentication.service';
import { TokenService } from '@auth/services/infrastructure/token.service';

describe('AuthModule (Simple Test Infrastructure)', () => {
  let module: TestingModule;
  let testContext: any;

  beforeAll(async () => {
    // 简化版本 - 使用模块覆盖方式
    testContext = await UnitTestSetup.createTestContext(async () => {
      return await UnitTestSetup.createBasicTestModuleWithOverrides({
        imports: [AuthModule],
        overrides: [
          {
            module: CacheModule,
            override: TestCacheModule,
          },
        ],
      });
    });

    await testContext.setup();
    module = testContext.getModule();
  });

  afterAll(async () => {
    await testContext.cleanup();
  });

  describe('基础验证', () => {
    it('should compile the module', () => {
      expect(module).toBeDefined();
      UnitTestSetup.validateModuleCompilation(module);
    });

    it('should provide basic services', async () => {
      const authFacade = await testContext.getService(AuthFacadeService);
      expect(authFacade).toBeDefined();
      expect(authFacade).toBeInstanceOf(AuthFacadeService);
    });

    it('should have mock dependencies', async () => {
      // 验证Redis Mock可用
      const redisMock = await testContext.getService('default_IORedisModuleConnectionToken');
      expect(redisMock).toBeDefined();
      expect(typeof redisMock.get).toBe('function');
      expect(typeof redisMock.set).toBe('function');
    });
  });

  describe('核心服务验证', () => {
    it('should provide domain services', async () => {
      const userAuth = await testContext.getService(UserAuthenticationService);
      const tokenService = await testContext.getService(TokenService);

      expect(userAuth).toBeDefined();
      expect(tokenService).toBeDefined();
    });
  });
});