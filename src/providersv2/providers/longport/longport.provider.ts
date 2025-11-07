import { ConfigService } from "@nestjs/config";

import { createLogger } from "@common/logging/index";

import { ICapability } from "./../../providers/interfaces/capability.interface";
import { IDataProvider } from "./../../providers/interfaces/provider.interface";

import { getIndexQuote } from "./capabilities/get-index-quote";
import { getStockBasicInfo } from "./capabilities/get-stock-basic-info";
import { getStockQuote } from "./capabilities/get-stock-quote";
import { LongportContextService } from "./services/longport-context.service";
import { LongportStreamContextService } from "./services/longport-stream-context.service";
import { REFERENCE_DATA } from "@common/constants/domain";

export class LongportProvider implements IDataProvider {
  private readonly logger = createLogger(LongportProvider.name);

  readonly name = REFERENCE_DATA.PROVIDER_IDS.LONGPORT;
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
    // 工厂提供者已确保注入的是单例实例，无需额外检查
    this.logger.log("LongportProvider 构造函数完成，使用工厂提供者保证的单例");
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
