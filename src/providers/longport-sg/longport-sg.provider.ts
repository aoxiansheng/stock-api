import { ConfigService } from "@nestjs/config";

import { createLogger } from "@app/config/logger.config";

import { ICapability } from "../interfaces/capability.interface";
import { IDataProvider } from "../interfaces/provider.interface";
import { Provider } from "../decorators/provider.decorator";

import { getIndexQuote } from "./capabilities/get-index-quote";
import { getStockBasicInfo } from "./capabilities/get-stock-basic-info";
import { getStockQuote } from "./capabilities/get-stock-quote";
import { LongportSgContextService } from "./services/longport-context.service";
import { LongportSgStreamContextService } from "./services/longport-stream-context.service";

@Provider({
  name: "longportsg",
  description: "LongPort 长桥证券数据提供商 (SG)",
  autoRegister: true,
  healthCheck: true,
  initPriority: 1,
})
export class LongportSgProvider implements IDataProvider {
  private readonly logger = createLogger(LongportSgProvider.name);

  readonly name = "longportsg";
  readonly description = "LongPort 长桥证券数据提供商 (SG)";
  readonly capabilities: ICapability[] = [
    getStockQuote,
    getStockBasicInfo,
    getIndexQuote,
  ];

  constructor(
    private configService: ConfigService,
    private contextService: LongportSgContextService,
    private streamContextService: LongportSgStreamContextService,
  ) {
    // 工厂提供者已确保注入的是单例实例，无需额外检查
    this.logger.log("LongportSgProvider 构造函数完成，使用工厂提供者保证的单例");
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

  getContextService(): LongportSgContextService {
    return this.contextService;
  }

  getStreamContextService(): LongportSgStreamContextService {
    return this.streamContextService;
  }
}
