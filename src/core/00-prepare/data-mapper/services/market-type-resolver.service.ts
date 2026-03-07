import {
  MULTI_MARKET_QUOTE_PROVIDER_IDS,
  MULTI_MARKET_TEMPLATE_KEYWORDS,
  type RuleListType,
} from "../constants/data-mapper.constants";
import { Injectable } from "@nestjs/common";
import type { DataSourceTemplateDocument } from "../schemas/data-source-template.schema";

@Injectable()
export class MarketTypeResolverService {
  private readonly multiMarketQuoteProviders = new Set(
    MULTI_MARKET_QUOTE_PROVIDER_IDS.map((provider) =>
      provider.toLowerCase(),
    ),
  );

  resolveMarketType(
    template: DataSourceTemplateDocument,
    ruleType: RuleListType,
  ): string {
    if (!template) {
      return "*";
    }

    if (
      ruleType === "quote_fields" ||
      ruleType === "candle_fields" ||
      ruleType === "index_fields"
    ) {
      return this.resolveQuoteLikeMarketType(template);
    }

    if (ruleType === "basic_info_fields") {
      return this.resolveBasicInfoMarketType(template);
    }

    if (
      ruleType === "market_status_fields" ||
      ruleType === "trading_days_fields"
    ) {
      return this.resolveWildcardDefaultMarketType(template);
    }

    return this.resolveSampleDrivenMarketType(template);
  }

  resolveQuoteLikeMarketType(template: DataSourceTemplateDocument): string {
    const apiType = (template.apiType || "").toLowerCase();
    if (apiType === "stream") {
      return "HK/SH/SZ/US";
    }

    const provider = (template.provider || "").toLowerCase();
    if (this.multiMarketQuoteProviders.has(provider)) {
      return "HK/SH/SZ/US";
    }

    const normalizedName = (template.name || "").toUpperCase();
    if (this.hasMultiMarketTemplateKeyword(normalizedName)) {
      return "HK/SH/SZ/US";
    }

    const marketFromName = this.resolveMarketTypeFromTemplateName(normalizedName);
    if (marketFromName) {
      return marketFromName;
    }

    const marketFromSample = this.resolveMarketTypeFromSample(template);
    if (marketFromSample) {
      return marketFromSample;
    }

    return "*";
  }

  resolveMarketTypeFromTemplateName(templateName: string): string | null {
    const normalizedName = templateName.toUpperCase();
    const hasHK = normalizedName.includes("港股");
    const hasA = normalizedName.includes("A股");
    const hasUS = normalizedName.includes("美股");

    // 组合市场优先，避免单市场短路。
    if (hasHK && hasA && hasUS) {
      return "HK/SH/SZ/US";
    }
    if (hasHK && hasUS) {
      return "HK/US";
    }
    if (hasA && hasUS) {
      return "SH/SZ/US";
    }
    if (hasHK && hasA) {
      return "HK/SH/SZ";
    }
    if (hasHK) {
      return "HK";
    }
    if (hasA) {
      return "SH/SZ";
    }
    if (hasUS) {
      return "US";
    }
    return null;
  }

  private resolveBasicInfoMarketType(template: DataSourceTemplateDocument): string {
    const normalizedName = (template.name || "").toUpperCase();
    const marketFromName = this.resolveMarketTypeFromTemplateName(normalizedName);
    if (this.isExplicitSingleMarketType(marketFromName)) {
      return marketFromName;
    }

    return "*";
  }

  private resolveWildcardDefaultMarketType(
    template: DataSourceTemplateDocument,
  ): string {
    const normalizedName = (template.name || "").toUpperCase();
    const marketFromName = this.resolveMarketTypeFromTemplateName(normalizedName);
    if (this.isExplicitSingleMarketType(marketFromName)) {
      return marketFromName;
    }

    const marketFromSample = this.resolveMarketTypeFromSample(template);
    if (this.isExplicitSingleMarketType(marketFromSample)) {
      return marketFromSample;
    }

    return "*";
  }

  private isExplicitSingleMarketType(
    marketType: string | null,
  ): marketType is string {
    return (
      marketType === "HK" ||
      marketType === "US" ||
      marketType === "SH" ||
      marketType === "SZ" ||
      marketType === "SH/SZ"
    );
  }

  private hasMultiMarketTemplateKeyword(normalizedName: string): boolean {
    if (!normalizedName) {
      return false;
    }
    return MULTI_MARKET_TEMPLATE_KEYWORDS.some((keyword) =>
      normalizedName.includes(keyword),
    );
  }

