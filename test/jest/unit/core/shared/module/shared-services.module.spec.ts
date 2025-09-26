import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SharedServicesModule } from '@core/shared/module/shared-services.module';
import { MarketStatusService } from '@core/shared/services/market-status.service';
import { BaseFetcherService } from '@core/shared/services/base-fetcher.service';
import { FieldMappingService } from '@core/shared/services/field-mapping.service';
import { DataChangeDetectorService } from '@core/shared/services/data-change-detector.service';

describe('SharedServicesModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [SharedServicesModule],
      providers: [
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide MarketStatusService', () => {
    const service = module.get<MarketStatusService>(MarketStatusService);
    expect(service).toBeInstanceOf(MarketStatusService);
  });

  it('should provide BaseFetcherService', () => {
    const service = module.get<BaseFetcherService>(BaseFetcherService);
    expect(service).toBeInstanceOf(BaseFetcherService);
  });

  it('should provide FieldMappingService', () => {
    const service = module.get<FieldMappingService>(FieldMappingService);
    expect(service).toBeInstanceOf(FieldMappingService);
  });

  it('should provide DataChangeDetectorService', () => {
    const service = module.get<DataChangeDetectorService>(DataChangeDetectorService);
    expect(service).toBeInstanceOf(DataChangeDetectorService);
  });

  describe('Module configuration', () => {
    it('should be a valid NestJS module', () => {
      expect(module).toBeDefined();
    });

    it('should export all services', async () => {
      const marketStatusService = module.get<MarketStatusService>(MarketStatusService);
      const baseFetcherService = module.get<BaseFetcherService>(BaseFetcherService);
      const fieldMappingService = module.get<FieldMappingService>(FieldMappingService);
      const dataChangeDetectorService = module.get<DataChangeDetectorService>(DataChangeDetectorService);

      expect(marketStatusService).toBeDefined();
      expect(baseFetcherService).toBeDefined();
      expect(fieldMappingService).toBeDefined();
      expect(dataChangeDetectorService).toBeDefined();
    });
  });
});
