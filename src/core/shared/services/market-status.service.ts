/**
 * 市场状态检测服务
 * 🕐 支持多市场、夏令时、实时状态检测
 */

import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger } from "@common/logging/index";
import { SYSTEM_STATUS_EVENTS } from "../../../monitoring/contracts/events/system-status.events";
// Import from the new Market Domain layer
import {
  Market,
  MarketStatus,
  MarketTradingHours,
  MARKET_TRADING_HOURS,
  CACHE_TTL_BY_MARKET_STATUS,
  type TradingSession,
} from "../constants/market.constants";

/**
 * 市场状态检测结果
 */
export interface MarketStatusResult {
  market: Market;
  status: MarketStatus;
  currentTime: Date;
  marketTime: Date;
  timezone: string;

  // 交易时段信息
  currentSession?: TradingSession;
  nextSession?: TradingSession;
  nextSessionStart?: Date;

  // 缓存TTL建议
  realtimeCacheTTL: number;
  analyticalCacheTTL: number;

  // 额外信息
  isHoliday: boolean;
  isDST: boolean;
  confidence: number; // 检测置信度
}

/**
 * Provider市场状态响应
 */
interface ProviderMarketStatus {
  market: string;
  status: "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" | "HOLIDAY";
  tradingDate: string;
  nextTradingDate?: string;
  holidays?: string[];
}

@Injectable()
export class MarketStatusService implements OnModuleDestroy {
  private readonly logger = createLogger(MarketStatusService.name);

  constructor(
    private readonly eventBus: EventEmitter2, // ✅ 事件驱动监控
  ) {}

  // 🔧 Phase 1.3.1: 静态时区格式化器缓存（解决415-424行性能问题）
  private static readonly formatters = new Map<string, Intl.DateTimeFormat>();

  // 市场状态缓存（避免频繁计算）
  private readonly statusCache = new Map<
    Market,
    {
      result: MarketStatusResult;
      expiry: number;
    }
  >();

  // 缓存有效期：交易时间1分钟，非交易时间10分钟
  private readonly CACHE_DURATION = {
    TRADING: 60 * 1000, // 1分钟
    NON_TRADING: 10 * 60 * 1000, // 10分钟
  };

  /**
   * 获取市场当前状态
   * 🎯 优先级：Provider实时数据 > 本地时间计算 > 缓存降级
   */
  async getMarketStatus(market: Market): Promise<MarketStatusResult> {
    const startTime = Date.now();
    let cacheHit = false;

    try {
      // 1. 检查缓存
      const cached = this.getCachedStatus(market);
      if (cached) {
        cacheHit = true;

        // ✅ 事件化缓存命中监控
        this.emitCacheEvent("get", true, Date.now() - startTime, {
          market,
          operation: "get_market_status",
          source: "memory_cache",
        });

        return cached;
      }

      // 2. 尝试从Provider获取实时状态
      const providerStatus = await this.getProviderMarketStatus(market);

      // 3. 本地时间计算作为备用
      const localStatus = this.calculateLocalMarketStatus(market);

      // 4. 合并Provider和本地计算结果
      const finalStatus = this.mergeMarketStatus(localStatus, providerStatus);

      // 5. 缓存结果
      this.cacheStatus(market, finalStatus);

      // ✅ 事件化缓存未命中监控
      this.emitCacheEvent("get", false, Date.now() - startTime, {
        market,
        operation: "get_market_status",
        calculation_required: true,
      });

      return finalStatus;
    } catch (error) {
      // ✅ 事件化错误监控
      this.emitRequestEvent("get_market_status", 500, Date.now() - startTime, {
        market,
        cache_hit: cacheHit,
        error: error.message,
      });

      this.logger.error("获取市场状态失败", { market, error: error.message });

      // 降级到本地计算
      return this.calculateLocalMarketStatus(market);
    }
  }

