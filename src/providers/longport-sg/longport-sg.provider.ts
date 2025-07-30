import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { createLogger } from "@common/config/logger.config";

import { ICapability } from "../interfaces/capability.interface";
import { IDataProvider } from "../interfaces/provider.interface";

import { getIndexQuote } from "./capabilities/get-index-quote";
import { getStockBasicInfo } from "./capabilities/get-stock-basic-info";
import { getStockQuote } from "./capabilities/get-stock-quote";
import { LongportSgContextService } from "./services/longport-sg-context.service";

@Injectable()
export class LongportSgProvider implements IDataProvider {
  private readonly logger = createLogger(LongportSgProvider.name);

  readonly name = "longport-sg";
  readonly description = "LongPort SG 长桥证券新加坡数据提供商";
  readonly capabilities: ICapability[] = [
    getStockQuote,
    getStockBasicInfo,
    getIndexQuote,
  ];

  constructor(
    private configService: ConfigService,
    private contextService: LongportSgContextService,
  ) {}

  async initialize(): Promise<void> {
    this.logger.log("初始化 LongPort SG 提供商...");
    // 上下文服务会在模块初始化时自动初始化
    this.logger.log("LongPort SG 提供商初始化完成");
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
}
