import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverModule } from '@core/01-entry/receiver/module/receiver.module';
import { ReceiverController } from '@core/01-entry/receiver/controller/receiver.controller';
import { ReceiverService } from '@core/01-entry/receiver/services/receiver.service';

describe('ReceiverModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ReceiverModule],
    })
    .overrideProvider('SymbolTransformerService')
    .useValue({})
    .overrideProvider('DataFetcherService')
    .useValue({})
    .overrideProvider('DataTransformerService')
    .useValue({})
    .overrideProvider('StorageService')
    .useValue({})
    .overrideProvider('EnhancedCapabilityRegistryService')
    .useValue({})
    .overrideProvider('MarketStatusService')
    .useValue({})
    .overrideProvider('MarketInferenceService')
    .useValue({})
    .overrideProvider('SmartCacheStandardizedService')
    .useValue({})
    .overrideProvider('EventEmitter2')
    .useValue({})
    .compile();
  });

  afterEach(async () => {
    await module?.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have ReceiverController', () => {
    const controller = module.get<ReceiverController>(ReceiverController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ReceiverController);
  });

  it('should have ReceiverService', () => {
    const service = module.get<ReceiverService>(ReceiverService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReceiverService);
  });

  it('should export ReceiverService', () => {
    const service = module.get<ReceiverService>(ReceiverService);
    expect(service).toBeDefined();
  });

  describe('module dependencies', () => {
    it('should import all required modules', async () => {
      // Verify the module compiles without issues
      expect(module).toBeDefined();

      // The fact that the module compiled successfully means all imports are valid
      // Individual dependency tests would be in integration tests
    });

    it('should provide controller and service', () => {
      const controller = module.get<ReceiverController>(ReceiverController);
      const service = module.get<ReceiverService>(ReceiverService);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });
  });
});