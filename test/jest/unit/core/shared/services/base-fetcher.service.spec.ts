import { Test, TestingModule } from '@nestjs/testing';
import { BaseFetcherService } from '@core/shared/services/base-fetcher.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Test implementation of abstract class
class TestBaseFetcherService extends BaseFetcherService {
  async executeCore(params: any): Promise<any> {
    return { test: 'data' };
  }
}

describe('BaseFetcherService', () => {
  let service: TestBaseFetcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestBaseFetcherService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TestBaseFetcherService>(TestBaseFetcherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Service behavior', () => {
    it('should be a valid NestJS service', () => {
      expect(typeof service).toBe('object');
    });

    it('should handle initialization', () => {
      expect(service).toBeInstanceOf(TestBaseFetcherService);
    });
  });
});
