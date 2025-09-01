/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { createMock } from "@golevelup/ts-jest";
import { LongportProvider } from "../../../../../src/providers/longport/longport.provider";
import { LongportContextService } from "../../../../../src/providers/longport/services/longport-context.service";
import { LongportStreamContextService } from "../../../../../src/providers/longport/services/longport-stream-context.service";

describe("LongportProvider", () => {
  let provider: LongportProvider;
  let configService: jest.Mocked<ConfigService>;
  let contextService: jest.Mocked<LongportContextService>;
  let streamContextService: jest.Mocked<LongportStreamContextService>;

  beforeEach(async () => {
    const mockConfigService = createMock<ConfigService>();
    const mockContextService = createMock<LongportContextService>();
    const mockStreamContextService = createMock<LongportStreamContextService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LongportProvider,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: LongportContextService,
          useValue: mockContextService,
        },
        {
          provide: LongportStreamContextService,
          useValue: mockStreamContextService,
        },
      ],
    }).compile();

    provider = module.get<LongportProvider>(LongportProvider);
    configService = module.get(ConfigService);
    contextService = module.get(LongportContextService);
    streamContextService = module.get(LongportStreamContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(provider).toBeDefined();
  });

  it("should have correct provider metadata", () => {
    expect(provider.name).toBe("longport");
    expect(provider.description).toBe("LongPort 长桥证券数据提供商");
    expect(provider.capabilities).toBeDefined();
    expect(Array.isArray(provider.capabilities)).toBe(true);
  });

  it("should have expected capabilities", () => {
    expect(provider.capabilities).toHaveLength(3);
    const capabilityNames = provider.capabilities.map((cap) => cap.name);
    expect(capabilityNames).toContain("get-stock-quote");
    expect(capabilityNames).toContain("get-stock-basic-info");
    expect(capabilityNames).toContain("get-index-quote");
  });

  it("should initialize successfully", async () => {
    await expect(provider.initialize()).resolves.not.toThrow();
  });

  it("should delegate testConnection to context service", async () => {
    contextService.testConnection.mockResolvedValue(true);
    const result = await provider.testConnection();
    expect(contextService.testConnection).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it("should return existing capability by name", () => {
    const stockQuoteCapability = provider.getCapability("get-stock-quote");
    expect(stockQuoteCapability).not.toBeNull();
    expect(stockQuoteCapability?.name).toBe("get-stock-quote");
  });

  it("should return null for non-existent capability", () => {
    const result = provider.getCapability("non-existent-capability");
    expect(result).toBeNull();
  });

  it("should return the injected context service", () => {
    const result = provider.getContextService();
    expect(result).toBe(contextService);
  });

  it("should implement IDataProvider interface", () => {
    expect(provider).toHaveProperty("name");
    expect(provider).toHaveProperty("description");
    expect(provider).toHaveProperty("capabilities");
    expect(provider).toHaveProperty("initialize");
    expect(provider).toHaveProperty("testConnection");
    expect(provider).toHaveProperty("getCapability");
  });
});
