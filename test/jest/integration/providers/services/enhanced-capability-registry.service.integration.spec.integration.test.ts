
import { Test, TestingModule } from '@nestjs/testing';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EnhancedCapabilityRegistryService } from '../../../../../src/providers/services/enhanced-capability-registry.service';
import { SmartPathResolver } from '../../../../../src/providers/utils/smart-path-resolver';
import {
  Provider,
  Capability,
  StreamCapability,
  CapabilityCollector,
} from '../../../../../src/providers/decorators';
import { ICapability } from '../../../../../src/providers/interfaces/capability.interface';
import { IStreamCapability } from '../../../../../src/providers/interfaces/stream-capability.interface';
import { Module } from '@nestjs/common';

// --- Mock Implementations ---

const MOCK_PROVIDERS_DIR = path.join(__dirname, 'test-providers');

// Mock Provider: mock-provider-one
const MOCK_PROVIDER_ONE_PATH = path.join(MOCK_PROVIDERS_DIR, 'mock-provider-one');
const MOCK_PROVIDER_ONE_CAPS_PATH = path.join(MOCK_PROVIDER_ONE_PATH, 'capabilities');

// Mock Capability 1: get-stock-quote
@Capability({ name: 'get-stock-quote', description: 'Get stock quote' })
class MockGetStockQuoteCapability implements ICapability {
  name = 'get-stock-quote';
  description = 'Get stock quote';
  supportedMarkets = ['US'];
  supportedSymbolFormats = ['SYMBOL'];
  execute = async () => ({ success: true, data: {} });
}

// Mock Stream Capability: stream-live-trades
@StreamCapability({ name: 'stream-live-trades' })
class MockStreamLiveTradesCapability implements IStreamCapability {
  name = 'stream-live-trades';
  description = 'Stream live trades';
  supportedMarkets = ['US'];
  supportedSymbolFormats = ['SYMBOL'];
  initialize = async () => {};
  subscribe = async () => {};
  unsubscribe = async () => {};
  onMessage = () => {};
  cleanup = async () => {};
  isConnected = () => true;
}

// Mock Provider 1
@Provider({ name: 'mock-provider-one', description: 'Mock Provider One' })
class MockProviderOne {}


// --- Test Suite ---

