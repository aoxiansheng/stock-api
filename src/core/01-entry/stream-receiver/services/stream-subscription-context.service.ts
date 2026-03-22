import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { STREAM_RECEIVER_ERROR_CODES } from "../constants/stream-receiver-error-codes.constants";
import { SymbolTransformerService } from "../../../02-processing/symbol-transformer/services/symbol-transformer.service";
import { StreamClientStateManager } from "../../../03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import { StreamDataValidator } from "../validators/stream-data.validator";
import { MappingDirection } from "@core/shared/constants";
import {
  buildIdentitySymbolMappingPair,
  findNonStandardSymbolsForIdentityProvider,
  isStandardSymbolIdentityProvider,
  STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
} from "@core/shared/utils/provider-symbol-identity.util";
import type { UnsubscribeStreamOptions } from "../interfaces/subscription-context.interface";

/**
 * StreamSubscriptionContextService - 订阅上下文服务
 *
 * 职责：
 * - 符号规范化 (canonical symbol)
 * - Identity Provider 校验
 * - 符号映射 (标准 ↔ Provider)
 * - 订阅上下文兼容性断言
 */
@Injectable()
export class StreamSubscriptionContextService {
  private readonly logger = createLogger("StreamSubscriptionContext");

  constructor(
    private readonly configService: ConfigService,
    private readonly symbolTransformerService: SymbolTransformerService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly dataValidator: StreamDataValidator,
  ) {}

  // =============== 符号规范化 ===============

  toCanonicalSymbol(symbol: string): string {
    if (typeof symbol !== "string") {
      return "";
    }
    const canonicalSymbol = symbol.trim().toUpperCase();
    if (canonicalSymbol.length === 0) {
      return "";
    }
    return canonicalSymbol;
  }

  buildCanonicalSymbolKey(symbol: string, prefix = ""): string {
    const canonicalSymbol = this.toCanonicalSymbol(symbol);
    if (!canonicalSymbol) {
      return "";
    }
    return `${prefix}${canonicalSymbol}`;
  }

  buildSymbolBroadcastKey(symbol: string): string {
    const canonicalSymbol = this.toCanonicalSymbol(symbol);
    if (!canonicalSymbol) {
      return "";
    }

    if (!this.dataValidator.isValidSymbolFormat(canonicalSymbol)) {
      return "";
    }

    return canonicalSymbol;
  }

  buildSymbolRoomKey(symbol: string): string {
    return this.buildCanonicalSymbolKey(symbol, "symbol:");
  }

  buildSymbolRooms(symbols: string[]): string[] {
    const rooms = new Set<string>();
    for (const symbol of symbols || []) {
      const room = this.buildSymbolRoomKey(symbol);
      if (room) {
        rooms.add(room);
      }
    }
    return Array.from(rooms);
  }

  // =============== Identity Provider 校验 ===============

  getStandardSymbolIdentityProvidersConfig(): string {
    return this.configService.get<string>(
      STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
      "",
    );
  }

  isProviderUsingStandardSymbolIdentity(providerName: string): boolean {
    return isStandardSymbolIdentityProvider(
      providerName,
      this.getStandardSymbolIdentityProvidersConfig(),
    );
  }

