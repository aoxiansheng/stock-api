import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverController } from '../../../../../src/core/receiver/receiver.controller';
import { ReceiverService } from '../../../../../src/core/receiver/receiver.service';
import { DataRequestDto } from '../../../../../src/core/receiver/dto/data-request.dto';
import { DataResponseDto, ResponseMetadataDto } from '../../../../../src/core/receiver/dto/data-response.dto';
import { JwtAuthGuard } from '../../../../../src/auth/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../../../../../src/auth/guards/apikey-auth.guard';
import { UnifiedPermissionsGuard } from '../../../../../src/auth/guards/unified-permissions.guard';
import { RateLimitGuard } from '../../../../../src/auth/guards/rate-limit.guard';
import { CanActivate } from '@nestjs/common';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => mockLogger),
  sanitizeLogData: jest.fn(data => data),
}));

describe('ReceiverController', () => {
  let controller: ReceiverController;
  let receiverService: ReceiverService;

  const mockReceiverService = {
    handleRequest: jest.fn(),
  };

  beforeEach(async () => {
    const mockGuard: CanActivate = { canActivate: jest.fn(() => true) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiverController],
      providers: [
        {
          provide: ReceiverService,
          useValue: mockReceiverService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ApiKeyAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(UnifiedPermissionsGuard)
      .useValue(mockGuard)
      .overrideGuard(RateLimitGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ReceiverController>(ReceiverController);
    receiverService = module.get<ReceiverService>(ReceiverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDataRequest', () => {
    const mockDataRequest: DataRequestDto = {
      symbols: ['700.HK', 'AAPL.US'],
      dataType: 'stock-quote',
      options: {},
    };

    it('should process data request successfully and log correct info', async () => {
      const mockMetadata = new ResponseMetadataDto('longport', 'stock-quote', 'req-123', 150, false, 2, 2);
      const mockResponse = new DataResponseDto(
        {
          '700.HK': { lastPrice: 300, volume: 1000000 },
          'AAPL.US': { lastPrice: 150, volume: 500000 },
        },
        mockMetadata,
      );

      mockReceiverService.handleRequest.mockResolvedValue(mockResponse);

      const result = await controller.handleDataRequest(mockDataRequest);

      expect(result).toEqual(mockResponse);
      expect(mockReceiverService.handleRequest).toHaveBeenCalledWith(mockDataRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        '接收数据请求',
        expect.objectContaining({
          symbols: mockDataRequest.symbols,
          dataType: mockDataRequest.dataType,
        }),
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        '数据请求处理完成',
        expect.objectContaining({
          requestId: 'req-123',
          success: true,
          provider: 'longport',
          processingTime: 150,
          hasPartialFailures: false,
        }),
      );
    });

    it('should handle service errors gracefully and log the error', async () => {
      const error = new Error('Provider unavailable');
      mockReceiverService.handleRequest.mockRejectedValue(error);

      await expect(controller.handleDataRequest(mockDataRequest)).rejects.toThrow('Provider unavailable');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '数据请求处理失败',
        expect.objectContaining({
          error: error.message,
          symbols: mockDataRequest.symbols,
        }),
      );
    });

    it('should handle partial success scenarios and log the details', async () => {
        const mockMetadata = new ResponseMetadataDto('longport', 'stock-quote', 'req-partial-456', 200, true, 2, 1);
        const partialResponse = new DataResponseDto(
          {
            'AAPL.US': { price: 150 },
          },
          mockMetadata,
        );

        mockReceiverService.handleRequest.mockResolvedValue(partialResponse);

        const result = await controller.handleDataRequest(mockDataRequest);

        expect(result).toEqual(partialResponse);
        expect(result.metadata.hasPartialFailures).toBe(true);

        expect(mockLogger.log).toHaveBeenCalledWith(
          '数据请求处理完成',
          expect.objectContaining({
            requestId: 'req-partial-456',
            success: false, // isFullySuccessful should be false
            hasPartialFailures: true,
            successfullyProcessed: 1,
            totalRequested: 2,
          }),
        );
      });
  });
});