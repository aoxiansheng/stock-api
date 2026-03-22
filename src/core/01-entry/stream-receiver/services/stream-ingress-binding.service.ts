/**
 * StreamIngressBinding - 流数据入站绑定服务
 *
 * 从 StreamReceiverService 中分离出来的 ingress binding 逻辑，负责：
 * 1. 设置数据接收处理 (setupDataReceiving)
 * 2. 处理接收到的原始数据 (handleIncomingData)
 * 3. 从数据中提取符号 (extractSymbolsFromData)
 */

import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import { StreamConnection } from "../../../03-fetching/stream-data-fetcher/interfaces";
import { StreamBatchProcessorService } from "./stream-batch-processor.service";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import { resolveMarketTypeFromSymbols } from "@core/shared/utils/market-type.util";

@Injectable()
export class StreamIngressBindingService {
  private readonly logger = createLogger("StreamIngressBinding");
  private readonly boundConnections = new WeakSet<StreamConnection>();

  constructor(
    private readonly batchProcessor: StreamBatchProcessorService,
    private readonly marketInferenceService: MarketInferenceService,
  ) {}

  /**
   * 设置数据接收处理
   */
  setupDataReceiving(
    connection: StreamConnection,
    provider: string,
    capability: string,
  ): void {
    if (this.boundConnections.has(connection)) {
      return;
    }

    this.boundConnections.add(connection);

    // 设置数据接收回调
    connection.onData((rawData: unknown) => {
      this.handleIncomingData(rawData, provider, capability);
    });

    // 设置错误处理
    connection.onError((error: Error) => {
      this.logger.error("流连接错误", {
        connectionId: connection.id,
        provider,
        capability,
        error: error.message,
      });
    });

    // 设置状态变化处理
    connection.onStatusChange((status: string) => {
      this.logger.debug("流连接状态变化", {
        connectionId: connection.id,
        provider,
        capability,
        status,
      });
    });
  }

  /**
   * 处理接收到的数据
   */
  handleIncomingData(
    rawData: unknown,
    provider: string,
    capability: string,
  ): void {
    try {
      // 提取符号信息
      const symbols = this.extractSymbolsFromData(rawData);
      const marketContext = resolveMarketTypeFromSymbols(
        this.marketInferenceService,
        symbols,
      );

      // 推送到批量处理管道 - 使用专职批处理服务
      this.batchProcessor.addQuoteData({
        rawData,
        providerName: provider,
        wsCapabilityType: capability,
        timestamp: Date.now(),
        symbols,
        marketContext,
      });
    } catch (error) {
      this.logger.error("数据处理失败", {
        provider,
        capability,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 从数据中提取符号
   */
  extractSymbolsFromData(data: unknown): string[] {
    if (!data) {
      return [];
    }

    if (Array.isArray(data)) {
      return data
        .map((item) => this.extractDirectSymbol(item))
        .filter((symbol): symbol is string => Boolean(symbol));
    }

    const record = this.toRecord(data);
    if (!record) {
      return [];
    }

    const directSymbol = this.extractDirectSymbol(record);
    if (directSymbol) {
      return [directSymbol];
    }

    if (Array.isArray(record.symbols)) {
      return record.symbols.filter(
        (symbol): symbol is string =>
          typeof symbol === "string" && symbol.length > 0,
      );
    }

    const quote = record.quote as Record<string, unknown> | undefined;
    const quoteSymbol = this.extractDirectSymbol(quote);
    if (quoteSymbol) {
      return [quoteSymbol];
    }

    return [];
  }

  private toRecord(data: unknown): Record<string, unknown> | null {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }

    return data as Record<string, unknown>;
  }

  private extractDirectSymbol(data: unknown): string | null {
    const record = this.toRecord(data);
    if (!record) {
      return null;
    }

    if (typeof record.symbol === "string" && record.symbol.length > 0) {
      return record.symbol;
    }

    if (typeof record.s === "string" && record.s.length > 0) {
      return record.s;
    }

    return null;
  }
}
