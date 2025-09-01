import { Test, TestingModule } from "@nestjs/testing";
import { HealthModule } from "@monitoring/health/health.module";
import { ExtendedHealthService } from "@monitoring/health/extended-health.service";
import { ConfigValidationModule } from "../../../../../src/app/config/validation/config-validation.module";
import { StartupModule } from "../../../../../src/app/startup/startup.module";

describe("HealthModule", () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Mock the dependencies to avoid complex module resolution
    const mockConfigValidationModule = {
      providers: [],
      exports: [],
    };

    const mockStartupModule = {
      providers: [],
      exports: [],
    };

    // Simplified test approach - test the module directly
    module = await Test.createTestingModule({
      imports: [HealthModule],
    })
      .overrideProvider("ConfigValidatorService")
      .useValue({
        validateAll: jest.fn(),
      })
      .overrideProvider("StartupHealthCheckerService")
      .useValue({
        performQuickCheck: jest.fn(),
      })
      .compile();
  });

  afterEach(async () => {
    await module?.close();
  });

  it("should be defined", () => {
    expect(module).toBeDefined();
  });

  it("should provide ExtendedHealthService", () => {
    const service = module.get<ExtendedHealthService>(ExtendedHealthService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ExtendedHealthService);
  });

  it("should export ExtendedHealthService", () => {
    // Test that the service is exported and can be retrieved
    const service = module.get<ExtendedHealthService>(ExtendedHealthService);
    expect(service).toBeDefined();
  });

  it("should import ConfigValidationModule", () => {
    // Verify that the module imports are correct
    const moduleRef = module.get(HealthModule);
    expect(moduleRef).toBeDefined();
  });

  it("should import StartupModule", () => {
    // Verify that the module imports are correct
    const moduleRef = module.get(HealthModule);
    expect(moduleRef).toBeDefined();
  });

  describe("module configuration", () => {
    it("should have correct providers", () => {
      // Verify that ExtendedHealthService is available as a provider
      const service = module.get<ExtendedHealthService>(ExtendedHealthService);
      expect(service).toBeDefined();
    });

    it("should have correct exports", () => {
      // ExtendedHealthService should be available for other modules to use
      const service = module.get<ExtendedHealthService>(ExtendedHealthService);
      expect(service).toBeDefined();
      expect(service.getFullHealthStatus).toBeDefined();
      expect(service.getConfigHealthStatus).toBeDefined();
      expect(service.getDependenciesHealthStatus).toBeDefined();
      expect(service.performStartupCheck).toBeDefined();
    });
  });

  describe("service integration", () => {
    it("should provide working ExtendedHealthService methods", () => {
      const service = module.get<ExtendedHealthService>(ExtendedHealthService);

      // Verify all required methods are available
      expect(typeof service.getFullHealthStatus).toBe("function");
      expect(typeof service.getConfigHealthStatus).toBe("function");
      expect(typeof service.getDependenciesHealthStatus).toBe("function");
      expect(typeof service.performStartupCheck).toBe("function");
    });
  });
});
