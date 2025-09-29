import { UnitTestSetup } from './unit-test-setup';
import { TestingModule, Test } from '@nestjs/testing';
import { TestWebSocketModule } from '../modules/test-websocket.module';
import { WebSocketRateLimitGuard } from '@core/03-fetching/stream-data-fetcher/guards/websocket-rate-limit.guard';
import { socketMockFactory } from '../mocks/socket.mock';

/**
 * WebSocket测试专用设置类
 * 提供创建WebSocket测试环境的便捷方法
 */
export class WebSocketTestSetup extends UnitTestSetup {
  /**
   * 创建WebSocket测试模块
   */
  static async createWebSocketTestModule(config: {
    imports?: any[];
    providers?: any[];
  } = {}): Promise<TestingModule> {
    const moduleBuilder = Test.createTestingModule({
      imports: [TestWebSocketModule, ...(config.imports || [])],
      providers: [...(config.providers || [])]
    });
    
    return moduleBuilder.compile();
  }
  
  /**
   * 创建WebSocket测试上下文
   */
  static async createWebSocketTestContext(): Promise<any> {
    return this.createTestContext(async () => {
      return await this.createWebSocketTestModule();
    });
  }
  
  /**
   * 获取WebSocketRateLimitGuard实例及其上下文
   * 
   * @param module 测试模块
   * @returns {guard, createSocket} 返回guard实例和创建Socket的便捷方法
   */
  static getGuardTestContext(module: TestingModule): {
    guard: WebSocketRateLimitGuard;
    createSocket: (options?: any) => any;
  } {
    const guard = module.get<WebSocketRateLimitGuard>(WebSocketRateLimitGuard);
    
    // 返回测试上下文
    return {
      guard,
      createSocket: (options = {}) => socketMockFactory(options)
    };
  }
} 