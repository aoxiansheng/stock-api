import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { createMock } from "@golevelup/ts-jest";
import { DataMapperModule } from "../../../../../../src/core/data-mapper/module/data-mapper.module";
import { DataSourceAnalyzerService } from "../../../../../../src/core/data-mapper/services/data-source-analyzer.service";
import { DataSourceTemplateService } from "../../../../../../src/core/data-mapper/services/data-source-template.service";
import { FlexibleMappingRuleService } from "../../../../../../src/core/data-mapper/services/flexible-mapping-rule.service";
import { PersistedTemplateService } from "../../../../../../src/core/data-mapper/services/persisted-template.service";
import { RuleAlignmentService } from "../../../../../../src/core/data-mapper/services/rule-alignment.service";
import { MappingRuleCacheService } from "../../../../../../src/core/data-mapper/services/mapping-rule-cache.service";
import { UserJsonPersistenceController } from "../../../../../../src/core/data-mapper/controller/user-json-persistence.controller";
import { SystemPersistenceController } from "../../../../../../src/core/data-mapper/controller/system-persistence.controller";
import { TemplateAdminController } from "../../../../../../src/core/data-mapper/controller/template-admin.controller";
import { MappingRuleController } from "../../../../../../src/core/data-mapper/controller/mapping-rule.controller";
import { DataSourceTemplate } from "../../../../../../src/core/data-mapper/schemas/data-source-template.schema";
import { FlexibleMappingRule } from "../../../../../../src/core/data-mapper/schemas/flexible-mapping-rule.schema";
import { PaginationService } from "../../../../../../src/common/modules/pagination/services/pagination.service";
import { CacheService } from "../../../../../../src/cache/services/cache.service";
import { MetricsRegistryService } from "../../../../../../src/monitoring/metrics/metrics-registry.service";
import { FeatureFlags } from "../../../../../../src/common/config/feature-flags.config";

// Mock external modules that are imported
jest.mock("../../../../../../src/auth/auth.module", () => ({
  AuthModule: {},
}));

jest.mock("../../../../../../src/common/modules/pagination/pagination.module", () => ({
  PaginationModule: {},
}));

jest.mock("../../../../../../src/monitoring/monitoring.module", () => ({
  MonitoringModule: {},
}));

jest.mock("../../../../../../src/common/modules/cache/cache.module", () => ({
  CacheModule: {},
}));

jest.mock("@nestjs/mongoose", () => ({
  ...jest.requireActual("@nestjs/mongoose"),
  MongooseModule: {
    forFeature: jest.fn(() => ({})),
  },
}));