describe('EnhancedCapabilityRegistryService Integration Test', () => {
  let service: EnhancedCapabilityRegistryService;
  let module: TestingModule;

  beforeAll(async () => {
    // 1. Create mock directory structure and files
    await fs.mkdir(MOCK_PROVIDER_ONE_CAPS_PATH, { recursive: true });

    // Write mock files
    await fs.writeFile(
      path.join(MOCK_PROVIDER_ONE_PATH, 'index.ts'),
      `
        import { Provider } from '../../../../../../src/providers/decorators';
        @Provider({ name: 'mock-provider-one' })
        export class MockProviderOne {}
        export default MockProviderOne;
      `,
    );
    await fs.writeFile(
      path.join(MOCK_PROVIDER_ONE_CAPS_PATH, 'get-stock-quote.ts'),
      `
        import { Capability } from '../../../../../../src/providers/decorators';
        import { ICapability } from '../../../../../../src/providers/interfaces/capability.interface';
        @Capability({ name: 'get-stock-quote', provider: 'mock-provider-one' })
        export class GetStockQuoteCapability implements ICapability {
          name = 'get-stock-quote';
          supportedMarkets = ['US'];
          supportedSymbolFormats = ['SYMBOL'];
          execute = async () => ({ success: true, data: {} });
        }
        export default GetStockQuoteCapability;
      `,
    );
    await fs.writeFile(
      path.join(MOCK_PROVIDER_ONE_CAPS_PATH, 'stream-live-trades.ts'),
      `
        import { StreamCapability } from '../../../../../../src/providers/decorators';
        import { IStreamCapability } from '../../../../../../src/providers/interfaces/stream-capability.interface';
        @StreamCapability({ name: 'stream-live-trades', provider: 'mock-provider-one' })
        export class StreamLiveTradesCapability implements IStreamCapability {
          name = 'stream-live-trades';
          supportedMarkets = ['US'];
          supportedSymbolFormats = ['SYMBOL'];
          initialize = async () => {};
          subscribe = async () => {};
          unsubscribe = async () => {};
          onMessage = () => {};
          cleanup = async () => {};
          isConnected = () => true;
        }
        export default StreamLiveTradesCapability;
      `,
    );
    
    // 2. Point SmartPathResolver to the mock directory
    jest.spyOn(SmartPathResolver, 'getProvidersPath').mockReturnValue(MOCK_PROVIDERS_DIR);
    
    // 3. Dynamically import the modules to trigger decorators
    await import(path.join(MOCK_PROVIDER_ONE_PATH, 'index.ts'));
    await import(path.join(MOCK_PROVIDER_ONE_CAPS_PATH, 'get-stock-quote.ts'));
    await import(path.join(MOCK_PROVIDER_ONE_CAPS_PATH, 'stream-live-trades.ts'));
  });

  afterAll(async () => {
    // Cleanup
    await fs.rm(MOCK_PROVIDERS_DIR, { recursive: true, force: true });
    jest.restoreAllMocks();
    CapabilityCollector.clear();
  });
  
  beforeEach(async () => {
    CapabilityCollector.clear();
    
    // Re-import to populate collector before each test
    await import(path.join(MOCK_PROVIDER_ONE_PATH, 'index.ts'));
    await import(path.join(MOCK_PROVIDER_ONE_CAPS_PATH, 'get-stock-quote.ts'));
    await import(path.join(MOCK_PROVIDER_ONE_CAPS_PATH, 'stream-live-trades.ts'));

    module = await Test.createTestingModule({
      providers: [EnhancedCapabilityRegistryService],
    }).compile();

    service = module.get<EnhancedCapabilityRegistryService>(EnhancedCapabilityRegistryService);
    
    // Manually trigger initialization
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should discover and register providers and capabilities from decorators', () => {
    const allCaps = service.getAllCapabilities();
    const stats = service.getStats();

    // Check provider registration
    expect(allCaps.has('mock-provider-one')).toBe(true);
    
    // Check capabilities registration
    const providerCaps = allCaps.get('mock-provider-one');
    expect(providerCaps).toBeDefined();
    expect(providerCaps.has('get-stock-quote')).toBe(true);
    expect(providerCaps.has('stream-live-trades')).toBe(true);

    // Check stats
    expect(stats.totalProviders).toBe(1);
    expect(stats.totalCapabilities).toBe(2);
    expect(stats.decoratorCapabilities).toBe(2);
    expect(stats.streamCapabilities).toBe(1);
    expect(stats.restCapabilities).toBe(1);
  });
  
  it('should return correct stats', () => {
    const stats = service.getStats();
    expect(stats).toBeDefined();
    expect(stats.totalProviders).toBe(1);
    expect(stats.totalCapabilities).toBe(2);
    expect(stats.decoratorCapabilities).toBe(2);
  });

  it('getBestProvider should work correctly for decorator-registered capabilities', () => {
    const bestProvider = service.getBestProvider('get-stock-quote', 'US');
    expect(bestProvider).toBe('mock-provider-one');
  });

  it('should handle stream and non-stream capabilities correctly', () => {
    const allCaps = service.getAllCapabilities();
    const streamCaps = (service as any).streamCapabilities;

    const providerCaps = allCaps.get('mock-provider-one');
    expect(providerCaps.get('get-stock-quote')).toBeDefined();
    expect(providerCaps.get('stream-live-trades')).toBeDefined();

    const providerStreamCaps = streamCaps.get('mock-provider-one');
    expect(providerStreamCaps).toBeDefined();
    expect(providerStreamCaps.has('stream-live-trades')).toBe(true);
    expect(providerStreamCaps.has('get-stock-quote')).toBe(false);
  });
});
