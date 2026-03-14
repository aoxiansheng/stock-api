import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { createLogger } from "@common/logging/index";
import { SymbolValidationUtils } from "@common/utils/symbol-validation.util";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { DataFetcherService } from "../../data-fetcher/services/data-fetcher.service";
import { SupportListItemRecord } from "./support-list-diff.service";
import {
  assertSupportListTypeSupported,
  normalizeSupportListSymbol,
  resolveSupportListGatewayErrorReasonMaxLength,
  resolveSupportListMaxItems,
  resolveSupportListMaxPayloadBytes,
} from "../constants/support-list.constants";

@Injectable()
export class SupportListFetchGatewayService {
  private static readonly NON_STOCK_SYMBOL_PATTERN = /^[A-Z0-9._:-]+$/;
  private static readonly NON_STOCK_SYMBOL_MAX_LENGTH = 64;
  private readonly logger = createLogger(SupportListFetchGatewayService.name);
  private readonly supportListMaxItems = resolveSupportListMaxItems();
  private readonly supportListMaxPayloadBytes = resolveSupportListMaxPayloadBytes();
  private readonly gatewayErrorReasonMaxLength =
    resolveSupportListGatewayErrorReasonMaxLength();

  constructor(
    private readonly providerRegistryService: ProviderRegistryService,
    private readonly dataFetcherService: DataFetcherService,
  ) {}

  async fetchFullList(type: string): Promise<{
    provider: string;
    items: SupportListItemRecord[];
  }> {
    const normalizedType = assertSupportListTypeSupported(type);

    const capability = CAPABILITY_NAMES.GET_SUPPORT_LIST;
    const candidates = this.providerRegistryService.getCandidateProviders(capability);
    const rankedProviders = this.providerRegistryService.rankProvidersForCapability(
      capability,
      candidates,
    );
    if (rankedProviders.length === 0) {
      throw new ServiceUnavailableException(
        `No provider available for capability '${capability}'`,
      );
    }

    for (const provider of rankedProviders) {
      try {
        const contextResolution =
          this.providerRegistryService.resolveHistoryExecutionContext(
            provider,
            capability,
          );
        const contextService =
          contextResolution.reasonCode === "success"
            ? contextResolution.contextService || undefined
            : undefined;

        const fetchResult = await this.dataFetcherService.fetchRawData({
          provider,
          capability,
          symbols: [],
          contextService,
          requestId: uuidv4(),
          apiType: "rest",
          options: {
            type: normalizedType,
          },
        });

        if (!Array.isArray(fetchResult.data)) {
          throw new Error(
            `provider=${provider} 返回的 support-list data 不是数组`,
          );
        }
        const rows = fetchResult.data;
        this.assertRowsWithinLimit(rows, provider, normalizedType);
        const items = this.sanitizeRows(rows, normalizedType);
        this.assertItemsWithinLimit(items, provider, normalizedType);
        this.assertPayloadBytesWithinLimit(items, provider, normalizedType);
        if (rows.length > 0 && items.length === 0) {
          throw new Error(
            `provider=${provider} 返回的 support-list rows 全部无效`,
          );
        }

        this.logger.log("support-list 全量拉取完成", {
          provider,
          type: normalizedType,
          rawRows: rows.length,
          rows: items.length,
        });

        return {
          provider,
          items,
        };
      } catch (error) {
        this.logger.warn("support-list 拉取失败，尝试下一个 provider", {
          provider,
          type: normalizedType,
          reason: this.sanitizeFailureReason(error),
        });
      }
    }

    throw new ServiceUnavailableException(
      `No provider succeeded for capability '${capability}' and type '${normalizedType}'`,
    );
  }

  private sanitizeRows(rows: unknown[], type: string): SupportListItemRecord[] {
    const deduplicated = new Map<string, SupportListItemRecord>();
    for (const row of rows) {
      const item = this.toValidRow(row, type);
      if (!item) {
        continue;
      }
      const symbol = item.symbol as string;
      if (deduplicated.has(symbol)) {
        deduplicated.delete(symbol);
      }
      deduplicated.set(symbol, item);
    }
    return [...deduplicated.values()];
  }

  private toValidRow(row: unknown, type: string): SupportListItemRecord | null {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return null;
    }

    const record = row as SupportListItemRecord;
    const rawSymbol = record.symbol;
    if (typeof rawSymbol !== "string") {
      return null;
    }

    const symbol = normalizeSupportListSymbol(type, rawSymbol);
    if (!symbol) {
      return null;
    }

    if (type.startsWith("STOCK_")) {
      if (!SymbolValidationUtils.isValidSymbol(symbol)) {
        return null;
      }
    } else if (
      symbol.length > SupportListFetchGatewayService.NON_STOCK_SYMBOL_MAX_LENGTH ||
      !SupportListFetchGatewayService.NON_STOCK_SYMBOL_PATTERN.test(symbol)
    ) {
      return null;
    }

    return {
      ...record,
      symbol,
    };
  }

  private assertRowsWithinLimit(
    rows: unknown[],
    provider: string,
    type: string,
  ): void {
    if (rows.length <= this.supportListMaxItems) {
      return;
    }
    throw new Error(
      `provider=${provider} type=${type} support-list raw rows 超出上限(${rows.length}>${this.supportListMaxItems})`,
    );
  }

  private assertItemsWithinLimit(
    items: SupportListItemRecord[],
    provider: string,
    type: string,
  ): void {
    if (items.length <= this.supportListMaxItems) {
      return;
    }
    throw new Error(
      `provider=${provider} type=${type} support-list items 超出上限(${items.length}>${this.supportListMaxItems})`,
    );
  }

  private assertPayloadBytesWithinLimit(
    items: SupportListItemRecord[],
    provider: string,
    type: string,
  ): void {
    const payloadBytes = this.calculatePayloadBytes(items);
    if (payloadBytes <= this.supportListMaxPayloadBytes) {
      return;
    }
    throw new Error(
      `provider=${provider} type=${type} support-list payload 超出上限(${payloadBytes}>${this.supportListMaxPayloadBytes})`,
    );
  }

  private calculatePayloadBytes(payload: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(payload ?? null), "utf8");
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  }

  private sanitizeFailureReason(error: unknown): string {
    const rawReason = (error as Error)?.message || String(error || "unknown error");
    const normalized = rawReason
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const sensitiveKeys = "authorization|token|api[_-]?key|secret|password";
    const redactedBearerAuthorization = normalized.replace(
      /((?:"|')?authorization(?:"|')?\s*[:=]\s*(?:"|')?)Bearer\s+[^\s"',;}\]]+/gi,
      "$1Bearer [REDACTED]",
    );
    const redacted = redactedBearerAuthorization.replace(
      new RegExp(
        `((?:"|')?(?:${sensitiveKeys})(?:"|')?\\s*[:=]\\s*)(?!["']?Bearer\\s+\\[REDACTED\\]["']?)(?:"[^"]*"|'[^']*'|[^\\s,;}\\]]+)`,
        "gi",
      ),
      "$1[REDACTED]",
    );
    if (redacted.length <= this.gatewayErrorReasonMaxLength) {
      return redacted || "unknown error";
    }
    return `${redacted.slice(0, this.gatewayErrorReasonMaxLength - 3)}...`;
  }
}
