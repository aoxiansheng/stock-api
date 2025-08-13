/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { LongportSgContextService } from '../../../../../../src/providers/longport-sg/services/longport-sg-context.service';
import { Config, QuoteContext } from 'longport';
import { InternalServerErrorException } from '@nestjs/common';

// 模拟 longport 库
jest.mock('longport', () => ({
  Config: {
    fromEnv: jest.fn(() => ({})), // 模拟 fromEnv 方法
  },
  QuoteContext: {
    new: jest.fn(() => ({
      quote: jest.fn(),
      close: jest.fn(),
    })), // 模拟 new 方法
  },
}));

describe('LongportSgContextService', () => {
  let service: LongportSgContextService;
  let mockQuoteContext: any;

  // 在每个测试用例之前，创建一个新的测试模块
  beforeEach(async () => {
    // 重置 mock
    (Config.fromEnv as jest.Mock).mockClear();
    (QuoteContext.new as jest.Mock).mockClear();

    mockQuoteContext = {
      quote: jest.fn(),
      close: jest.fn(),
    };
    (QuoteContext.new as jest.Mock).mockResolvedValue(mockQuoteContext);

    const module: TestingModule = await Test.createTestingModule({
      providers: [LongportSgContextService],
    }).compile();

    service = module.get<LongportSgContextService>(LongportSgContextService);
  });

  // 测试 onModuleInit 方法
  it('should call initialize on module init', async () => {
    // 模拟 initialize 方法
    const initializeSpy = jest.spyOn(service as any, 'initialize');
    await service.onModuleInit();
    // 断言 initialize 方法被调用
    expect(initializeSpy).toHaveBeenCalled();
  });

  // 测试 onModuleDestroy 方法
  it('should call close on module destroy', async () => {
    // 模拟 close 方法
    const closeSpy = jest.spyOn(service, 'close');
    await service.onModuleDestroy();
    // 断言 close 方法被调用
    expect(closeSpy).toHaveBeenCalled();
  });

  // 测试 getQuoteContext 方法
  it('should return QuoteContext after initialization', async () => {
    // 调用 getQuoteContext 方法
    const context = await service.getQuoteContext();
    // 断言返回的 context 是否正确
    expect(context).toBe(mockQuoteContext);
    // 断言 QuoteContext.new 方法被调用
    expect(QuoteContext.new).toHaveBeenCalled();
  });

  // 测试当初始化失败时 getQuoteContext 抛出错误
  it('should throw InternalServerErrorException if QuoteContext initialization fails', async () => {
    // 模拟 QuoteContext.new 抛出错误
    (QuoteContext.new as jest.Mock).mockRejectedValue(new Error('Init failed'));
    // 调用 getQuoteContext 方法，期望捕获到错误
    await expect(service.getQuoteContext()).rejects.toThrow(InternalServerErrorException);
  });

  // 测试 close 方法
  it('should close the QuoteContext connection', async () => {
    // 先初始化
    await service.getQuoteContext();
    // 调用 close 方法
    await service.close();
    // 断言 mockQuoteContext.close 方法被调用
    expect(mockQuoteContext.close).toHaveBeenCalled();
  });

  // 测试 testConnection 方法
  it('should return true for a successful connection test', async () => {
    // 模拟 quote 方法成功
    mockQuoteContext.quote.mockResolvedValue([]);
    // 调用 testConnection 方法
    const result = await service.testConnection();
    // 断言返回结果为 true
    expect(result).toBe(true);
    // 断言 quote 方法被调用
    expect(mockQuoteContext.quote).toHaveBeenCalledWith(['HEALTHCHECK.TEST']);
  });

  // 测试 testConnection 方法当连接失败时
  it('should return false for a failed connection test', async () => {
    // 模拟 quote 方法抛出错误
    mockQuoteContext.quote.mockRejectedValue(new Error('Connection error'));
    // 调用 testConnection 方法
    const result = await service.testConnection();
    // 断言返回结果为 false
    expect(result).toBe(false);
  });

  // 测试 testConnection 方法当返回 101004 错误时
  it('should return true if connection test returns 101004 error', async () => {
    // 模拟 quote 方法抛出包含 101004 的错误
    mockQuoteContext.quote.mockRejectedValue(new Error('Error 101004: Symbol not found'));
    // 调用 testConnection 方法
    const result = await service.testConnection();
    // 断言返回结果为 true
    expect(result).toBe(true);
  });
});