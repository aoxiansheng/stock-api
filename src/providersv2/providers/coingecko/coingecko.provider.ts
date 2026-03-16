import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { REFERENCE_DATA } from "@common/constants/domain";
import { ICapability } from "../interfaces/capability.interface";
import { IDataProvider } from "../interfaces/provider.interface";
import { getCryptoBasicInfo } from "./capabilities/get-crypto-basic-info";
import { CoinGeckoContextService } from "./services/coingecko-context.service";

@Injectable()
export class CoinGeckoProvider implements IDataProvider {
  private readonly logger = createLogger(CoinGeckoProvider.name);

  readonly name = REFERENCE_DATA.PROVIDER_IDS.COINGECKO;
  readonly description = "CoinGecko 加密货币基础信息提供商";
  readonly capabilities: ICapability[] = [getCryptoBasicInfo];

  constructor(private readonly contextService: CoinGeckoContextService) {}

  async initialize(): Promise<void> {
    this.logger.log("初始化 CoinGecko Provider");
  }

  async testConnection(): Promise<boolean> {
    return await this.contextService.testConnection();
  }

  getCapability(name: string): ICapability | null {
    return this.capabilities.find((capability) => capability.name === name) || null;
  }

  getContextService(): CoinGeckoContextService {
    return this.contextService;
  }
}