  private resolveSampleDrivenMarketType(template: DataSourceTemplateDocument): string {
    return this.resolveMarketTypeFromSample(template) ?? "*";
  }

  private resolveMarketTypeFromSample(
    template: DataSourceTemplateDocument,
  ): string | null {
    const marketFromFields = this.extractMarketTypeFromSampleData(template);
    if (marketFromFields) {
      return marketFromFields;
    }

    return this.resolveMarketTypeFromSymbol(this.extractSampleSymbol(template));
  }

  private extractMarketTypeFromSampleData(
    template: DataSourceTemplateDocument,
  ): string | null {
    if (!template?.sampleData || typeof template.sampleData !== "object") {
      return null;
    }

    const sampleData = template.sampleData as Record<string, unknown>;
    const marketTokens = new Set<string>();

    this.collectMarketTokens(sampleData.market, marketTokens);
    this.collectMarketTokens(sampleData.marketType, marketTokens);
    this.collectMarketTokens(sampleData.markets, marketTokens);
    this.collectMarketTokens(sampleData.marketTypes, marketTokens);

    if (Array.isArray(sampleData.tradeSchedules)) {
      for (const schedule of sampleData.tradeSchedules) {
        if (schedule && typeof schedule === "object") {
          const scheduleRecord = schedule as Record<string, unknown>;
          this.collectMarketTokens(scheduleRecord.market, marketTokens);
          this.collectMarketTokens(scheduleRecord.marketType, marketTokens);
        }
      }
    }

    return this.composeMarketType(marketTokens);
  }

  private collectMarketTokens(value: unknown, marketTokens: Set<string>): void {
    if (typeof value === "string") {
      this.addNormalizedMarketTokens(value, marketTokens);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string") {
          this.addNormalizedMarketTokens(item, marketTokens);
        }
      }
    }
  }

  private addNormalizedMarketTokens(raw: string, marketTokens: Set<string>): void {
    const parts = raw
      .trim()
      .toUpperCase()
      .split(/[\/,|;\s]+/)
      .filter(Boolean);

    for (const part of parts) {
      for (const normalizedToken of this.normalizeMarketToken(part)) {
        marketTokens.add(normalizedToken);
      }
    }
  }

  private normalizeMarketToken(token: string): string[] {
    if (token === "*" || token === "ALL" || token.startsWith("MULTI")) {
      return ["HK", "SH", "SZ", "US"];
    }

    if (token === "US" || token === "NASDAQ" || token === "NYSE") {
      return ["US"];
    }
    if (token === "HK" || token === "HKEX") {
      return ["HK"];
    }
    if (token === "SH" || token === "SSE") {
      return ["SH"];
    }
    if (token === "SZ" || token === "SZSE") {
      return ["SZ"];
    }
    if (
      token === "CN" ||
      token === "A" ||
      token === "ASHARE" ||
      token === "A-SHARE" ||
      token === "ASHARES"
    ) {
      return ["SH", "SZ"];
    }

    return [];
  }

  private composeMarketType(marketTokens: Set<string>): string | null {
    if (marketTokens.size === 0) {
      return null;
    }

    const hasHK = marketTokens.has("HK");
    const hasSH = marketTokens.has("SH");
    const hasSZ = marketTokens.has("SZ");
    const hasUS = marketTokens.has("US");

    const segments: string[] = [];
    if (hasHK) {
      segments.push("HK");
    }
    if (hasSH && hasSZ) {
      segments.push("SH/SZ");
    } else if (hasSH) {
      segments.push("SH");
    } else if (hasSZ) {
      segments.push("SZ");
    }
    if (hasUS) {
      segments.push("US");
    }

    return segments.length > 0 ? segments.join("/") : null;
  }

  private resolveMarketTypeFromSymbol(symbol: string | null): string | null {
    if (!symbol) {
      return null;
    }

    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol.endsWith(".US")) {
      return "US";
    }
    if (upperSymbol.endsWith(".HK")) {
      return "HK";
    }
    if (upperSymbol.endsWith(".SH") || upperSymbol.endsWith(".SZ")) {
      return "SH/SZ";
    }

    return null;
  }

  private extractSampleSymbol(template: DataSourceTemplateDocument): string | null {
    if (!template?.sampleData) {
      return null;
    }

    const data = template.sampleData as Record<string, unknown>;
    if (typeof data.symbol === "string" && data.symbol.trim()) {
      return data.symbol.trim();
    }

    if (Array.isArray(data.symbols)) {
      const [firstSymbol] = data.symbols;
      if (typeof firstSymbol === "string" && firstSymbol.trim()) {
        return firstSymbol.trim();
      }
    }

    return null;
  }
}
