import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { REFERENCE_DATA } from "@common/constants/domain";

import { ICapability } from "../interfaces/capability.interface";
import { IDataProvider } from "../interfaces/provider.interface";

import { getStockQuote } from "./capabilities/get-stock-quote";
import { getStockHistory } from "./capabilities/get-stock-history";
import { getStockBasicInfo } from "./capabilities/get-stock-basic-info";
import { getMarketStatus } from "./capabilities/get-market-status";
import { getTradingDays } from "./capabilities/get-trading-days";
import { getSupportList } from "./capabilities/get-support-list";
import { streamStockQuote } from "./capabilities/stream-stock-quote";
import { InfowayContextService } from "./services/infoway-context.service";
import { InfowayStreamContextService } from "./services/infoway-stream-context.service";

@Injectable()
export class InfowayProvider implements IDataProvider {
  private readonly logger = createLogger(InfowayProvider.name);

  readonly name = REFERENCE_DATA.PROVIDER_IDS.INFOWAY;
  readonly description = "Infoway 行情提供商（REST + WebSocket）";
  readonly capabilities: ICapability[] = [
    getStockQuote,
    getStockHistory,
    getStockBasicInfo,
    getMarketStatus,
    getTradingDays,
    getSupportList,
    streamStockQuote,
  ];

  constructor(
    private readonly contextService: InfowayContextService,
    private readonly streamContextService: InfowayStreamContextService,
  ) {}

  async initialize(): Promise<void> {
    this.logger.log("初始化 Infoway Provider（延迟初始化 WebSocket）");
  }

  async testConnection(): Promise<boolean> {
    return await this.contextService.testConnection();
  }

  getCapability(name: string): ICapability | null {
    return this.capabilities.find((cap) => cap.name === name) || null;
  }

  getContextService(): InfowayContextService {
    return this.contextService;
  }

  getStreamContextService(): InfowayStreamContextService {
    return this.streamContextService;
  }
}
