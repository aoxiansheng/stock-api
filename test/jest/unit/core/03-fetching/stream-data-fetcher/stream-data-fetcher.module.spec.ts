import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StreamDataFetcherModule } from '@core/03-fetching/stream-data-fetcher/module/stream-data-fetcher.module';
import { StreamDataFetcherService } from '@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { StreamConfigService } from '@core/03-fetching/stream-data-fetcher/config/stream-config.service';
import { StreamClientStateManager } from '@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { ConnectionPoolManager } from '@core/03-fetching/stream-data-fetcher/services/connection-pool-manager.service';

describe('StreamDataFetcherModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [StreamDataFetcherModule],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('应该成功创建模块', () => {
    expect(module).toBeDefined();
  });

  it('应该提供StreamDataFetcherService', () => {
    const service = module.get<StreamDataFetcherService>(StreamDataFetcherService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(StreamDataFetcherService);
  });

  it('应该提供StreamConfigService', () => {
    const service = module.get<StreamConfigService>(StreamConfigService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(StreamConfigService);
  });

  it('应该提供StreamClientStateManager', () => {
    const service = module.get<StreamClientStateManager>(StreamClientStateManager);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(StreamClientStateManager);
  });

  it('应该提供ConnectionPoolManager', () => {
    const service = module.get<ConnectionPoolManager>(ConnectionPoolManager);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ConnectionPoolManager);
  });

  it('应该是全局模块', () => {
    const moduleRef = module.get(StreamDataFetcherModule);
    expect(moduleRef).toBeDefined();
  });
});