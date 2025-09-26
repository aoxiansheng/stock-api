import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryModule } from '@nestjs/core';
import { PermissionModule } from '@auth/permission/permission.module';
import {
  AuthPermissionConstants,
  AuthPermissionMetadataExtractor,
  AuthPermissionValidationService,
} from '@auth/permission/adapters/auth-permission.adapter';
import { PermissionDecoratorValidator } from '@auth/permission/validators/permission-decorator.validator';

describe('PermissionModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [PermissionModule],
    }).compile();
  });

  it('应该成功编译模块', async () => {
    expect(module).toBeDefined();
  });

  it('应该提供所有必需的服务', async () => {
    // 验证模块是否提供了所有必需的服务
    expect(module.get(AuthPermissionConstants)).toBeInstanceOf(AuthPermissionConstants);
    expect(module.get(AuthPermissionMetadataExtractor)).toBeInstanceOf(AuthPermissionMetadataExtractor);
    expect(module.get(AuthPermissionValidationService)).toBeInstanceOf(AuthPermissionValidationService);
    expect(module.get(PermissionDecoratorValidator)).toBeInstanceOf(PermissionDecoratorValidator);
  });

  it('应该导入DiscoveryModule', async () => {
    // 验证模块是否正确导入了DiscoveryModule
    const importedModules = (module as any).imports;
    const discoveryModule = importedModules.find((mod: any) => mod instanceof DiscoveryModule);
    expect(discoveryModule).toBeDefined();
  });

  it('应该正确导出服务', async () => {
    // 验证模块是否正确导出了服务
    const exportedProviders = (module as any).exports;
    expect(exportedProviders).toContain(AuthPermissionValidationService);
    expect(exportedProviders).toContain(PermissionDecoratorValidator);
  });

  describe('模块集成测试', () => {
    it('应该能够解析依赖关系', async () => {
      // 验证服务之间的依赖关系是否正确解析
      const permissionValidationService = module.get(AuthPermissionValidationService);
      const metadataExtractor = module.get(AuthPermissionMetadataExtractor);
      const constants = module.get(AuthPermissionConstants);
      
      expect(permissionValidationService).toBeDefined();
      expect(metadataExtractor).toBeDefined();
      expect(constants).toBeDefined();
      
      // 验证依赖注入是否正确
      expect((permissionValidationService as any).extractor).toBe(metadataExtractor);
      expect((permissionValidationService as any).constants).toBe(constants);
      expect((metadataExtractor as any).constants).toBe(constants);
    });

    it('应该正确初始化常量服务', async () => {
      const constants = module.get(AuthPermissionConstants);
      
      // 验证常量服务是否正确初始化
      expect(constants.REQUIRE_API_KEY_METADATA_KEY).toBeDefined();
      expect(constants.PERMISSIONS_METADATA_KEY).toBeDefined();
      expect(constants.AVAILABLE_PERMISSIONS).toBeDefined();
      expect(constants.PERMISSION_LEVELS).toBeDefined();
    });
  });
});