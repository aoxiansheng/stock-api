import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/logging/index";
import { REFERENCE_DATA } from "@common/constants/domain";

import { ICapability } from "./../interfaces/capability.interface";
import { IDataProvider } from "./../interfaces/provider.interface";

import { streamStockQuote } from "./capabilities/stream-stock-quote";
import { JvQuantStreamContextService } from "./services/jvquant-stream-context.service";

@Injectable()
export class JvQuantProvider implements IDataProvider {
  private readonly logger = createLogger(JvQuantProvider.name);

  readonly name = REFERENCE_DATA.PROVIDER_IDS.JVQUANT;
  readonly description = "JvQuant WebSocket 行情提供商";
  readonly capabilities: ICapability[] = [streamStockQuote];

  constructor(
    private readonly streamContextService: JvQuantStreamContextService,
  ) {}

  async initialize(): Promise<void> {
    this.logger.log("初始化 JvQuant Provider");
    await this.streamContextService.initializeWebSocket();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.streamContextService.initializeWebSocket();
      return true;
    } catch {
      return false;
    }
  }

  getCapability(name: string): ICapability | null {
    return this.capabilities.find((cap) => cap.name === name) || null;
  }

  getStreamContextService(): JvQuantStreamContextService {
    return this.streamContextService;
  }
}
