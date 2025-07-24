/**
 * 市场状态检测服务
 * 🕐 支持多市场、夏令时、实时状态检测
 */

import { Injectable } from "@nestjs/common";

import { createLogger } from "@common/config/logger.config";
import {
  MarketStatus,
  MarketTradingHours,
  MARKET_TRADING_HOURS,
  TradingSession,
  CACHE_TTL_BY_MARKET_STATUS,
} from "@common/constants/market-trading-hours.constants";
import { Market } from "@common/constants/market.constants";

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
export class MarketStatusService {
  private readonly logger = createLogger(MarketStatusService.name);

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
    try {
      // 1. 检查缓存
      const cached = this.getCachedStatus(market);
      if (cached) {
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

      return finalStatus;
    } catch (error) {
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
    const results = await Promise.allSettled(
      markets.map((market) => this.getMarketStatus(market)),
    );

    const statusMap: Record<Market, MarketStatusResult> = {} as any;

    results.forEach((result, index) => {
      const market = markets[index];
      if (result.status === "fulfilled") {
        statusMap[market] = result.value;
      } else {
        this.logger.error("批量获取市场状态失败", {
          market,
          error: result.reason,
        });
        // 降级处理
        statusMap[market] = this.calculateLocalMarketStatus(market);
      }
    });

    return statusMap;
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
   * 从Provider获取实时市场状态  todo 预留接口
   */
  private async getProviderMarketStatus(
    market: Market,
  ): Promise<ProviderMarketStatus | null> {
    try {
      // TODO: 集成Provider的市场状态能力
      // const capability = await this.capabilityRegistry.getCapability('get-market-status');
      // if (capability) {
      //   return await capability.execute({ market });
      // }

      // 暂时返回null，表示Provider能力未就绪
      return null;
    } catch (error) {
      this.logger.warn("Provider市场状态获取失败", {
        market,
        error: error.message,
      });
      return null;
    }
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
      status: MarketStatus.CLOSED,
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
      CLOSED: MarketStatus.CLOSED,
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
   */
  private formatTime(date: Date, timezone: string): string {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
      hour12: false,
    });
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
   */
  private getCachedStatus(market: Market): MarketStatusResult | null {
    const cached = this.statusCache.get(market);
    if (cached && Date.now() < cached.expiry) {
      return cached.result;
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
}
