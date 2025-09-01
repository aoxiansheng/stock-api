/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { createMock } from "@golevelup/ts-jest";
import { Model } from "mongoose";
import { DataSourceAnalyzerService } from "../../../../../../../src/core/00-prepare/data-mapper/services/data-source-analyzer.service";
import { DataSourceTemplateService } from "../../../../../../../src/core/00-prepare/data-mapper/services/data-source-template.service";
import { FlexibleMappingRuleService } from "../../../../../../../src/core/00-prepare/data-mapper/services/flexible-mapping-rule.service";
import { PersistedTemplateService } from "../../../../../../../src/core/00-prepare/data-mapper/services/persisted-template.service";
import { RuleAlignmentService } from "../../../../../../../src/core/00-prepare/data-mapper/services/rule-alignment.service";
import { MappingRuleCacheService } from "../../../../../../../src/core/00-prepare/data-mapper/services/mapping-rule-cache.service";
import { UserJsonPersistenceController } from "../../../../../../../src/core/00-prepare/data-mapper/controller/user-json-persistence.controller";
import { SystemPersistenceController } from "../../../../../../../src/core/00-prepare/data-mapper/controller/system-persistence.controller";
import { TemplateAdminController } from "../../../../../../../src/core/00-prepare/data-mapper/controller/template-admin.controller";
import { MappingRuleController } from "../../../../../../../src/core/00-prepare/data-mapper/controller/mapping-rule.controller";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument,
} from "../../../../../../../src/core/00-prepare/data-mapper/schemas/data-source-template.schema";
import {
  FlexibleMappingRule,
  FlexibleMappingRuleDocument,
} from "../../../../../../../src/core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema";
import { PaginationService } from "../../../../../../../src/common/modules/pagination/services/pagination.service";
import { MetricsRegistryService } from "../../../../../../../src/monitoring/infrastructure/metrics/metrics-registry.service";
import { DataMapperCacheService } from "../../../../../../../src/core/05-caching/data-mapper-cache/services/data-mapper-cache.service";
import { FeatureFlags } from "../../../../../../../src/app/config/feature-flags.config";