  throwIdentityProviderSymbolValidationError(
    providerName: string,
    requestId: string,
    invalidSymbols: string[],
    operation = "resolveSymbolMappings",
  ): never {
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation,
      message: `Identity provider '${providerName}' requires standard symbol format`,
      context: {
        provider: providerName,
        symbol: invalidSymbols[0],
        invalidSymbols: invalidSymbols.slice(0, 5),
        expectedFormat: "*.HK/*.US/*.SH/*.SZ/*.SG",
        reason: "non_standard_symbol_in_identity_provider",
        requestId,
      },
    });
  }

  findSymbolsWithBoundaryWhitespace(rawSymbols: unknown): string[] {
    if (!Array.isArray(rawSymbols)) {
      return [];
    }

    return rawSymbols.filter(
      (symbol): symbol is string =>
        typeof symbol === "string" && symbol !== symbol.trim(),
    );
  }

  validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
    rawSymbols: unknown,
    providerName: string,
    requestId: string,
    operation: "subscribeStream" | "unsubscribeStream",
  ): void {
    if (!this.isProviderUsingStandardSymbolIdentity(providerName)) {
      return;
    }

    const invalidSymbols = this.findSymbolsWithBoundaryWhitespace(rawSymbols);
    if (invalidSymbols.length > 0) {
      this.throwIdentityProviderSymbolValidationError(
        providerName,
        requestId,
        invalidSymbols,
        operation,
      );
    }
  }

  validateIdentityProviderStandardSymbols(
    symbols: string[],
    providerName: string,
    requestId: string,
  ): void {
    const invalidSymbols = findNonStandardSymbolsForIdentityProvider(symbols);
    if (invalidSymbols.length > 0) {
      this.throwIdentityProviderSymbolValidationError(
        providerName,
        requestId,
        invalidSymbols,
      );
    }
  }

  private buildSymbolMappingFailure(
    providerName: string,
    requestId: string,
    operation: "mapSymbols" | "mapSymbolsForProvider",
    error: unknown,
  ): never {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation,
      message: `Symbol mapping failed for provider '${providerName}'`,
      context: {
        provider: providerName,
        requestId,
        errorType: STREAM_RECEIVER_ERROR_CODES.INVALID_SUBSCRIPTION_DATA,
        reason: "symbol_mapping_failed",
        originalError: errorMessage,
      },
    });
  }

  // =============== 符号映射 ===============

  async mapSymbols(
    symbols: string[],
    providerName: string,
    requestId = "symbol_mapping",
  ): Promise<string[]> {
    try {
      const transformResult =
        await this.symbolTransformerService.transformSymbols(
          providerName,
          symbols,
          MappingDirection.TO_STANDARD,
        );

      return symbols.map((symbol) => {
        const mappedSymbol = transformResult.mappingDetails[symbol];
        if (mappedSymbol) {
          return mappedSymbol;
        }

        const canonicalSymbol = this.toCanonicalSymbol(symbol);
        if (
          canonicalSymbol &&
          this.dataValidator.isValidSymbolFormat(canonicalSymbol)
        ) {
          return canonicalSymbol;
        }

        this.buildSymbolMappingFailure(
          providerName,
          requestId,
          "mapSymbols",
          new Error(`missing standard mapping for symbol '${symbol}'`),
        );
      });
    } catch (error) {
      this.logger.warn("批量符号映射失败", {
        provider: providerName,
        symbolsCount: symbols.length,
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      this.buildSymbolMappingFailure(
        providerName,
        requestId,
        "mapSymbols",
        error,
      );
    }
  }

  async resolveSymbolMappings(
    symbols: string[],
    providerName: string,
    requestId: string,
  ): Promise<{ standardSymbols: string[]; providerSymbols: string[] }> {
    if (this.isProviderUsingStandardSymbolIdentity(providerName)) {
      this.validateIdentityProviderStandardSymbols(
        symbols,
        providerName,
        requestId,
      );
      const canonicalSymbols = symbols
        .map((symbol) => this.toCanonicalSymbol(symbol))
        .filter(Boolean);
      if (canonicalSymbols.length !== symbols.length) {
        this.throwIdentityProviderSymbolValidationError(
          providerName,
          requestId,
          symbols.filter((symbol) => !this.toCanonicalSymbol(symbol)),
        );
      }
      this.logger.debug("命中 provider 级标准符号直通，跳过 Provider 符号转换", {
        provider: providerName,
        requestId,
        symbolsCount: canonicalSymbols.length,
      });
      return buildIdentitySymbolMappingPair(canonicalSymbols);
    }

    const standardSymbols = await this.mapSymbols(
      symbols,
      providerName,
      requestId,
    );
    const providerSymbols = await this.mapSymbolsForProvider(
      providerName,
      standardSymbols,
      symbols,
      requestId,
    );

    return { standardSymbols, providerSymbols };
  }

  async mapSymbolsForProvider(
    providerName: string,
    standardSymbols: string[],
    originalSymbols: string[],
    requestId: string,
  ): Promise<string[]> {
    if (!standardSymbols?.length) {
      return [];
    }

    try {
      const providerResult =
        await this.symbolTransformerService.transformSymbolsForProvider(
          providerName,
          standardSymbols,
          requestId,
        );

      const mappingTable =
        providerResult?.mappingResults?.transformedSymbols || {};

      return standardSymbols.map((symbol, index) => {
        const mappedProviderSymbol =
          mappingTable[symbol] ?? providerResult?.transformedSymbols?.[index];
        if (mappedProviderSymbol) {
          return mappedProviderSymbol;
        }

        this.buildSymbolMappingFailure(
          providerName,
          requestId,
          "mapSymbolsForProvider",
          new Error(
            `missing provider mapping for symbol '${symbol}' (original='${originalSymbols[index] ?? ""}')`,
          ),
        );
      });
    } catch (error) {
      this.logger.warn("Provider 符号映射失败", {
        provider: providerName,
        symbolsCount: standardSymbols.length,
        requestId,
        error: (error as Error).message,
      });
      this.buildSymbolMappingFailure(
        providerName,
        requestId,
        "mapSymbolsForProvider",
        error,
      );
    }
  }

  // =============== 订阅上下文 ===============

  async notifyUpstreamReleased(
    options: UnsubscribeStreamOptions | undefined,
    releasedSymbols: string[],
  ): Promise<void> {
    if (!options?.onUpstreamReleased || releasedSymbols.length === 0) {
      return;
    }

    try {
      await options.onUpstreamReleased(releasedSymbols);
    } catch (error) {
      this.logger.warn("上游释放回调失败(忽略)", {
        releasedSymbols,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  assertSubscriptionContextCompatibility(
    clientId: string,
    providerName: string,
    wsCapabilityType: string,
  ): void {
    const existingSubscription =
      this.clientStateManager.getClientSubscription(clientId);
    if (!existingSubscription || existingSubscription.symbols.size === 0) {
      return;
    }

    const normalizedProvider = String(providerName || "").trim().toLowerCase();
    const normalizedCapability = String(wsCapabilityType || "")
      .trim()
      .toLowerCase();
    const existingProvider = String(existingSubscription.providerName || "")
      .trim()
      .toLowerCase();
    const existingCapability = String(existingSubscription.wsCapabilityType || "")
      .trim()
      .toLowerCase();

    if (
      existingProvider === normalizedProvider &&
      existingCapability === normalizedCapability
    ) {
      return;
    }

    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
      message:
        "Mixed provider/capability subscriptions are not allowed on the same client connection",
      context: {
        clientId,
        providerName: normalizedProvider,
        wsCapabilityType: normalizedCapability,
        existingProvider: existingProvider || null,
        existingWsCapabilityType: existingCapability || null,
        errorType: STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
        reason: "mixed_subscription_context_for_same_client",
      },
    });
  }
}