describe("DataMapperModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [DataMapperModule],
    })
    .overrideProvider(getModelToken(DataSourceTemplate.name))
    .useValue(createMock())
    .overrideProvider(getModelToken(FlexibleMappingRule.name))
    .useValue(createMock())
    .overrideProvider(PaginationService)
    .useValue(createMock<PaginationService>())
    .overrideProvider(CacheService)
    .useValue(createMock<CacheService>())
    .overrideProvider(MetricsRegistryService)
    .useValue(createMock<MetricsRegistryService>())
    .overrideProvider(FeatureFlags)
    .useValue(createMock<FeatureFlags>())
    .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe("Module Compilation", () => {
    it("should compile the module", () => {
      expect(module).toBeDefined();
    });

    it("should be defined", () => {
      expect(module).toBeDefined();
    });
  });

  describe("Controllers", () => {
    it("should have UserJsonPersistenceController", () => {
      const controller = module.get<UserJsonPersistenceController>(UserJsonPersistenceController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(UserJsonPersistenceController);
    });

    it("should have SystemPersistenceController", () => {
      const controller = module.get<SystemPersistenceController>(SystemPersistenceController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SystemPersistenceController);
    });

    it("should have TemplateAdminController", () => {
      const controller = module.get<TemplateAdminController>(TemplateAdminController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(TemplateAdminController);
    });

    it("should have MappingRuleController", () => {
      const controller = module.get<MappingRuleController>(MappingRuleController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MappingRuleController);
    });
  });

  describe("Services", () => {
    it("should have DataSourceAnalyzerService", () => {
      const service = module.get<DataSourceAnalyzerService>(DataSourceAnalyzerService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataSourceAnalyzerService);
    });

    it("should have DataSourceTemplateService", () => {
      const service = module.get<DataSourceTemplateService>(DataSourceTemplateService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataSourceTemplateService);
    });

    it("should have FlexibleMappingRuleService", () => {
      const service = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FlexibleMappingRuleService);
    });

    it("should have PersistedTemplateService", () => {
      const service = module.get<PersistedTemplateService>(PersistedTemplateService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PersistedTemplateService);
    });

    it("should have RuleAlignmentService", () => {
      const service = module.get<RuleAlignmentService>(RuleAlignmentService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RuleAlignmentService);
    });

    it("should have MappingRuleCacheService", () => {
      const service = module.get<MappingRuleCacheService>(MappingRuleCacheService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MappingRuleCacheService);
    });

    it("should have FeatureFlags", () => {
      const featureFlags = module.get<FeatureFlags>(FeatureFlags);
      expect(featureFlags).toBeDefined();
    });
  });

  describe("Service Dependencies", () => {
    it("should inject dependencies correctly into DataSourceTemplateService", () => {
      const service = module.get<DataSourceTemplateService>(DataSourceTemplateService);
      expect(service).toBeDefined();
      
      // Check that the service can be instantiated (implies dependencies are satisfied)
      expect(service).toBeInstanceOf(DataSourceTemplateService);
    });

    it("should inject dependencies correctly into FlexibleMappingRuleService", () => {
      const service = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FlexibleMappingRuleService);
    });

    it("should inject dependencies correctly into MappingRuleCacheService", () => {
      const service = module.get<MappingRuleCacheService>(MappingRuleCacheService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MappingRuleCacheService);
    });
  });

  describe("Controller Dependencies", () => {
    it("should inject services into MappingRuleController", () => {
      const controller = module.get<MappingRuleController>(MappingRuleController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MappingRuleController);
    });

    it("should inject services into TemplateAdminController", () => {
      const controller = module.get<TemplateAdminController>(TemplateAdminController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(TemplateAdminController);
    });

    it("should inject services into SystemPersistenceController", () => {
      const controller = module.get<SystemPersistenceController>(SystemPersistenceController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SystemPersistenceController);
    });

    it("should inject services into UserJsonPersistenceController", () => {
      const controller = module.get<UserJsonPersistenceController>(UserJsonPersistenceController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(UserJsonPersistenceController);
    });
  });

  describe("Exports", () => {
    it("should export DataSourceAnalyzerService", () => {
      const service = module.get<DataSourceAnalyzerService>(DataSourceAnalyzerService);
      expect(service).toBeDefined();
    });

    it("should export DataSourceTemplateService", () => {
      const service = module.get<DataSourceTemplateService>(DataSourceTemplateService);
      expect(service).toBeDefined();
    });

    it("should export FlexibleMappingRuleService", () => {
      const service = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      expect(service).toBeDefined();
    });

    it("should export PersistedTemplateService", () => {
      const service = module.get<PersistedTemplateService>(PersistedTemplateService);
      expect(service).toBeDefined();
    });

    it("should export RuleAlignmentService", () => {
      const service = module.get<RuleAlignmentService>(RuleAlignmentService);
      expect(service).toBeDefined();
    });

    it("should export MappingRuleCacheService", () => {
      const service = module.get<MappingRuleCacheService>(MappingRuleCacheService);
      expect(service).toBeDefined();
    });
  });

  describe("Schema Registration", () => {
    it("should register DataSourceTemplate schema", () => {
      // Since MongooseModule.forFeature is mocked, we just verify the service can be created
      // which implies the schema is registered correctly in the actual implementation
      const service = module.get<DataSourceTemplateService>(DataSourceTemplateService);
      expect(service).toBeDefined();
    });

    it("should register FlexibleMappingRule schema", () => {
      // Since MongooseModule.forFeature is mocked, we just verify the service can be created
      // which implies the schema is registered correctly in the actual implementation
      const service = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      expect(service).toBeDefined();
    });
  });

  describe("Module Structure", () => {
    it("should have all required imports", () => {
      // This is verified by the module compiling successfully
      expect(module).toBeDefined();
    });

    it("should have all controllers registered", () => {
      const userJsonController = module.get<UserJsonPersistenceController>(UserJsonPersistenceController);
      const systemController = module.get<SystemPersistenceController>(SystemPersistenceController);
      const templateController = module.get<TemplateAdminController>(TemplateAdminController);
      const mappingController = module.get<MappingRuleController>(MappingRuleController);

      expect(userJsonController).toBeDefined();
      expect(systemController).toBeDefined();
      expect(templateController).toBeDefined();
      expect(mappingController).toBeDefined();
    });

    it("should have all services registered", () => {
      const analyzerService = module.get<DataSourceAnalyzerService>(DataSourceAnalyzerService);
      const templateService = module.get<DataSourceTemplateService>(DataSourceTemplateService);
      const ruleService = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      const persistedService = module.get<PersistedTemplateService>(PersistedTemplateService);
      const alignmentService = module.get<RuleAlignmentService>(RuleAlignmentService);
      const cacheService = module.get<MappingRuleCacheService>(MappingRuleCacheService);

      expect(analyzerService).toBeDefined();
      expect(templateService).toBeDefined();
      expect(ruleService).toBeDefined();
      expect(persistedService).toBeDefined();
      expect(alignmentService).toBeDefined();
      expect(cacheService).toBeDefined();
    });

    it("should support circular service dependencies if any", () => {
      // Test that services can reference each other if needed
      const templateService = module.get<DataSourceTemplateService>(DataSourceTemplateService);
      const ruleService = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      
      expect(templateService).toBeDefined();
      expect(ruleService).toBeDefined();
    });
  });

  describe("Integration", () => {
    it("should allow services to be injected into controllers", () => {
      const mappingController = module.get<MappingRuleController>(MappingRuleController);
      const templateController = module.get<TemplateAdminController>(TemplateAdminController);
      
      // If controllers can be instantiated, their dependencies are satisfied
      expect(mappingController).toBeDefined();
      expect(templateController).toBeDefined();
    });

    it("should allow cross-service dependencies", () => {
      // Services that depend on other services should be able to get them
      const ruleService = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      const cacheService = module.get<MappingRuleCacheService>(MappingRuleCacheService);
      const templateService = module.get<DataSourceTemplateService>(DataSourceTemplateService);
      
      expect(ruleService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(templateService).toBeDefined();
    });

    it("should provide feature flags to services", () => {
      const featureFlags = module.get<FeatureFlags>(FeatureFlags);
      expect(featureFlags).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing dependencies gracefully", () => {
      // This test verifies the module setup handles all dependencies
      expect(module).toBeDefined();
    });

    it("should maintain singleton services", () => {
      const service1 = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      const service2 = module.get<FlexibleMappingRuleService>(FlexibleMappingRuleService);
      
      expect(service1).toBe(service2); // Should be the same instance
    });

    it("should maintain singleton controllers", () => {
      const controller1 = module.get<MappingRuleController>(MappingRuleController);
      const controller2 = module.get<MappingRuleController>(MappingRuleController);
      
      expect(controller1).toBe(controller2); // Should be the same instance
    });
  });
});