// Mock logger to avoid issues in testing
jest.mock("../@app/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("DataMapperModule Components", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [
        UserJsonPersistenceController,
        SystemPersistenceController,
        TemplateAdminController,
        MappingRuleController,
      ],
      providers: [
        FeatureFlags,
        DataSourceAnalyzerService,
        DataSourceTemplateService,
        FlexibleMappingRuleService,
        PersistedTemplateService,
        RuleAlignmentService,
        MappingRuleCacheService,
        DataMapperCacheService,
        PaginationService,
        MetricsRegistryService,
        {
          provide: getModelToken(DataSourceTemplate.name),
          useValue: createMock<Model<DataSourceTemplateDocument>>(),
        },
        {
          provide: getModelToken(FlexibleMappingRule.name),
          useValue: createMock<Model<FlexibleMappingRuleDocument>>(),
        },
      ],
    })
      .overrideProvider(PaginationService)
      .useValue(createMock<PaginationService>())
      .overrideProvider(DataMapperCacheService)
      .useValue(createMock<DataMapperCacheService>())
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
    it("should compile the testing module with all components", () => {
      expect(module).toBeDefined();
    });
  });

  describe("Controllers", () => {
    it("should have UserJsonPersistenceController", () => {
      const controller = module.get<UserJsonPersistenceController>(
        UserJsonPersistenceController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(UserJsonPersistenceController);
    });

    it("should have SystemPersistenceController", () => {
      const controller = module.get<SystemPersistenceController>(
        SystemPersistenceController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SystemPersistenceController);
    });

    it("should have TemplateAdminController", () => {
      const controller = module.get<TemplateAdminController>(
        TemplateAdminController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(TemplateAdminController);
    });

    it("should have MappingRuleController", () => {
      const controller = module.get<MappingRuleController>(
        MappingRuleController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MappingRuleController);
    });
  });

  describe("Services", () => {
    it("should have DataSourceAnalyzerService", () => {
      const service = module.get<DataSourceAnalyzerService>(
        DataSourceAnalyzerService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataSourceAnalyzerService);
    });

    it("should have DataSourceTemplateService", () => {
      const service = module.get<DataSourceTemplateService>(
        DataSourceTemplateService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataSourceTemplateService);
    });

    it("should have FlexibleMappingRuleService", () => {
      const service = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FlexibleMappingRuleService);
    });

    it("should have PersistedTemplateService", () => {
      const service = module.get<PersistedTemplateService>(
        PersistedTemplateService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PersistedTemplateService);
    });

    it("should have RuleAlignmentService", () => {
      const service = module.get<RuleAlignmentService>(RuleAlignmentService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RuleAlignmentService);
    });

    it("should have MappingRuleCacheService", () => {
      const service = module.get<MappingRuleCacheService>(
        MappingRuleCacheService,
      );
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
      const service = module.get<DataSourceTemplateService>(
        DataSourceTemplateService,
      );
      expect(service).toBeDefined();

      // Check that the service can be instantiated (implies dependencies are satisfied)
      expect(service).toBeInstanceOf(DataSourceTemplateService);
    });

    it("should inject dependencies correctly into FlexibleMappingRuleService", () => {
      const service = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FlexibleMappingRuleService);
    });

    it("should inject dependencies correctly into MappingRuleCacheService", () => {
      const service = module.get<MappingRuleCacheService>(
        MappingRuleCacheService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MappingRuleCacheService);
    });
  });

  describe("Controller Dependencies", () => {
    it("should inject services into MappingRuleController", () => {
      const controller = module.get<MappingRuleController>(
        MappingRuleController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(MappingRuleController);
    });

    it("should inject services into TemplateAdminController", () => {
      const controller = module.get<TemplateAdminController>(
        TemplateAdminController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(TemplateAdminController);
    });

    it("should inject services into SystemPersistenceController", () => {
      const controller = module.get<SystemPersistenceController>(
        SystemPersistenceController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SystemPersistenceController);
    });

    it("should inject services into UserJsonPersistenceController", () => {
      const controller = module.get<UserJsonPersistenceController>(
        UserJsonPersistenceController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(UserJsonPersistenceController);
    });
  });

  describe("Service Availability", () => {
    it("should provide DataSourceAnalyzerService", () => {
      const service = module.get<DataSourceAnalyzerService>(
        DataSourceAnalyzerService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataSourceAnalyzerService);
    });

    it("should provide DataSourceTemplateService", () => {
      const service = module.get<DataSourceTemplateService>(
        DataSourceTemplateService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DataSourceTemplateService);
    });

    it("should provide FlexibleMappingRuleService", () => {
      const service = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FlexibleMappingRuleService);
    });

    it("should provide PersistedTemplateService", () => {
      const service = module.get<PersistedTemplateService>(
        PersistedTemplateService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(PersistedTemplateService);
    });

    it("should provide RuleAlignmentService", () => {
      const service = module.get<RuleAlignmentService>(RuleAlignmentService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RuleAlignmentService);
    });

    it("should provide MappingRuleCacheService", () => {
      const service = module.get<MappingRuleCacheService>(
        MappingRuleCacheService,
      );
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MappingRuleCacheService);
    });
  });

  describe("Schema Dependencies", () => {
    it("should provide DataSourceTemplate model token", () => {
      const model = module.get(getModelToken(DataSourceTemplate.name));
      expect(model).toBeDefined();
    });

    it("should provide FlexibleMappingRule model token", () => {
      const model = module.get(getModelToken(FlexibleMappingRule.name));
      expect(model).toBeDefined();
    });

    it("should inject models into services that need them", () => {
      const templateService = module.get<DataSourceTemplateService>(
        DataSourceTemplateService,
      );
      const ruleService = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );

      expect(templateService).toBeDefined();
      expect(ruleService).toBeDefined();
    });
  });

  describe("Component Registration", () => {
    it("should have all controllers registered", () => {
      const userJsonController = module.get<UserJsonPersistenceController>(
        UserJsonPersistenceController,
      );
      const systemController = module.get<SystemPersistenceController>(
        SystemPersistenceController,
      );
      const templateController = module.get<TemplateAdminController>(
        TemplateAdminController,
      );
      const mappingController = module.get<MappingRuleController>(
        MappingRuleController,
      );

      expect(userJsonController).toBeDefined();
      expect(systemController).toBeDefined();
      expect(templateController).toBeDefined();
      expect(mappingController).toBeDefined();
    });

    it("should have all services registered", () => {
      const analyzerService = module.get<DataSourceAnalyzerService>(
        DataSourceAnalyzerService,
      );
      const templateService = module.get<DataSourceTemplateService>(
        DataSourceTemplateService,
      );
      const ruleService = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );
      const persistedService = module.get<PersistedTemplateService>(
        PersistedTemplateService,
      );
      const alignmentService =
        module.get<RuleAlignmentService>(RuleAlignmentService);
      const cacheService = module.get<MappingRuleCacheService>(
        MappingRuleCacheService,
      );

      expect(analyzerService).toBeDefined();
      expect(templateService).toBeDefined();
      expect(ruleService).toBeDefined();
      expect(persistedService).toBeDefined();
      expect(alignmentService).toBeDefined();
      expect(cacheService).toBeDefined();
    });

    it("should handle service interdependencies", () => {
      // Test that services can reference each other if needed
      const templateService = module.get<DataSourceTemplateService>(
        DataSourceTemplateService,
      );
      const ruleService = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );
      const cacheService = module.get<MappingRuleCacheService>(
        MappingRuleCacheService,
      );

      expect(templateService).toBeDefined();
      expect(ruleService).toBeDefined();
      expect(cacheService).toBeDefined();
    });
  });

  describe("Integration", () => {
    it("should allow services to be injected into controllers", () => {
      const mappingController = module.get<MappingRuleController>(
        MappingRuleController,
      );
      const templateController = module.get<TemplateAdminController>(
        TemplateAdminController,
      );

      // If controllers can be instantiated, their dependencies are satisfied
      expect(mappingController).toBeDefined();
      expect(templateController).toBeDefined();
    });

    it("should allow cross-service dependencies", () => {
      // Services that depend on other services should be able to get them
      const ruleService = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );
      const cacheService = module.get<MappingRuleCacheService>(
        MappingRuleCacheService,
      );
      const templateService = module.get<DataSourceTemplateService>(
        DataSourceTemplateService,
      );

      expect(ruleService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(templateService).toBeDefined();
    });

    it("should provide feature flags to services", () => {
      const featureFlags = module.get<FeatureFlags>(FeatureFlags);
      expect(featureFlags).toBeDefined();
    });
  });

  describe("Dependency Injection", () => {
    it("should successfully inject all dependencies", () => {
      // This test verifies the component setup handles all dependencies
      expect(module).toBeDefined();
    });

    it("should maintain singleton pattern for services", () => {
      const service1 = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );
      const service2 = module.get<FlexibleMappingRuleService>(
        FlexibleMappingRuleService,
      );

      expect(service1).toBe(service2); // Should be the same instance
    });

    it("should maintain singleton pattern for controllers", () => {
      const controller1 = module.get<MappingRuleController>(
        MappingRuleController,
      );
      const controller2 = module.get<MappingRuleController>(
        MappingRuleController,
      );

      expect(controller1).toBe(controller2); // Should be the same instance
    });

    it("should maintain singleton pattern for shared dependencies", () => {
      const featureFlags1 = module.get<FeatureFlags>(FeatureFlags);
      const featureFlags2 = module.get<FeatureFlags>(FeatureFlags);

      expect(featureFlags1).toBe(featureFlags2); // Should be the same instance
    });

    it("should verify all expected components are registered", () => {
      // Controllers
      expect(() => module.get(UserJsonPersistenceController)).not.toThrow();
      expect(() => module.get(SystemPersistenceController)).not.toThrow();
      expect(() => module.get(TemplateAdminController)).not.toThrow();
      expect(() => module.get(MappingRuleController)).not.toThrow();

      // Services
      expect(() => module.get(DataSourceAnalyzerService)).not.toThrow();
      expect(() => module.get(DataSourceTemplateService)).not.toThrow();
      expect(() => module.get(FlexibleMappingRuleService)).not.toThrow();
      expect(() => module.get(PersistedTemplateService)).not.toThrow();
      expect(() => module.get(RuleAlignmentService)).not.toThrow();
      expect(() => module.get(MappingRuleCacheService)).not.toThrow();

      // Dependencies
      expect(() => module.get(FeatureFlags)).not.toThrow();
      expect(() =>
        module.get(getModelToken(DataSourceTemplate.name)),
      ).not.toThrow();
      expect(() =>
        module.get(getModelToken(FlexibleMappingRule.name)),
      ).not.toThrow();
    });
  });
});
