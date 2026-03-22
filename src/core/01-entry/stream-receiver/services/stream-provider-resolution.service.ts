import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { STREAM_RECEIVER_ERROR_CODES } from "../constants/stream-receiver-error-codes.constants";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import {
  normalizeProviderName,
  ProviderRegistryService,
} from "@providersv2/provider-registry.service";
import { MarketTypeContext } from "@core/shared/utils/market-type.util";

/**
 * StreamProviderResolutionService - 入口层 Provider 决策
 *
 * 职责：
 * - 根据 capability + market 选择默认 provider
 * - 校验 preferredProvider 的 capability 和 market 支持
 * - 不直接建立连接，不处理客户端订阅状态
 *
 * 从 StreamReceiverService 阶段2拆分而来
 */
@Injectable()
export class StreamProviderResolutionService {
  private readonly logger = createLogger("StreamProviderResolution");

  constructor(
    private readonly marketInferenceService: MarketInferenceService,
    private readonly providerRegistryService: ProviderRegistryService,
  ) {}

  /**
   * 统一入口：解析流请求应使用的 Provider
   */
  resolveProviderForStreamRequest(params: {
    symbols: string[];
    capability: string;
    preferredProvider?: string;
    marketContext?: MarketTypeContext;
    operation: "subscribeStream" | "handleClientReconnect";
    requestId: string;
  }): string {
    const primaryMarket =
      params.marketContext?.primaryMarket ||
      this.marketInferenceService.inferDominantMarket(params.symbols);
    if (params.preferredProvider) {
      return this.validatePreferredProviderForStream(
        params.preferredProvider,
        params.capability,
        primaryMarket,
        params.operation,
        params.requestId,
      );
    }

    return this.getDefaultProvider(
      params.symbols,
      params.capability,
      params.marketContext,
      params.operation,
      params.requestId,
    );
  }

  /**
   * 获取默认Provider：基于 ProviderRegistryService 的能力+市场选择
   */
  private getDefaultProvider(
    symbols: string[],
    capability: string,
    marketContext?: MarketTypeContext,
    operation: "subscribeStream" | "handleClientReconnect" = "subscribeStream",
    requestId?: string,
  ): string {
    const primaryMarket =
      marketContext?.primaryMarket ||
      this.marketInferenceService.inferDominantMarket(symbols);

    try {
      const selectionDiagnostics =
        this.providerRegistryService.getProviderSelectionDiagnostics(
          capability,
          primaryMarket,
        );
      const provider = selectionDiagnostics.selectedProvider;

      if (provider) {
        this.logger.debug("基于能力注册表找到最佳提供商", {
          requestId,
          operation,
          capability,
          market: primaryMarket,
          symbolsCount: symbols.length,
          candidatesBefore: selectionDiagnostics.candidatesBefore,
          configuredOrder: selectionDiagnostics.configuredOrder,
          rankedCandidates: selectionDiagnostics.rankedCandidates,
          selectedProvider: provider,
          selectionReason: selectionDiagnostics.selectionReason,
          method: "capability_registry",
        });
        return provider;
      }

      this.logger.warn("未找到支持能力的Provider", {
        requestId,
        operation,
        capability,
        market: primaryMarket,
        candidatesBefore: selectionDiagnostics.candidatesBefore,
        configuredOrder: selectionDiagnostics.configuredOrder,
        selectionReason: selectionDiagnostics.selectionReason,
      });
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation,
        message: `No provider found for capability '${capability}' and market '${primaryMarket}'`,
        context: {
          capability,
          market: primaryMarket || null,
          availableProviders: selectionDiagnostics.candidatesBefore,
          configuredOrder: selectionDiagnostics.configuredOrder,
          selectionReason: selectionDiagnostics.selectionReason,
          errorType: STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
          reason: "no_provider_for_capability_market",
        },
      });
    } catch (error) {
      this.logger.error("Provider选择失败", {
        requestId,
        operation,
        capability,
        market: primaryMarket,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 校验 preferredProvider 的 capability 和 market 支持
   */
  private validatePreferredProviderForStream(
    preferredProvider: string,
    capabilityName: string,
    market: string | undefined,
    operation: "subscribeStream" | "handleClientReconnect",
    requestId?: string,
  ): string {
    const normalizedPreferredProvider = normalizeProviderName(preferredProvider);
    const selectionDiagnostics =
      this.providerRegistryService.getProviderSelectionDiagnostics(
        capabilityName,
        market,
      );
    const provider =
      this.providerRegistryService.getProvider(normalizedPreferredProvider);
    const capability = this.providerRegistryService.getCapability(
      normalizedPreferredProvider,
      capabilityName,
    );
    if (!capability) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation,
        message: `Preferred provider '${normalizedPreferredProvider}' is unavailable for stream capability '${capabilityName}'`,
        context: {
          preferredProvider: normalizedPreferredProvider,
          capabilityName,
          market: market || "any",
          availableProviders: selectionDiagnostics.candidatesBefore,
          configuredOrder: selectionDiagnostics.configuredOrder,
          errorType: STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
          reason: "preferred_provider_capability_missing",
        },
      });
    }

    const normalizedMarket = market ? String(market).trim().toUpperCase() : null;
    const supportedMarkets = Array.isArray(capability.supportedMarkets)
      ? capability.supportedMarkets.map((supportedMarket) =>
          String(supportedMarket || "").trim().toUpperCase(),
        )
      : [];
    if (normalizedMarket && !supportedMarkets.includes(normalizedMarket)) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.DATA_NOT_FOUND,
        operation,
        message: `Preferred provider '${normalizedPreferredProvider}' is unavailable for market '${normalizedMarket}'`,
        context: {
          preferredProvider: normalizedPreferredProvider,
          capabilityName,
          market: normalizedMarket,
          supportedMarkets,
          configuredOrder: selectionDiagnostics.configuredOrder,
          errorType: STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
          reason: "preferred_provider_market_not_supported",
        },
      });
    }

    const resolvedProviderName = provider
      ? normalizeProviderName(provider.name)
      : normalizedPreferredProvider;
    this.logger.debug("使用首选流提供商", {
      requestId,
      operation,
      capability: capabilityName,
      market: normalizedMarket,
      candidatesBefore: selectionDiagnostics.candidatesBefore,
      configuredOrder: selectionDiagnostics.configuredOrder,
      selectedProvider: resolvedProviderName,
      selectionReason: "preferred",
    });
    return resolvedProviderName;
  }
}
