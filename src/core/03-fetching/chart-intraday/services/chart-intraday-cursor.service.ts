import { HttpStatus, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";

import {
  BusinessErrorCode,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";
import { isValidYmdDate } from "@core/shared/utils/ymd-date.util";
import {
  isSupportedMarket,
  parseFlexibleTimestampToMs,
} from "@core/shared/utils/market-time.util";

export interface IntradayCursorPayload {
  v: number;
  symbol: string;
  market: string;
  tradingDay: string;
  provider?: string;
  lastPointTimestamp: string;
  issuedAt: string;
}

interface SignedIntradayCursorPayload extends IntradayCursorPayload {
  sig: string;
}

export interface ResolvedIntradayCursorContext {
  symbol: string;
  market: string;
  tradingDay: string;
  provider: string;
}

@Injectable()
export class ChartIntradayCursorService {
  private readonly cursorSigningSecret = this.resolveCursorSigningSecret();

  private static readonly MAX_CURSOR_LENGTH = 4096;
  private static readonly MAX_CURSOR_AGE_MS = 2 * 60 * 60 * 1000;
  private static readonly MAX_CURSOR_FUTURE_SKEW_MS = 5 * 60 * 1000;

  encodeCursor(payload: IntradayCursorPayload): string {
    const signedPayload: SignedIntradayCursorPayload = {
      ...payload,
      sig: this.signCursorPayload(payload),
    };

    return Buffer.from(JSON.stringify(signedPayload), "utf-8").toString("base64");
  }

  decodeCursor(cursor: string): IntradayCursorPayload {
    try {
      const normalizedCursor = String(cursor || "").trim();
      if (
        !normalizedCursor ||
        normalizedCursor.length > ChartIntradayCursorService.MAX_CURSOR_LENGTH
      ) {
        throw new Error("invalid cursor payload");
      }

      const raw = Buffer.from(normalizedCursor, "base64").toString("utf-8");
      const parsed = JSON.parse(raw) as Partial<SignedIntradayCursorPayload>;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("invalid cursor payload");
      }

      if (
        parsed.v !== 1 ||
        typeof parsed.symbol !== "string" ||
        typeof parsed.market !== "string" ||
        typeof parsed.tradingDay !== "string" ||
        typeof parsed.lastPointTimestamp !== "string" ||
        typeof parsed.issuedAt !== "string" ||
        typeof parsed.sig !== "string"
      ) {
        throw new Error("invalid cursor payload");
      }

      const providerValue = parsed.provider;
      if (providerValue !== undefined && typeof providerValue !== "string") {
        throw new Error("invalid cursor payload");
      }

      const normalizedProvider =
        typeof providerValue === "string" ? providerValue.trim().toLowerCase() : undefined;
      const payload: IntradayCursorPayload = {
        v: parsed.v,
        symbol: parsed.symbol.trim().toUpperCase(),
        market: parsed.market.trim().toUpperCase(),
        tradingDay: parsed.tradingDay.trim(),
        provider: normalizedProvider || undefined,
        lastPointTimestamp: parsed.lastPointTimestamp.trim(),
        issuedAt: parsed.issuedAt.trim(),
      };
      const signature = parsed.sig.trim();

      if (!this.isValidCursorPayload(payload) || !signature) {
        throw new Error("invalid cursor payload");
      }

      const expectedSignature = this.signCursorPayload(payload);
      if (!this.isSignatureMatch(signature, expectedSignature)) {
        throw new Error("cursor tampered");
      }

      return payload;
    } catch {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "decode_cursor",
        message: "INVALID_ARGUMENT: cursor 格式无效",
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
  }

  assertCursorValid(
    payload: IntradayCursorPayload,
    resolved: ResolvedIntradayCursorContext,
    now: Date,
    strictProviderConsistency: boolean,
  ): void {
    if (
      payload.symbol !== resolved.symbol ||
      payload.market !== resolved.market ||
      payload.tradingDay !== resolved.tradingDay
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标与当前请求上下文不匹配",
        statusCode: HttpStatus.CONFLICT,
        context: {
          cursorSymbol: payload.symbol,
          cursorMarket: payload.market,
          cursorTradingDay: payload.tradingDay,
          requestSymbol: resolved.symbol,
          requestMarket: resolved.market,
          requestTradingDay: resolved.tradingDay,
        },
      });
    }

    const issuedAtMs = this.parseTimestampToMs(payload.issuedAt);
    const nowMs = now.getTime();
    if (!issuedAtMs) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标时间戳非法，请重新拉取 snapshot",
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (issuedAtMs - nowMs > ChartIntradayCursorService.MAX_CURSOR_FUTURE_SKEW_MS) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标签发时间异常，请重新拉取 snapshot",
        statusCode: HttpStatus.CONFLICT,
      });
    }
    if (nowMs - issuedAtMs > ChartIntradayCursorService.MAX_CURSOR_AGE_MS) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message: "CURSOR_EXPIRED: 游标已过期，请重新拉取 snapshot",
        statusCode: HttpStatus.CONFLICT,
      });
    }

    if (
      strictProviderConsistency &&
      String(payload.provider || "").trim().toLowerCase() !== resolved.provider
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.RECEIVER,
        errorCode: BusinessErrorCode.INVALID_OPERATION,
        operation: "validate_cursor",
        message:
          "CURSOR_EXPIRED: provider 不一致，请重新拉取 snapshot 或关闭 strictProviderConsistency",
        statusCode: HttpStatus.CONFLICT,
        context: {
          cursorProvider: payload.provider || null,
          requestProvider: resolved.provider,
        },
      });
    }
  }

  private isValidCursorPayload(payload: IntradayCursorPayload): boolean {
    if (
      payload.v !== 1 ||
      !payload.symbol ||
      !payload.market ||
      !payload.tradingDay ||
      !payload.lastPointTimestamp ||
      !payload.issuedAt
    ) {
      return false;
    }

    if (!isSupportedMarket(payload.market)) {
      return false;
    }
    if (!isValidYmdDate(payload.tradingDay)) {
      return false;
    }
    if (
      !this.parseTimestampToMs(payload.lastPointTimestamp) ||
      !this.parseTimestampToMs(payload.issuedAt)
    ) {
      return false;
    }
    if (payload.provider !== undefined && !payload.provider.trim()) {
      return false;
    }

    return true;
  }

  private parseTimestampToMs(timestamp: string | number | undefined | null): number | null {
    const parsed = parseFlexibleTimestampToMs(timestamp);
    return parsed && Number.isFinite(parsed) ? parsed : null;
  }

  private resolveCursorSigningSecret(): string {
    const secret = String(process.env.CHART_INTRADAY_CURSOR_SECRET || "").trim();
    if (secret) {
      return secret;
    }
    throw new Error("CHART_INTRADAY_CURSOR_SECRET 未配置，服务启动失败");
  }

  private signCursorPayload(payload: IntradayCursorPayload): string {
    const signingRaw = [
      payload.v,
      payload.symbol,
      payload.market,
      payload.tradingDay,
      payload.provider || "",
      payload.lastPointTimestamp,
      payload.issuedAt,
    ].join("|");
    return createHmac("sha256", this.cursorSigningSecret).update(signingRaw, "utf-8").digest("hex");
  }

  private isSignatureMatch(signature: string, expected: string): boolean {
    const actualBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expected, "utf-8");
    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(actualBuffer, expectedBuffer);
  }
}
