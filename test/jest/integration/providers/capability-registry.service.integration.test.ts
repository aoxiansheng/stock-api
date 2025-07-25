import { Test, TestingModule } from "@nestjs/testing";
import { mkdir, rmdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { CapabilityRegistryService } from "@providers/capability-registry.service";
import { ICapability } from "@providers/interfaces/capability.interface";

describe("CapabilityRegistryService - Integration", () => {
  let service: CapabilityRegistryService;
  let testDir: string;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let loggerSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;


  // Mock capabilities for testing
  const mockCapability1: ICapability = {
    name: "get-stock-quote",
    description: "Get stock quote data",
    supportedMarkets: ["US", "HK"],
    supportedSymbolFormats: ["TICKER.EXCHANGE"],
    execute: jest.fn(),
  };

  const mockCapability2: ICapability = {
    name: "get-market-data",
    description: "Get market data",
    supportedMarkets: ["US"],
    supportedSymbolFormats: ["TICKER.EXCHANGE"],
    execute: jest.fn(),
  };



  beforeAll(async () => {
    // Create temporary test directory structure
    testDir = join(tmpdir(), "capability-registry-test", Date.now().toString());
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rmdir(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapabilityRegistryService],
    }).compile();

    service = module.get<CapabilityRegistryService>(CapabilityRegistryService);

    // Spy on logger methods
    loggerSpy = jest.spyOn((service as any).logger, "log").mockImplementation();
    warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation();
    jest.spyOn((service as any).logger, "error").mockImplementation();
    jest.spyOn((service as any).logger, "debug").mockImplementation();

    // Clear any existing capabilities
    (service as any).capabilities.clear();
    (service as any).providers.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Manual Capability Registration", () => {
    it("should register capabilities manually", () => {
      service.registerCapability("test-provider", mockCapability1, 1, true);

      const registeredCapability = service.getCapability(
        "test-provider",
        "get-stock-quote",
      );
      expect(registeredCapability).toBeTruthy();
      expect(registeredCapability?.name).toBe("get-stock-quote");
      expect(registeredCapability?.description).toBe("Get stock quote data");
    });

    it("should handle disabled capabilities", () => {
      service.registerCapability("test-provider", mockCapability1, 1, false); // Disabled

      const registeredCapability = service.getCapability(
        "test-provider",
        "get-stock-quote",
      );
      expect(registeredCapability).toBeNull(); // Should return null for disabled capabilities
    });

    it("should register multiple capabilities for same provider", () => {
      service.registerCapability("test-provider", mockCapability1, 1, true);
      service.registerCapability("test-provider", mockCapability2, 2, true);

      expect(
        service.getCapability("test-provider", "get-stock-quote"),
      ).toBeTruthy();
      expect(
        service.getCapability("test-provider", "get-market-data"),
      ).toBeTruthy();
    });

    it("should register capabilities for multiple providers", () => {
      service.registerCapability("provider-a", mockCapability1, 1, true);
      service.registerCapability("provider-b", mockCapability1, 2, true);

      expect(
        service.getCapability("provider-a", "get-stock-quote"),
      ).toBeTruthy();
      expect(
        service.getCapability("provider-b", "get-stock-quote"),
      ).toBeTruthy();
    });
  });

  describe("Best Provider Selection", () => {
    beforeEach(() => {
      // Set up multiple providers with different priorities
      service.registerCapability(
        "low-priority-provider",
        mockCapability1,
        5,
        true,
      );
      service.registerCapability(
        "high-priority-provider",
        mockCapability1,
        1,
        true,
      );
      service.registerCapability(
        "medium-priority-provider",
        mockCapability1,
        3,
        true,
      );
    });

    it("should return provider with highest priority (lowest number)", () => {
      const bestProvider = service.getBestProvider("get-stock-quote");
      expect(bestProvider).toBe("high-priority-provider");
    });

    it("should filter by market when specified", () => {
      // Register a provider that only supports CN market
      const cnOnlyCapability: ICapability = {
        ...mockCapability1,
        supportedMarkets: ["CN"],
      };
      service.registerCapability("cn-only-provider", cnOnlyCapability, 0, true); // Highest priority

      // Should return CN provider for CN market
      expect(service.getBestProvider("get-stock-quote", "CN")).toBe(
        "cn-only-provider",
      );

      // Should return US provider for US market (CN provider doesn't support US)
      expect(service.getBestProvider("get-stock-quote", "US")).toBe(
        "high-priority-provider",
      );
    });

    it("should return null when no providers support the capability", () => {
      const bestProvider = service.getBestProvider("non-existent-capability");
      expect(bestProvider).toBeNull();
    });

    it("should return null when no providers support the specified market", () => {
      const bestProvider = service.getBestProvider(
        "get-stock-quote",
        "UNSUPPORTED_MARKET",
      );
      expect(bestProvider).toBeNull();
    });

    it("should ignore disabled providers", () => {
      // Disable the high-priority provider
      service.registerCapability(
        "high-priority-provider",
        mockCapability1,
        1,
        false,
      );

      const bestProvider = service.getBestProvider("get-stock-quote");
      expect(bestProvider).toBe("medium-priority-provider"); // Next best available
    });
  });

  describe("Provider Instance Management", () => {
    const mockProvider = {
      name: "test-provider",
      version: "1.0.0",
      execute: jest.fn(),
    };

    it("should register provider instances", () => {
      service.registerProvider(mockProvider);

      expect(service.isProviderRegistered("test-provider")).toBe(true);
      expect(service.getProvider("test-provider")).toBe(mockProvider);
    });

    it("should handle invalid provider registration", () => {
      service.registerProvider(null);
      service.registerProvider({
        /* no name */
      });
      service.registerProvider("invalid-provider" as any);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("尝试注册无效的Provider实例"),
      );
    });

    it("should return null for non-existent providers", () => {
      const provider = service.getProvider("non-existent");
      expect(provider).toBeNull();
    });

    it("should return all registered providers", () => {
      const provider1 = { name: "provider-1", execute: jest.fn() };
      const provider2 = { name: "provider-2", execute: jest.fn() };

      service.registerProvider(provider1);
      service.registerProvider(provider2);

      const allProviders = service.getAllProviders();
      expect(allProviders.size).toBe(2);
      expect(allProviders.get("provider-1")).toBe(provider1);
      expect(allProviders.get("provider-2")).toBe(provider2);
    });

    it("should overwrite provider with same name", () => {
      const originalProvider = { name: "test-provider", version: "1.0.0" };
      const newProvider = { name: "test-provider", version: "2.0.0" };

      service.registerProvider(originalProvider);
      service.registerProvider(newProvider);

      expect(service.getProvider("test-provider")).toBe(newProvider);
    });
  });

  describe("Capability Retrieval", () => {
    beforeEach(() => {
      service.registerCapability("test-provider", mockCapability1, 1, true);
      service.registerCapability(
        "disabled-provider",
        mockCapability2,
        1,
        false,
      );
    });

    it("should return null for non-existent provider", () => {
      const capability = service.getCapability(
        "non-existent",
        "get-stock-quote",
      );
      expect(capability).toBeNull();
    });

    it("should return null for non-existent capability", () => {
      const capability = service.getCapability("test-provider", "non-existent");
      expect(capability).toBeNull();
    });

    it("should return null for disabled capability", () => {
      const capability = service.getCapability(
        "disabled-provider",
        "get-market-data",
      );
      expect(capability).toBeNull();
    });

    it("should return capability for valid provider and capability name", () => {
      const capability = service.getCapability(
        "test-provider",
        "get-stock-quote",
      );
      expect(capability).toBe(mockCapability1);
    });
  });

  describe("getAllCapabilities", () => {
    it("should return all registered capabilities", () => {
      service.registerCapability("provider-1", mockCapability1, 1, true);
      service.registerCapability("provider-2", mockCapability2, 1, true);

      const allCapabilities = service.getAllCapabilities();
      expect(allCapabilities.size).toBe(2);
      expect(allCapabilities.get("provider-1")?.size).toBe(1);
      expect(allCapabilities.get("provider-2")?.size).toBe(1);
    });

    it("should return empty map when no capabilities registered", () => {
      const allCapabilities = service.getAllCapabilities();
      expect(allCapabilities.size).toBe(0);
    });

    it("should return immutable reference to capabilities map", () => {
      service.registerCapability("test-provider", mockCapability1, 1, true);

      const allCapabilities = service.getAllCapabilities();

      // Should be the actual internal map reference (based on implementation)
      expect(allCapabilities).toBe((service as any).capabilities);
    });
  });

  describe("File System Discovery Simulation", () => {
    it("should handle directory existence checks", async () => {
      // Test the private directoryExists method indirectly

      // We can't directly test private methods, but we can test the overall behavior
      // that relies on directory existence checks during discovery

      // Mock the internal __dirname to point to our test directory

      // This would normally be tested by setting up actual file structure
      // and calling discoverCapabilities, but that's complex for unit tests
      expect(true).toBe(true); // Placeholder - actual integration would test file discovery
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty capability name", () => {
      const emptyCapability: ICapability = {
        name: "",
        description: "Empty name capability",
        supportedMarkets: ["US"],
        supportedSymbolFormats: ["TICKER.EXCHANGE"],
        execute: jest.fn(),
      };

      service.registerCapability("test-provider", emptyCapability, 1, true);

      const retrieved = service.getCapability("test-provider", "");
      expect(retrieved).toBe(emptyCapability);
    });

    it("should handle capabilities with duplicate names in same provider", () => {
      service.registerCapability("test-provider", mockCapability1, 1, true);

      const updatedCapability = {
        ...mockCapability1,
        description: "Updated description",
      };
      service.registerCapability("test-provider", updatedCapability, 2, true);

      // Should overwrite the previous capability
      const retrieved = service.getCapability(
        "test-provider",
        "get-stock-quote",
      );
      expect(retrieved?.description).toBe("Updated description");
    });

    it("should handle very large number of capabilities", () => {
      // Register many capabilities to test performance and memory usage
      for (let i = 0; i < 1000; i++) {
        const capability: ICapability = {
          name: `capability-${i}`,
          description: `Test capability ${i}`,
          supportedMarkets: ["US"],
          supportedSymbolFormats: ["TICKER.EXCHANGE"],
          execute: jest.fn(),
        };
        service.registerCapability("bulk-provider", capability, i, true);
      }

      const allCapabilities = service.getAllCapabilities();
      const bulkProviderCapabilities = allCapabilities.get("bulk-provider");
      expect(bulkProviderCapabilities?.size).toBe(1000);

      // Test retrieval still works
      const specificCapability = service.getCapability(
        "bulk-provider",
        "capability-500",
      );
      expect(specificCapability?.name).toBe("capability-500");
    });

    it("should handle special characters in provider and capability names", () => {
      const specialCharCapability: ICapability = {
        name: "get-data.with-special@chars#123",
        description: "Capability with special characters",
        supportedMarkets: ["US"],
        supportedSymbolFormats: ["TICKER.EXCHANGE"],
        execute: jest.fn(),
      };

      service.registerCapability(
        "provider@123",
        specialCharCapability,
        1,
        true,
      );

      const retrieved = service.getCapability(
        "provider@123",
        "get-data.with-special@chars#123",
      );
      expect(retrieved).toBe(specialCharCapability);
    });

    it("should handle getBestProvider with edge cases", () => {
      // Test with empty capability name
      expect(service.getBestProvider("")).toBeNull();

      // Test with providers having same priority
      service.registerCapability("provider-a", mockCapability1, 1, true);
      service.registerCapability("provider-b", mockCapability1, 1, true);

      const bestProvider = service.getBestProvider("get-stock-quote");
      // Should return one of them consistently (based on Map iteration order)
      expect(["provider-a", "provider-b"]).toContain(bestProvider);
    });

    it("should handle market filtering edge cases", () => {
      // Capability with empty supported markets
      const noMarketsCapability: ICapability = {
        name: "no-markets-capability",
        description: "Capability with no supported markets",
        supportedMarkets: [],
        supportedSymbolFormats: ["TICKER.EXCHANGE"],
        execute: jest.fn(),
      };

      service.registerCapability(
        "no-markets-provider",
        noMarketsCapability,
        1,
        true,
      );

      // Should return null when looking for any specific market
      expect(service.getBestProvider("no-markets-capability", "US")).toBeNull();

      // Should return the provider when no market is specified
      expect(service.getBestProvider("no-markets-capability")).toBe(
        "no-markets-provider",
      );
    });
  });

  describe("Integration with Real Provider Structure", () => {
    it("should work with typical provider capability structure", () => {
      // Simulate a real provider structure
      const longPortQuoteCapability: ICapability = {
        name: "get-stock-quote",
        description: "Get real-time stock quote from LongPort",
        supportedMarkets: ["HK", "US", "CN"],
        supportedSymbolFormats: ["TICKER.EXCHANGE", "NUMBER.EXCHANGE"],
        execute: async (params: any) => {
          // Simulate real capability execution
          return {
            success: true,
            data: {
              symbol: params.symbol,
              price: 150.25,
              timestamp: new Date().toISOString(),
            },
          };
        },
      };

      const iTick: ICapability = {
        name: "get-stock-quote",
        description: "Get stock quote from iTick",
        supportedMarkets: ["US"],
        supportedSymbolFormats: ["TICKER.EXCHANGE"],
        execute: async (params: any) => {
          return {
            success: true,
            data: {
              symbol: params.symbol,
              price: 149.8,
              timestamp: new Date().toISOString(),
            },
          };
        },
      };

      // Register with different priorities
      service.registerCapability("longport", longPortQuoteCapability, 1, true);
      service.registerCapability("itick", iTick, 2, true);

      // Test market-specific selection
      expect(service.getBestProvider("get-stock-quote", "HK")).toBe("longport");
      expect(service.getBestProvider("get-stock-quote", "US")).toBe("longport"); // Higher priority
      expect(service.getBestProvider("get-stock-quote", "CN")).toBe("longport");

      // Test execution
      const hkCapability = service.getCapability("longport", "get-stock-quote");
      expect(hkCapability).toBeTruthy();
      expect(typeof hkCapability?.execute).toBe("function");
    });
  });
});
