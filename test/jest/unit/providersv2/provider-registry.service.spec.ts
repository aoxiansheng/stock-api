import { Test, TestingModule } from '@nestjs/testing';
import { ProviderRegistryService } from '@providersv2/provider-registry.service';
import { LongportProvider } from '@providersv2/providers/longport/longport.provider';
import { LongportSgProvider } from '@providersv2/providers/longport-sg/longport-sg.provider';

describe('ProviderRegistryService (v2)', () => {
  let module: TestingModule;
  let registry: ProviderRegistryService;

  const mockCapability = (name: string, markets: string[] = []) => ({
    name,
    description: name,
    supportedMarkets: markets,
    supportedSymbolFormats: [],
    execute: jest.fn(),
  });

  const makeMockProvider = (name: string, caps: any[]) => ({
    name,
    description: `${name} provider`,
    capabilities: caps,
    initialize: jest.fn(),
    testConnection: jest.fn(),
    getCapability: (n: string) => caps.find(c => c.name === n) || null,
    getContextService: jest.fn(),
    getStreamContextService: jest.fn(),
  });

  beforeEach(async () => {
    const longport = makeMockProvider('longport', [
      mockCapability('get-stock-quote', ['HK', 'US']),
    ]);
    const longportsg = makeMockProvider('longportsg', [
      mockCapability('get-stock-quote', ['HK']),
    ]);

    module = await Test.createTestingModule({
      providers: [
        ProviderRegistryService,
        { provide: LongportProvider, useValue: longport },
        { provide: LongportSgProvider, useValue: longportsg },
      ],
    }).compile();

    registry = module.get(ProviderRegistryService);
    // 触发 onModuleInit 注册
    await registry.onModuleInit();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(registry).toBeDefined();
  });

  it('should select best provider by priority and market', () => {
    const best = registry.getBestProvider('get-stock-quote', 'HK');
    expect(best).toBe('longport'); // longport 优先级更高（1）
  });

  it('should return capability for given provider', () => {
    const cap = registry.getCapability('longport', 'get-stock-quote');
    expect(cap).toBeDefined();
    expect(cap?.name).toBe('get-stock-quote');
  });

  it('should expose provider instance for context access', () => {
    const provider = registry.getProvider('longport');
    expect(provider).toBeDefined();
    expect(typeof provider?.getContextService).toBe('function');
  });
});

