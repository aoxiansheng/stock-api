import { ConfigService } from "@nestjs/config";

import { createLogger } from "@common/config/logger.config";

import { ICapability } from "../interfaces/capability.interface";
import { IDataProvider } from "../interfaces/provider.interface";
import { Provider } from "../decorators/provider.decorator";

import { getIndexQuote } from "./capabilities/get-index-quote";
import { getStockBasicInfo } from "./capabilities/get-stock-basic-info";
import { getStockQuote } from "./capabilities/get-stock-quote";
import { LongportContextService } from "./services/longport-context.service";
import { LongportStreamContextService } from "./services/longport-stream-context.service";

@Provider({
  name: "longport",
  description: "LongPort 长桥证券数据提供商",
  autoRegister: true,
  healthCheck: true,
  initPriority: 1
})
export class LongportProvider implements IDataProvider {
  private readonly logger = createLogger(LongportProvider.name);

  readonly name = "longport";
  readonly description = "LongPort 长桥证券数据提供商";
  readonly capabilities: ICapability[] = [
    getStockQuote,
    getStockBasicInfo,
    getIndexQuote,
  ];

  constructor(
    private configService: ConfigService,
    private contextService: LongportContextService,
    private streamContextService: LongportStreamContextService,
  ) {
    // 确保使用单例模式的streamContextService
    this.ensureStreamContextSingleton();
  }

  /**
   * 确保使用单例模式的StreamContextService
   * 遵循NestJS最佳实践的依赖注入
   */
  private async ensureStreamContextSingleton(): Promise<void> {
    try {
      // 使用工厂方法获取单例实例
      const singletonInstance = await LongportStreamContextService.getInstance(this.configService);
      
      // 如果注入的实例不是单例，替换为单例实例
      if (this.streamContextService !== singletonInstance) {
        this.logger.warn('检测到非单例StreamContextService实例，替换为单例实例');
        (this as any).streamContextService = singletonInstance;
      }
      
      this.logger.log('StreamContextService单例模式验证完成');
    } catch (error) {
      this.logger.error('StreamContextService单例模式设置失败', error.message);
    }
  }

  async initialize(): Promise<void> {
    this.logger.log("初始化 LongPort 提供商...");
    // 上下文服务会在模块初始化时自动初始化
    this.logger.log("LongPort 提供商初始化完成");
  }

  async testConnection(): Promise<boolean> {
    return await this.contextService.testConnection();
  }

  getCapability(name: string): ICapability | null {
    return this.capabilities.find((cap) => cap.name === name) || null;
  }

  getContextService(): LongportContextService {
    return this.contextService;
  }

  getStreamContextService(): LongportStreamContextService {
    return this.streamContextService;
  }
}