  /**
   * 批量获取多个市场状态
   */
  async getBatchMarketStatus(
    markets: Market[],
  ): Promise<Record<Market, MarketStatusResult>> {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      const results = await Promise.allSettled(
        markets.map((market) => this.getMarketStatus(market)),
      );

      const statusMap: Record<Market, MarketStatusResult> = {} as any;

      // 统计结果
      results.forEach((result, index) => {
        const market = markets[index];
        if (result.status === "fulfilled") {
          statusMap[market] = result.value;
          successCount++;
        } else {
          this.logger.error("批量获取市场状态失败", {
            market,
            error: result.reason,
          });
          // 降级处理
          statusMap[market] = this.calculateLocalMarketStatus(market);
          errorCount++;
        }
      });

      // ✅ 事件化批量操作监控
      this.emitRequestEvent(
        "batch_market_status",
        errorCount > 0 ? 207 : 200, // 207=部分成功
        Date.now() - startTime,
        {
          total_markets: markets.length,
          success_count: successCount,
          error_count: errorCount,
          markets: markets.join(","),
        },
      );

      return statusMap;
    } catch (error) {
      // ✅ 事件化批量操作失败监控
      this.emitRequestEvent(
        "batch_market_status_failed",
        500,
        Date.now() - startTime,
        {
          total_markets: markets.length,
          error: error.message,
        },
      );

      throw error;
    }
  }

  /**
   * 获取建议的缓存TTL
   */
  async getRecommendedCacheTTL(
    market: Market,
    mode: "REALTIME" | "ANALYTICAL",
  ): Promise<number> {
    try {
      const statusResult = await this.getMarketStatus(market);
      return CACHE_TTL_BY_MARKET_STATUS[mode][statusResult.status];
    } catch {
      // 降级到默认值
      return mode === "REALTIME" ? 60 : 3600;
    }
  }

  /**
   * 从Provider获取实时市场状态
   * 🎯 增强依赖检查和故障容错的Provider集成
   */
  private async getProviderMarketStatus(
    market: Market,
  ): Promise<ProviderMarketStatus | null> {
    const startTime = Date.now();

    try {
      // Phase 2.6: Enhanced dependency checking
      if (!this.isProviderIntegrationAvailable()) {
        this.logger.debug("Provider集成服务未可用，跳过Provider状态查询", {
          market,
        });
        return null;
      }

      // Get timeout configuration based on market and operation type
      const timeout = this.getProviderTimeout("market-status", market);

      // Create timeout promise utility
      const timeoutPromise = this.createTimeoutPromise(timeout);

      // Attempt to get provider capability with enhanced error handling
      const providerResult = await Promise.race([
        this.executeProviderMarketStatusQuery(market),
        timeoutPromise,
      ]);

      if (providerResult) {
        // ✅ Provider success monitoring
        this.emitRequestEvent(
          "provider_market_status_success",
          200,
          Date.now() - startTime,
          {
            market,
            provider_available: true,
            has_result: true,
          },
        );

        return providerResult;
      }

      // Provider available but no result
      this.emitRequestEvent(
        "provider_market_status_no_result",
        204,
        Date.now() - startTime,
        {
          market,
          provider_available: true,
          has_result: false,
        },
      );

      return null;
    } catch (error) {
      const isTimeout = error.message?.includes("timeout");

      // ✅ Provider error monitoring with detailed categorization
      this.emitRequestEvent(
        isTimeout
          ? "provider_market_status_timeout"
          : "provider_market_status_error",
        isTimeout ? 408 : 500,
        Date.now() - startTime,
        {
          market,
          error: error.message,
          error_type: isTimeout ? "timeout" : "provider_error",
          provider_available: this.isProviderIntegrationAvailable(),
        },
      );

      this.logger.warn("Provider市场状态获取失败，优雅降级到本地计算", {
        market,
        error: error.message,
        errorType: isTimeout ? "timeout" : "provider_error",
        duration: Date.now() - startTime,
      });

      return null;
    }
  }

  /**
   * 检查Provider集成服务是否可用
   * 🎯 防止在依赖服务不可用时尝试Provider调用
   */
  private isProviderIntegrationAvailable(): boolean {
    try {
      return false; // Graceful degradation until Provider integration is ready
    } catch (error) {
      this.logger.debug("Provider集成可用性检查失败", { error: error.message });
      return false;
    }
  }

  /**
   * 获取Provider操作超时配置
   * 🎯 基于市场和操作类型的动态超时配置
   */
  private getProviderTimeout(
    operation: "market-status" | "quote" | "kline",
    market: Market,
  ): number {
    // Import timeout configuration from market constants
    const { MARKET_API_TIMEOUTS } = require("../constants/market.constants");

    switch (operation) {
      case "market-status":
        return MARKET_API_TIMEOUTS.REALTIME.MARKET_STATUS_TIMEOUT_MS || 5000;
      case "quote":
        return MARKET_API_TIMEOUTS.REALTIME.QUOTE_TIMEOUT_MS || 5000;
      case "kline":
        return MARKET_API_TIMEOUTS.HISTORICAL.KLINE_TIMEOUT_MS || 30000;
      default:
        return 5000; // Default 5s timeout
    }
  }

  /**
   * 创建超时Promise工具函数
   * 🎯 Provider查询的统一超时处理
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Provider query timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * 执行Provider市场状态查询
   * 🎯 实际的Provider API调用逻辑
   */
  private async executeProviderMarketStatusQuery(
    market: Market,
  ): Promise<ProviderMarketStatus | null> {
    try {
      return null; // Provider integration not ready
    } catch (error) {
      this.logger.debug("Provider查询执行失败", {
        market,
        error: error.message,
      });
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * 转换Provider响应格式
   * 🎯 标准化不同Provider的响应格式
   */
  private transformProviderResponse(
    providerData: any,
  ): ProviderMarketStatus | null {
    if (!providerData) return null;

    try {
      // Standardize provider response format
      return {
        market: providerData.market || providerData.symbol?.split(".")[1] || "",
        status: this.normalizeProviderStatus(
          providerData.status || providerData.marketStatus,
        ),
        tradingDate:
          providerData.tradingDate ||
          providerData.date ||
          new Date().toISOString().split("T")[0],
        nextTradingDate: providerData.nextTradingDate,
        holidays: providerData.holidays || [],
      };
    } catch (error) {
      this.logger.warn("Provider响应格式转换失败", {
        error: error.message,
        providerData: JSON.stringify(providerData),
      });
      return null;
    }
  }

  /**
   * 标准化Provider状态值
   * 🎯 处理不同Provider的状态命名差异
   */
  private normalizeProviderStatus(
    status: string,
  ): "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" | "HOLIDAY" {
    if (!status) return "CLOSED";

    const normalizedStatus = status.toUpperCase().trim();

    // Handle common provider status variations
    const statusMap: Record<
      string,
      "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" | "HOLIDAY"
    > = {
      OPEN: "OPEN",
      TRADING: "OPEN",
      MARKET_OPEN: "OPEN",
      CLOSED: "CLOSED",
      MARKET_CLOSED: "CLOSED",
      PRE_MARKET: "PRE_OPEN",
      PRE_OPEN: "PRE_OPEN",
      AFTER_HOURS: "POST_CLOSE",
      POST_CLOSE: "POST_CLOSE",
      HOLIDAY: "HOLIDAY",
    };

    return statusMap[normalizedStatus] || "CLOSED";
  }

  /**
   * 本地时间计算市场状态
   */
  private calculateLocalMarketStatus(market: Market): MarketStatusResult {
    const config = MARKET_TRADING_HOURS[market];
    const now = new Date();

    // 转换到市场时区
    const dayOfWeek = this.getDayOfWeekInTimezone(now, config.timezone);

    // 检查是否为交易日
    if (!config.tradingDays.includes(dayOfWeek)) {
      return this.createStatusResult(
        market,
        MarketStatus.WEEKEND,
        now,
        now, // marketTime is not relevant here
        config,
        { confidence: 0.95 },
      );
    }

    // 获取当前时间的HH:mm格式
    const currentTimeStr = this.formatTime(now, config.timezone);

    // 检查各个交易时段
    const sessionStatus = this.checkTradingSessions(currentTimeStr, config);

    return this.createStatusResult(
      market,
      sessionStatus.status,
      now,
      now, // marketTime is now the same as currentTime
      config,
      {
        currentSession: sessionStatus.currentSession,
        nextSession: sessionStatus.nextSession,
        nextSessionStart: sessionStatus.nextSessionStart,
        confidence: 0.9,
      },
    );
  }

  /**
   * 转换到市场时区时间
   */
  private convertToMarketTime(date: Date, config: MarketTradingHours): Date {
    try {
      // A robust way to convert timezones without external libraries.
      // 1. Get the target timezone from config.
      const timezone = config.timezone;

      // 2. Use Intl.DateTimeFormat to break the date into parts in the target timezone.
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false, // Use 24-hour format
      });

      const parts = formatter.formatToParts(date);
      const partsMap = parts.reduce(
        (acc, part) => {
          acc[part.type] = parseInt(part.value, 10);
          return acc;
        },
        {} as Record<string, number>,
      );

      // 3. Reconstruct the date using the parts.
      // Note: month is 0-indexed in JavaScript Dates.
      return new Date(
        partsMap.year,
        partsMap.month - 1,
        partsMap.day,
        partsMap.hour % 24, // Handle 24h case from Intl
        partsMap.minute,
        partsMap.second,
      );
    } catch (error) {
      this.logger.warn("时区转换失败，使用UTC时间", {
        timezone: config.timezone,
        error: error.message,
      });
      return date;
    }
  }

  /**
   * 转换到市场时区时间
   */
  private getDayOfWeekInTimezone(date: Date, timezone: string): number {
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: timezone,
    }).format(date);
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return dayMap[dayName] ?? -1;
  }

  /**
   * 检查交易时段状态
   */
  private checkTradingSessions(
    currentTime: string,
    config: MarketTradingHours,
  ) {
    const currentMinutes = this.timeToMinutes(currentTime);

    // 检查盘前交易
    if (config.preMarket) {
      const preStart = this.timeToMinutes(config.preMarket.start);
      const preEnd = this.timeToMinutes(config.preMarket.end);

      if (currentMinutes >= preStart && currentMinutes < preEnd) {
        return {
          status: MarketStatus.PRE_MARKET,
          currentSession: config.preMarket,
          nextSession: config.tradingSessions[0],
          nextSessionStart: this.addMinutesToDate(
            new Date(),
            preEnd - currentMinutes,
          ),
        };
      }
    }

    // 检查正常交易时段
    for (let i = 0; i < config.tradingSessions.length; i++) {
      const session = config.tradingSessions[i];
      const sessionStart = this.timeToMinutes(session.start);
      const sessionEnd = this.timeToMinutes(session.end);

      if (currentMinutes >= sessionStart && currentMinutes < sessionEnd) {
        return {
          status: MarketStatus.TRADING,
          currentSession: session,
          nextSession: config.tradingSessions[i + 1],
          nextSessionStart: null,
        };
      }

      // 检查午休时间（港股、A股）
      if (i === 0 && config.tradingSessions.length > 1) {
        const nextSession = config.tradingSessions[1];
        const nextStart = this.timeToMinutes(nextSession.start);

        if (currentMinutes >= sessionEnd && currentMinutes < nextStart) {
          return {
            status: MarketStatus.LUNCH_BREAK,
            currentSession: null,
            nextSession: nextSession,
            nextSessionStart: this.addMinutesToDate(
              new Date(),
              nextStart - currentMinutes,
            ),
          };
        }
      }
    }

    // 检查盘后交易
    if (config.afterHours) {
      const afterStart = this.timeToMinutes(config.afterHours.start);
      const afterEnd = this.timeToMinutes(config.afterHours.end);

      if (currentMinutes >= afterStart && currentMinutes < afterEnd) {
        return {
          status: MarketStatus.AFTER_HOURS,
          currentSession: config.afterHours,
          nextSession: null,
          nextSessionStart: null,
        };
      }
    }

    // 其他时间为休市
    return {
      status: MarketStatus.MARKET_CLOSED,
      currentSession: null,
      nextSession: config.tradingSessions[0],
      nextSessionStart: null,
    };
  }

  /**
   * 合并Provider和本地计算结果
   */
  private mergeMarketStatus(
    localStatus: MarketStatusResult,
    providerStatus: ProviderMarketStatus | null,
  ): MarketStatusResult {
    if (!providerStatus) {
      return localStatus;
    }

    // Provider状态映射
    const providerStatusMap: Record<string, MarketStatus> = {
      OPEN: MarketStatus.TRADING,
      CLOSED: MarketStatus.MARKET_CLOSED,
      PRE_OPEN: MarketStatus.PRE_MARKET,
      POST_CLOSE: MarketStatus.AFTER_HOURS,
      HOLIDAY: MarketStatus.HOLIDAY,
    };

    const mappedStatus = providerStatusMap[providerStatus.status];

    if (mappedStatus && mappedStatus !== localStatus.status) {
      // Provider数据优先，但降低置信度
      return {
        ...localStatus,
        status: mappedStatus,
        isHoliday: providerStatus.status === "HOLIDAY",
        confidence: 0.85, // Provider数据但与本地计算不一致
      };
    }

    return {
      ...localStatus,
      isHoliday: providerStatus.status === "HOLIDAY",
      confidence: 0.98, // Provider数据与本地计算一致
    };
  }

  /**
   * 工具方法：时间字符串转分钟数
   */
  private timeToMinutes(timeStr: string): number {
    if (!/^\d{2}:\d{2}$/.test(timeStr)) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * 工具方法：格式化时间为HH:mm
   * 🔧 Phase 1.3.1: 使用静态缓存避免重复创建格式化器（解决415-424行性能问题）
   */
  private formatTime(date: Date, timezone: string): string {
    let formatter = MarketStatusService.formatters.get(timezone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone,
        hour12: false,
      });
      MarketStatusService.formatters.set(timezone, formatter);
    }
    // Intl can return '24:00' for midnight, which we should handle.
    return formatter.format(date).replace("24", "00");
  }

  /**
   * 工具方法：给日期加分钟
   */
  private addMinutesToDate(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  /**
   * 创建状态结果对象
   */
  private createStatusResult(
    market: Market,
    status: MarketStatus,
    currentTime: Date,
    marketTime: Date,
    config: MarketTradingHours,
    options: Partial<MarketStatusResult> = {},
  ): MarketStatusResult {
    return {
      market,
      status,
      currentTime,
      marketTime,
      timezone: config.timezone,
      realtimeCacheTTL: CACHE_TTL_BY_MARKET_STATUS.REALTIME[status],
      analyticalCacheTTL: CACHE_TTL_BY_MARKET_STATUS.ANALYTICAL[status],
      isHoliday: status === MarketStatus.HOLIDAY,
      isDST: this.isDaylightSavingTime(marketTime, config),
      confidence: 0.9,
      ...options,
    };
  }

  /**
   * 检查是否为夏令时
   */
  private isDaylightSavingTime(
    date: Date,
    config: MarketTradingHours,
  ): boolean {
    if (!config.dstSupport) {
      return false;
    }

    // 简化实现：基于日期范围判断
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 美国夏令时：3月第二个周日到11月第一个周日
    if (config.market === Market.US) {
      return (
        (month > 3 && month < 11) ||
        (month === 3 && day >= 8) ||
        (month === 11 && day < 1)
      );
    }

    return false;
  }

  /**
   * 缓存管理
   * 🔧 Phase 1.3.2: 修复 getCachedStatus 添加过期清理（解决486-507行缓存泄漏）
   */
  private getCachedStatus(market: Market): MarketStatusResult | null {
    const cached = this.statusCache.get(market);
    if (cached && Date.now() < cached.expiry) {
      return cached.result;
    }
    // 🔧 新增：删除过期缓存项，防止内存泄漏
    if (cached) {
      this.statusCache.delete(market);
    }
    return null;
  }

  private cacheStatus(market: Market, result: MarketStatusResult): void {
    const duration =
      result.status === MarketStatus.TRADING
        ? this.CACHE_DURATION.TRADING
        : this.CACHE_DURATION.NON_TRADING;

    this.statusCache.set(market, {
      result,
      expiry: Date.now() + duration,
    });
  }

  /**
   * 🔧 Phase 1.3.3: 生命周期管理 - 定期清理过期缓存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.statusCache.entries()) {
      if (now >= cached.expiry) {
        this.statusCache.delete(key);
      }
    }
  }

  /**
   * 🔧 Phase 1.3.3: 模块销毁时清理所有资源
   */
  onModuleDestroy() {
    this.statusCache.clear();
    MarketStatusService.formatters.clear();
  }

  // ✅ 事件驱动监控方法
  private emitRequestEvent(
    operation: string,
    statusCode: number,
    duration: number,
    metadata: any,
  ) {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "market_status_service",
          metricType: "business",
          metricName: operation,
          metricValue: duration,
          tags: {
            status_code: statusCode,
            status: statusCode < 400 ? "success" : "error",
            ...metadata,
          },
        });
      } catch (error) {
        this.logger.warn("事件发送失败", { error: error.message, operation });
      }
    });
  }

  private emitCacheEvent(
    operation: string,
    hit: boolean,
    duration: number,
    metadata: any,
  ) {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "market_status_service",
          metricType: "cache",
          metricName: `cache_${operation}`,
          metricValue: duration,
          tags: {
            hit: hit.toString(),
            operation,
            ...metadata,
          },
        });
      } catch (error) {
        this.logger.warn("缓存事件发送失败", {
          error: error.message,
          operation,
        });
      }
    });
  }
}
