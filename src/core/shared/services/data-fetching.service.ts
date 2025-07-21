/**
 * 统一数据获取服务
 * 🎯 解除Query对Receiver的循环依赖，提供统一的数据获取接口
 */

import { Injectable, NotFoundException } from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { MarketStatus } from "@common/constants/market-trading-hours.constants";
import { Market } from "@common/constants/market.constants";

import { CapabilityRegistryService } from "../../../providers/capability-registry.service";

import { DataChangeDetectorService } from "./data-change-detector.service";
import { MarketStatusService } from "./market-status.service";

/**
 * 数据获取请求
 */
export interface DataFetchRequest {
  symbol: string;
  dataType: string;
  market?: Market;
  provider?: string;

  // 缓存配置
  useCache?: boolean;
  maxAge?: number;

  // 获取模式
  mode: "REALTIME" | "ANALYTICAL";

  // 其他选项
  options?: Record<string, any>;
}

/**
 * 数据获取响应
 */
export interface DataFetchResponse {
  data: any;
  metadata: {
    source: "CACHE" | "PROVIDER";
    timestamp: Date;
    market: Market;
    marketStatus: MarketStatus;
    cacheTTL: number;
    provider?: string;
  };
}

/**
 * 统一数据获取服务
 * 提供Provider能力调用的统一接口，支持缓存和市场状态感知
 */
@Injectable()
export class DataFetchingService {
  private readonly logger = createLogger(DataFetchingService.name);

  constructor(
    private readonly capabilityRegistry: CapabilityRegistryService,
    private readonly marketStatusService: MarketStatusService,
    private readonly dataChangeDetector: DataChangeDetectorService,
  ) {}

  /**
   * 获取单个股票数据
   */
  async fetchSingleData(request: DataFetchRequest): Promise<DataFetchResponse> {
    try {
      const startTime = Date.now();

      // 1. 推断市场和获取市场状态
      const market =
        request.market || this.inferMarketFromSymbol(request.symbol);
      const marketStatus =
        await this.marketStatusService.getMarketStatus(market);

      // 2. 根据模式和市场状态确定缓存TTL
      const cacheTTL = this.calculateCacheTTL(request.mode);

      // 3. 获取数据提供商能力和contextService
      const capabilityInfo = await this.getProviderCapability(
        request.dataType,
        request.provider,
      );
      const capability = capabilityInfo;
      const providerName = capabilityInfo.providerName;

      // 4. 获取provider实例以获取contextService
      const provider = this.capabilityRegistry.getProvider(providerName);
      const contextService = provider?.getContextService
        ? provider.getContextService()
        : null;

      // 5. 执行数据获取
      const data = await capability.execute({
        symbols: [request.symbol],
        market,
        contextService, // 传递contextService
        ...request.options,
      });

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        "数据获取完成",
        sanitizeLogData({
          symbol: request.symbol,
          dataType: request.dataType,
          market,
          marketStatus: marketStatus.status,
          mode: request.mode,
          cacheTTL,
          processingTime,
        }),
      );

      return {
        data: Array.isArray(data) ? data[0] : data,
        metadata: {
          source: "PROVIDER",
          timestamp: new Date(),
          market,
          marketStatus: marketStatus.status,
          cacheTTL,
          provider: capability.providerName,
        },
      };
    } catch (error) {
      this.logger.error(
        "数据获取失败",
        sanitizeLogData({
          symbol: request.symbol,
          dataType: request.dataType,
          error: error.message,
        }),
      );
      throw new NotFoundException(
        `获取 ${request.symbol} 数据失败: ${error.message}`,
      );
    }
  }

  /**
   * 批量获取股票数据
   */
  async fetchBatchData(
    requests: DataFetchRequest[],
  ): Promise<DataFetchResponse[]> {
    try {
      // 并发处理多个请求
      const results = await Promise.allSettled(
        requests.map((request) => this.fetchSingleData(request)),
      );

      return results.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          this.logger.warn(
            "批量数据获取部分失败",
            sanitizeLogData({
              symbol: requests[index].symbol,
              error: result.reason.message,
            }),
          );

          // 返回错误占位符
          return {
            data: null,
            metadata: {
              source: "PROVIDER" as const,
              timestamp: new Date(),
              market: requests[index].market || Market.US,
              marketStatus: MarketStatus.CLOSED,
              cacheTTL: 60,
              error: result.reason.message,
            },
          };
        }
      });
    } catch (error) {
      this.logger.error("批量数据获取失败", { error: error.message });
      throw error;
    }
  }

  /**
   * 从股票代码推断市场
   */
  private inferMarketFromSymbol(symbol: string): Market {
    const upperSymbol = symbol.toUpperCase().trim();

    // 香港市场: .HK 后缀或5位数字
    if (upperSymbol.includes(".HK") || /^\d{5}$/.test(upperSymbol)) {
      return Market.HK;
    }

    // 美国市场: 1-5位字母
    if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
      return Market.US;
    }

    // 深圳市场: .SZ 后缀或 00/30 前缀
    if (
      upperSymbol.includes(".SZ") ||
      ["00", "30"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SZ;
    }

    // 上海市场: .SH 后缀或 60/68 前缀
    if (
      upperSymbol.includes(".SH") ||
      ["60", "68"].some((prefix) => upperSymbol.startsWith(prefix))
    ) {
      return Market.SH;
    }

    // 默认美股
    return Market.US;
  }

  /**
   * 计算缓存TTL
   */
  private calculateCacheTTL(mode: "REALTIME" | "ANALYTICAL"): number {
    return this.marketStatusService.getRecommendedCacheTTL(Market.US, mode);
  }

  /**
   * 获取数据提供商能力
   */
  private async getProviderCapability(
    dataType: string,
    preferredProvider?: string,
  ) {
    // 数据类型到能力的映射
    const capabilityMap: Record<string, string> = {
      "stock-quote": "get-stock-quote",
      "stock-basic-info": "get-stock-basic-info",
      "index-quote": "get-index-quote",
      "market-status": "get-market-status",
    };

    const capabilityName = capabilityMap[dataType];
    if (!capabilityName) {
      throw new NotFoundException(`不支持的数据类型: ${dataType}`);
    }

    // 如果指定了首选提供商，优先使用
    if (preferredProvider) {
      const capability = this.capabilityRegistry.getCapability(
        preferredProvider,
        capabilityName,
      );
      if (capability) {
        return {
          ...capability,
          providerName: preferredProvider,
        };
      }
    }

    // 自动选择最佳提供商
    const bestProvider =
      this.capabilityRegistry.getBestProvider(capabilityName);
    if (!bestProvider) {
      throw new NotFoundException(`未找到可用的 ${capabilityName} 能力`);
    }

    const capability = this.capabilityRegistry.getCapability(
      bestProvider,
      capabilityName,
    );
    if (!capability) {
      throw new NotFoundException(`未找到可用的 ${capabilityName} 能力`);
    }

    // 添加提供商名称到能力对象
    return {
      ...capability,
      providerName: bestProvider,
    };
  }
}
