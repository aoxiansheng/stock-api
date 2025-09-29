import { Module } from '@nestjs/common';
import { TestInfrastructureModule } from './test-infrastructure.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WebSocketRateLimitGuard } from '@core/03-fetching/stream-data-fetcher/guards/websocket-rate-limit.guard';
import { createLogger } from '@common/logging/index';

/**
 * 提供WebSocket测试所需的模拟依赖
 * 特别为WebSocketRateLimitGuard提供所需环境
 */
@Module({
  imports: [TestInfrastructureModule],
  providers: [
    {
      provide: EventEmitter2,
      useFactory: () => ({
        emit: jest.fn(),
        on: jest.fn(),
        _clearEvents: jest.fn()
      })
    },
    {
      provide: 'LOGGER',
      useFactory: () => {
        return {
          log: jest.fn(),
          debug: jest.fn(),
          warn: jest.fn(),
          error: jest.fn()
        };
      }
    },
    {
      // 覆盖createLogger工厂函数，返回可控的logger
      provide: createLogger,
      useFactory: () => () => ({
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        verbose: jest.fn()
      })
    },
    WebSocketRateLimitGuard
  ],
  exports: [EventEmitter2, WebSocketRateLimitGuard, createLogger]
})
export class TestWebSocketModule {} 