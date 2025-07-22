import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { Config, QuoteContext } from 'longport';

import { LongportContextService } from '../../../../../src/providers/longport/longport-context.service';

// Mock longport SDK
jest.mock('longport', () => ({
  Config: {
    fromEnv: jest.fn(),
  },
  QuoteContext: {
    new: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('LongportContextService', () => {
  let service: LongportContextService;
  let mockQuoteContext: any;
  let mockConfig: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock QuoteContext
    mockQuoteContext = {
      quote: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    };

    // Setup mock Config
    mockConfig = {};

    // Mock implementations
    (Config.fromEnv as jest.Mock).mockReturnValue(mockConfig);
    (QuoteContext.new as jest.Mock).mockResolvedValue(mockQuoteContext);

    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportContextService],
    }).compile();

    service = module.get<LongportContextService>(LongportContextService);
  });

  describe('Service Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should initialize successfully without blocking', async () => {
      const initSpy = jest.spyOn(service as any, 'initialize').mockResolvedValue(undefined);
      
      await service.onModuleInit();
      
      expect(initSpy).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      const error = new Error('Initialization failed');
      jest.spyOn(service as any, 'initialize').mockRejectedValue(error);
      
      // Should not throw error, only log warning
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close connection on module destroy', async () => {
      const closeSpy = jest.spyOn(service, 'close').mockResolvedValue(undefined);
      
      await service.onModuleDestroy();
      
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('initialize (private method)', () => {
    it('should initialize QuoteContext successfully', async () => {
      const context = await service.getQuoteContext();
      
      expect(Config.fromEnv).toHaveBeenCalled();
      expect(QuoteContext.new).toHaveBeenCalledWith(mockConfig);
      expect(context).toBe(mockQuoteContext);
    });

    it('should return existing context if already initialized', async () => {
      // First initialization
      await service.getQuoteContext();
      
      // Clear mock call counts
      jest.clearAllMocks();
      
      // Second call should not reinitialize
      const context = await service.getQuoteContext();
      
      expect(Config.fromEnv).not.toHaveBeenCalled();
      expect(QuoteContext.new).not.toHaveBeenCalled();
      expect(context).toBe(mockQuoteContext);
    });

    it('should handle concurrent initialization properly', async () => {
      // Start two concurrent initialization calls
      const promise1 = service.getQuoteContext();
      const promise2 = service.getQuoteContext();
      
      const [context1, context2] = await Promise.all([promise1, promise2]);
      
      // Should only initialize once
      expect(QuoteContext.new).toHaveBeenCalledTimes(1);
      expect(context1).toBe(mockQuoteContext);
      expect(context2).toBe(mockQuoteContext);
    });

    it('should throw InternalServerErrorException on initialization failure', async () => {
      const error = new Error('SDK initialization failed');
      (QuoteContext.new as jest.Mock).mockRejectedValue(error);
      
      await expect(service.getQuoteContext()).rejects.toThrow(InternalServerErrorException);
      await expect(service.getQuoteContext()).rejects.toThrow('LongPort SDK 连接初始化失败');
    });

    it('should allow retry after failed initialization', async () => {
      // First call fails
      (QuoteContext.new as jest.Mock).mockRejectedValueOnce(new Error('First failure'));
      
      await expect(service.getQuoteContext()).rejects.toThrow();
      
      // Second call should retry and succeed
      (QuoteContext.new as jest.Mock).mockResolvedValueOnce(mockQuoteContext);
      
      const context = await service.getQuoteContext();
      expect(context).toBe(mockQuoteContext);
      expect(QuoteContext.new).toHaveBeenCalledTimes(2);
    });
  });

  describe('getQuoteContext', () => {
    it('should return initialized QuoteContext', async () => {
      const context = await service.getQuoteContext();
      
      expect(context).toBe(mockQuoteContext);
    });

    it('should throw error if context is null after initialization', async () => {
      // Mock successful initialization but null context
      (QuoteContext.new as jest.Mock).mockResolvedValue(null);
      
      await expect(service.getQuoteContext()).rejects.toThrow(InternalServerErrorException);
      await expect(service.getQuoteContext()).rejects.toThrow('LongPort QuoteContext 未初始化');
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      // Initialize context first
      await service.getQuoteContext();
    });

    it('should close using close method', async () => {
      await service.close();
      
      expect(mockQuoteContext.close).toHaveBeenCalled();
    });

    it('should use disconnect method if close is not available', async () => {
      delete mockQuoteContext.close;
      
      await service.close();
      
      expect(mockQuoteContext.disconnect).toHaveBeenCalled();
    });

    it('should use destroy method if close and disconnect are not available', async () => {
      delete mockQuoteContext.close;
      delete mockQuoteContext.disconnect;
      
      await service.close();
      
      expect(mockQuoteContext.destroy).toHaveBeenCalled();
    });

    it('should handle case where no close method is available', async () => {
      delete mockQuoteContext.close;
      delete mockQuoteContext.disconnect;
      delete mockQuoteContext.destroy;
      
      // Should not throw error
      await expect(service.close()).resolves.toBeUndefined();
    });

    it('should handle close errors gracefully', async () => {
      const error = new Error('Close failed');
      mockQuoteContext.close.mockRejectedValue(error);
      
      // Should not throw error, only log it
      await expect(service.close()).resolves.toBeUndefined();
    });

    it('should do nothing if context is not initialized', async () => {
      const uninitializedService = new LongportContextService();
      
      // Should not throw error
      await expect(uninitializedService.close()).resolves.toBeUndefined();
      expect(mockQuoteContext.close).not.toHaveBeenCalled();
    });

    it('should reset context and initialization promise after close', async () => {
      await service.close();
      
      // Next getQuoteContext call should reinitialize
      jest.clearAllMocks();
      await service.getQuoteContext();
      
      expect(QuoteContext.new).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    beforeEach(async () => {
      // Initialize context first
      await service.getQuoteContext();
    });

    it('should return true for successful connection test', async () => {
      mockQuoteContext.quote.mockResolvedValue({});
      
      const result = await service.testConnection();
      
      expect(result).toBe(true);
      expect(mockQuoteContext.quote).toHaveBeenCalledWith(['HEALTHCHECK.TEST']);
    });

    it('should return true for 101004 error (symbol not found)', async () => {
      const error = new Error('101004: Symbol not found');
      mockQuoteContext.quote.mockRejectedValue(error);
      
      const result = await service.testConnection();
      
      expect(result).toBe(true);
    });

    it('should return false for other connection errors', async () => {
      const error = new Error('Network timeout');
      mockQuoteContext.quote.mockRejectedValue(error);
      
      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });

    it('should return false if initialization fails', async () => {
      // Create a service that will fail initialization
      const failingService = new LongportContextService();
      (QuoteContext.new as jest.Mock).mockRejectedValue(new Error('Init failed'));
      
      const result = await failingService.testConnection();
      
      expect(result).toBe(false);
    });

    it('should handle errors without message property', async () => {
      const error = { code: 'NETWORK_ERROR' };
      mockQuoteContext.quote.mockRejectedValue(error);
      
      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle null error in initialization', async () => {
      (QuoteContext.new as jest.Mock).mockRejectedValue(null);
      
      await expect(service.getQuoteContext()).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle undefined error in testConnection', async () => {
      mockQuoteContext.quote.mockRejectedValue(undefined);
      
      const result = await service.testConnection();
      
      expect(result).toBe(false);
    });
  });
});